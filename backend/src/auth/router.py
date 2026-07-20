"""OAuth 2.0 API routes: Google, Yandex + Telegram Login Widget.

- GET  /auth/google          → redirects user to Google consent screen
- GET  /auth/callback        → callback endpoint for Google to send the auth code
- GET  /auth/yandex          → redirects user to Yandex OAuth consent screen
- GET  /auth/yandex/callback → callback endpoint for Yandex to send the auth code
- POST /auth/telegram        → verify Telegram Login Widget data
"""

import json
import os

from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from .config import google_oauth_config, yandex_oauth_config, telegram_auth_config
from .service import (
    build_authorization_url,
    exchange_code_for_token,
    fetch_user_profile,
    format_user_profile,
    build_yandex_authorization_url,
    yandex_exchange_code_for_token,
    yandex_fetch_user_profile,
    format_yandex_user_profile,
)
from .telegram_service import (
    parse_telegram_data,
    verify_telegram_signature,
    TelegramAuthData,
)
from src.database import get_db, async_session
from src.models import User, UserIdentity
from src.otp.service import create_jwt

router = APIRouter(tags=["auth"])

# URL of the frontend app (redirect target after login)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


# ── Pydantic schema for Telegram auth request ──

class TelegramAuthRequest(BaseModel):
    """Данные от Telegram Login Widget (query string или JSON-объект)."""
    id: int
    first_name: str
    username: str = ""
    photo_url: str = ""
    auth_date: int
    hash: str


@router.get("/auth/google")
async def auth_google():
    """
    Redirect the user to Google's OAuth 2.0 consent screen.
    """
    if not google_oauth_config.is_configured():
        raise HTTPException(
            status_code=500,
            detail="Google OAuth is not configured properly.",
        )

    authorization_url = build_authorization_url()
    return RedirectResponse(url=authorization_url, status_code=302)


@router.get("/auth/callback")
async def auth_callback(code: str = Query(..., description="Authorization code from Google")):
    """
    Callback endpoint that Google redirects to after user consent.
    Exchanges the code for an access token, fetches the user profile,
    creates or retrieves the user in the database, and redirects back
    to the frontend with user data as query params.

    This path MUST match GOOGLE_CALLBACK_URL in .env
    (currently http://localhost:8001/auth/callback).
    """
    # 1. Exchange code for access token
    token_data = await exchange_code_for_token(code)
    access_token = token_data.get("access_token")

    if not access_token:
        # Redirect back to frontend with error
        return RedirectResponse(
            url=f"{FRONTEND_URL}/login?error=no_token",
            status_code=302,
        )

    # 2. Fetch user profile with the access token
    raw_profile = await fetch_user_profile(access_token)
    profile = format_user_profile(raw_profile)

    # 3. Log the user data to the console
    print("=== Google OAuth Login ===")
    print(f"Email: {profile['email']}")
    print(f"Name:  {profile['name']}")
    print(f"Google ID: {profile['google_id']}")
    print(f"Picture: {profile['picture']}")
    print("==========================")

    # 4. Create or retrieve user in database
    async with async_session() as session:
        # Try to find user by google_id first
        result = await session.execute(
            select(User).where(User.google_id == profile['google_id'])
        )
        user = result.scalar_one_or_none()

        if not user:
            # Try to find user by email (in case they already exist but without google_id)
            result = await session.execute(
                select(User).where(User.email == profile['email'])
            )
            user = result.scalar_one_or_none()

            if user:
                # Update existing user with google_id
                user.google_id = profile['google_id']
                user.avatar_url = profile['picture']
                await session.commit()
            else:
                # Create new user
                user = User(
                    username=profile['email'].split('@')[0],  # Use email prefix as username
                    email=profile['email'],
                    password_hash="oauth_user",  # Placeholder for OAuth users
                    google_id=profile['google_id'],
                    avatar_url=profile['picture'],
                    token_balance=1000,
                    plan="FREE",
                    theme_preference="light"
                )
                session.add(user)
                await session.commit()
                await session.refresh(user)

    # 5. Redirect back to frontend with user data as query params
    query_params = (
        f"success=true"
        f"&email={profile['email']}"
        f"&name={profile['name']}"
        f"&google_id={profile['google_id']}"
        f"&picture={profile['picture']}"
        f"&user_id={user.id}"
    )
    return RedirectResponse(
        url=f"{FRONTEND_URL}/login?{query_params}",
        status_code=302,
    )


# ---------------------------------------------------------------------------
#  Telegram Login Widget
# ---------------------------------------------------------------------------

async def _find_or_create_user_by_telegram(
    db: AsyncSession,
    telegram_id: int,
    first_name: str,
    username: str,
    photo_url: str,
) -> User:
    """Находит пользователя по telegram_id через user_identities,
    или создаёт нового пользователя.

    Если пользователь с таким telegram_id уже есть — возвращаем его.
    Если нет — создаём нового пользователя с username из Telegram.
    """
    # 1. Ищем identity по provider='telegram' и provider_id=telegram_id
    result = await db.execute(
        select(UserIdentity).where(
            UserIdentity.provider == "telegram",
            UserIdentity.provider_id == str(telegram_id),
        )
    )
    identity = result.scalar_one_or_none()

    if identity:
        # Пользователь уже существует — возвращаем его
        result = await db.execute(select(User).where(User.id == identity.user_id))
        user = result.scalar_one_or_none()
        if user:
            # Обновляем provider_data (имя, аватар могут измениться)
            identity.provider_data = json.dumps({
                "first_name": first_name,
                "username": username,
                "photo_url": photo_url,
            })
            await db.commit()
            return user

    # 2. Создаём нового пользователя
    safe_username = username or f"tg_{telegram_id}"
    # Убеждаемся, что username уникален
    result = await db.execute(
        select(User).where(User.username == safe_username)
    )
    existing = result.scalar_one_or_none()
    if existing:
        safe_username = f"tg_{telegram_id}_{os.urandom(3).hex()}"

    user = User(
        username=safe_username,
        email=f"tg_{telegram_id}@telegram.ixteria",  # виртуальный email
        password_hash="",  # беспарольный вход
        avatar_url=photo_url or "",
        token_balance=1000,
        plan="FREE",
        theme_preference="light",
    )
    db.add(user)
    await db.flush()  # Получаем ID пользователя

    # 3. Создаём identity-запись
    identity = UserIdentity(
        user_id=user.id,
        provider="telegram",
        provider_id=str(telegram_id),
        provider_data=json.dumps({
            "first_name": first_name,
            "username": username,
            "photo_url": photo_url,
        }),
    )
    db.add(identity)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/auth/telegram")
async def auth_telegram(
    req: TelegramAuthRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Проверяет данные от Telegram Login Widget и авторизует пользователя.

    Тело запроса (JSON):
    {
        "id": 12345,
        "first_name": "John",
        "username": "john_doe",
        "photo_url": "https://...",
        "auth_date": 1700000000,
        "hash": "abc123..."
    }

    Возвращает JWT-токен и данные пользователя.
    """
    # 1. Проверяем конфигурацию
    if not telegram_auth_config.is_configured():
        raise HTTPException(
            status_code=500,
            detail="Telegram auth is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_BOT_USERNAME in .env",
        )

    # 2. Собираем данные для проверки
    telegram_data = TelegramAuthData(
        id=req.id,
        first_name=req.first_name,
        username=req.username,
        photo_url=req.photo_url,
        auth_date=req.auth_date,
        hash=req.hash,
    )

    # 3. Проверяем, что данные не устарели (макс 5 минут)
    if telegram_data.is_expired():
        raise HTTPException(
            status_code=400,
            detail="Telegram auth data has expired. Please try again.",
        )

    # 4. Проверяем подпись HMAC-SHA256
    if not verify_telegram_signature(telegram_data, telegram_auth_config.bot_token):
        raise HTTPException(
            status_code=400,
            detail="Invalid Telegram auth signature. Data may have been tampered with.",
        )

    # 5. Находим или создаём пользователя
    user = await _find_or_create_user_by_telegram(
        db,
        telegram_id=req.id,
        first_name=req.first_name,
        username=req.username,
        photo_url=req.photo_url,
    )

    # 6. Создаём JWT-токен
    token = create_jwt(user.id, user.email)

    return {
        "success": True,
        "access_token": token,
        "user_id": user.id,
        "username": user.username,
        "avatar_url": user.avatar_url,
        "first_name": req.first_name,
    }


# ---------------------------------------------------------------------------
#  Yandex OAuth
# ---------------------------------------------------------------------------

async def _find_or_create_user_by_yandex(
    db: AsyncSession,
    yandex_id: str,
    email: str,
    name: str,
    picture: str,
) -> User:
    """Находит пользователя по yandex_id через user_identities,
    или по email, или создаёт нового пользователя.

    Если пользователь с таким yandex_id уже есть — возвращаем его.
    Если identity не найден, но пользователь с таким email уже существует
    (например, зарегистрирован через Google или OTP) — привязываем
    yandex identity к существующему пользователю.
    Если нет — создаём нового пользователя.
    """
    # 1. Ищем identity по provider='yandex' и provider_id=yandex_id
    result = await db.execute(
        select(UserIdentity).where(
            UserIdentity.provider == "yandex",
            UserIdentity.provider_id == str(yandex_id),
        )
    )
    identity = result.scalar_one_or_none()

    if identity:
        # Пользователь уже существует — возвращаем его
        result = await db.execute(select(User).where(User.id == identity.user_id))
        user = result.scalar_one_or_none()
        if user:
            # Обновляем provider_data (имя, аватар могут измениться)
            identity.provider_data = json.dumps({
                "name": name,
                "email": email,
                "picture": picture,
            })
            await db.commit()
            return user

    # 2. Если identity не найден — ищем пользователя по email
    if email:
        result = await db.execute(
            select(User).where(User.email == email)
        )
        existing_user = result.scalar_one_or_none()
        if existing_user:
            # Привязываем yandex identity к существующему пользователю
            identity = UserIdentity(
                user_id=existing_user.id,
                provider="yandex",
                provider_id=str(yandex_id),
                provider_data=json.dumps({
                    "name": name,
                    "email": email,
                    "picture": picture,
                }),
            )
            db.add(identity)
            await db.commit()
            await db.refresh(existing_user)
            return existing_user

    # 3. Создаём нового пользователя
    # Генерируем username из email или yandex_id
    safe_username = email.split("@")[0] if email else f"ya_{yandex_id}"
    # Убеждаемся, что username уникален
    result = await db.execute(
        select(User).where(User.username == safe_username)
    )
    existing = result.scalar_one_or_none()
    if existing:
        safe_username = f"ya_{yandex_id}_{os.urandom(3).hex()}"

    user = User(
        username=safe_username,
        email=email or f"ya_{yandex_id}@yandex.ixteria",
        password_hash="",  # беспарольный вход
        avatar_url=picture or "",
        token_balance=1000,
        plan="FREE",
        theme_preference="light",
    )
    db.add(user)
    await db.flush()  # Получаем ID пользователя

    # 4. Создаём identity-запись
    identity = UserIdentity(
        user_id=user.id,
        provider="yandex",
        provider_id=str(yandex_id),
        provider_data=json.dumps({
            "name": name,
            "email": email,
            "picture": picture,
        }),
    )
    db.add(identity)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/auth/yandex")
async def auth_yandex():
    """
    Redirect the user to Yandex's OAuth 2.0 consent screen.
    """
    if not yandex_oauth_config.is_configured():
        raise HTTPException(
            status_code=500,
            detail="Yandex OAuth is not configured properly.",
        )

    authorization_url = build_yandex_authorization_url()
    return RedirectResponse(url=authorization_url, status_code=302)


@router.get("/auth/yandex/callback")
async def auth_yandex_callback(code: str = Query(..., description="Authorization code from Yandex")):
    """
    Callback endpoint that Yandex redirects to after user consent.
    Exchanges the code for an access token, fetches the user profile,
    creates or retrieves the user in the database, and redirects back
    to the frontend with user data as query params.

    This path MUST match YANDEX_CALLBACK_URL in .env
    (currently http://localhost:8001/api/auth/yandex/callback).
    """
    # 1. Exchange code for access token
    token_data = await yandex_exchange_code_for_token(code)
    access_token = token_data.get("access_token")

    if not access_token:
        # Redirect back to frontend with error
        return RedirectResponse(
            url=f"{FRONTEND_URL}/login?error=no_token",
            status_code=302,
        )

    # 2. Fetch user profile with the access token
    raw_profile = await yandex_fetch_user_profile(access_token)
    profile = format_yandex_user_profile(raw_profile)

    # 3. Log the user data to the console
    print("=== Yandex OAuth Login ===")
    print(f"Email: {profile['email']}")
    print(f"Name:  {profile['name']}")
    print(f"Yandex ID: {profile['yandex_id']}")
    print(f"Picture: {profile['picture']}")
    print("===========================")

    # 4. Create or retrieve user in database
    async with async_session() as session:
        user = await _find_or_create_user_by_yandex(
            session,
            yandex_id=profile['yandex_id'],
            email=profile['email'],
            name=profile['name'],
            picture=profile['picture'],
        )

    # 5. Create JWT token and redirect with session info
    token = create_jwt(user.id, user.email)

    query_params = (
        f"success=true"
        f"&email={profile['email']}"
        f"&name={profile['name']}"
        f"&yandex_id={profile['yandex_id']}"
        f"&picture={profile['picture']}"
        f"&user_id={user.id}"
        f"&access_token={token}"
    )
    return RedirectResponse(
        url=f"{FRONTEND_URL}/login?{query_params}",
        status_code=302,
    )
