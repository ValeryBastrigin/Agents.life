"""Эндпоинты Email OTP: POST /auth/send-code, POST /auth/verify-code."""

import asyncio
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from .config import otp_config
from .service import (
    generate_otp_code,
    send_email_sync,
    store_challenge,
    check_resend_cooldown,
    check_blocked,
    verify_code,
    get_or_create_user,
    create_jwt,
)

router = APIRouter(prefix="/auth", tags=["auth-otp"])


# ---------------------------------------------------------------------------
#  Pydantic-схемы
# ---------------------------------------------------------------------------

class SendCodeRequest(BaseModel):
    email: EmailStr


class SendCodeResponse(BaseModel):
    message: str
    cooldown_seconds: int | None = None  # если rate-limited


class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str


class VerifyCodeResponse(BaseModel):
    message: str
    access_token: str | None = None
    user_id: int | None = None
    is_new_user: bool = False


# ---------------------------------------------------------------------------
#  Валидация конфигурации (быстрый ответ, если сервер не настроен)
# ---------------------------------------------------------------------------

def _check_config():
    """Выбрасывает 500, если JWT не настроен. SMTP не обязателен (dev-режим)."""
    if not otp_config.is_jwt_configured():
        raise HTTPException(
            status_code=500,
            detail="JWT_SECRET не задан в .env",
        )


# ---------------------------------------------------------------------------
#  POST /auth/send-code
# ---------------------------------------------------------------------------

@router.post("/send-code", response_model=SendCodeResponse)
async def send_code(req: SendCodeRequest, db: AsyncSession = Depends(get_db)):
    """Отправляет 6-значный код на email (с rate limiting)."""
    _check_config()
    email = req.email.strip().lower()

    # Rate limit — не чаще раза в 60 секунд
    cooldown = await check_resend_cooldown(db, email)
    if cooldown is not None:
        return SendCodeResponse(
            message=f"Код уже отправлен. Повторите через {cooldown} сек.",
            cooldown_seconds=cooldown,
        )

    # Проверка блокировки после брутфорса
    blocked = await check_blocked(db, email)
    if blocked is not None:
        mins = blocked // 60
        secs = blocked % 60
        return SendCodeResponse(
            message=f"Слишком много попыток. Попробуйте через {mins} мин {secs} сек.",
            cooldown_seconds=blocked,
        )

    # Генерация и сохранение
    code = generate_otp_code()
    await store_challenge(db, email, code)

    # Отправка (синхронный smtplib через executor, чтобы не блокировать event loop)
    try:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, send_email_sync, email, code)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка отправки письма: {e}",
        )

    return SendCodeResponse(message="Код отправлен на email.")


# ---------------------------------------------------------------------------
#  POST /auth/verify-code
# ---------------------------------------------------------------------------

@router.post("/verify-code", response_model=VerifyCodeResponse)
async def verify_otp(req: VerifyCodeRequest, db: AsyncSession = Depends(get_db)):
    """Проверяет код, создаёт сессию и возвращает JWT-токен."""
    _check_config()
    email = req.email.strip().lower()
    code = req.code.strip()

    ok, msg = await verify_code(db, email, code)
    if not ok:
        # Маппим понятные сообщения в HTTP 400/429
        status_code = status.HTTP_400_BAD_REQUEST
        if "через" in msg and "мин" in msg:
            status_code = status.HTTP_429_TOO_MANY_REQUESTS
        raise HTTPException(status_code=status_code, detail=msg)

    # Код верен — получаем или создаём пользователя
    # Определяем, новый ли пользователь (до вызова get_or_create_user)
    from sqlalchemy import select
    from ..models import User

    result = await db.execute(select(User).where(User.email == email))
    existing = result.scalar_one_or_none()
    is_new = existing is None

    user = await get_or_create_user(db, email)
    token = create_jwt(user.id, user.email)

    return VerifyCodeResponse(
        message="Успешный вход",
        access_token=token,
        user_id=user.id,
        is_new_user=is_new,
    )