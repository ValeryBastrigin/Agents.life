"""Бизнес-логика Email OTP: генерация, хеширование, проверка, отправка, JWT."""

import hashlib
import logging
import secrets
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timedelta, timezone

import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import otp_config
from ..models import OtpChallenge, User

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
#  Хеширование кода
# ---------------------------------------------------------------------------

def hash_code(code: str) -> str:
    """SHA-256 хеш от 6-значного кода (hex-строка, 64 символа)."""
    return hashlib.sha256(code.encode()).hexdigest()


def generate_otp_code() -> str:
    """Генерирует криптостойкий 6-значный код (000000–999999)."""
    return f"{secrets.randbelow(1_000_000):06d}"


# ---------------------------------------------------------------------------
#  Rate limiting & блокировки
# ---------------------------------------------------------------------------

async def _get_challenge(
    db: AsyncSession, email: str
) -> OtpChallenge | None:
    """Возвращает последний активный (не verified) челлендж для email."""
    result = await db.execute(
        select(OtpChallenge)
        .where(OtpChallenge.email == email, OtpChallenge.verified == False)
        .order_by(OtpChallenge.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def check_resend_cooldown(db: AsyncSession, email: str) -> int | None:
    """Возвращает оставшееся количество секунд до следующей возможной отправки,
    либо None, если повторная отправка уже разрешена."""
    challenge = await _get_challenge(db, email)
    if challenge is None:
        return None
    elapsed = (datetime.now(timezone.utc) - challenge.last_sent_at).total_seconds()
    remaining = otp_config.resend_cooldown_seconds - int(elapsed)
    return remaining if remaining > 0 else None


async def check_blocked(db: AsyncSession, email: str) -> int | None:
    """Возвращает оставшееся количество секунд блокировки,
    либо None, если email не заблокирован."""
    challenge = await _get_challenge(db, email)
    if challenge is None or challenge.blocked_until is None:
        return None
    remaining = (challenge.blocked_until - datetime.now(timezone.utc)).total_seconds()
    return int(remaining) if remaining > 0 else None


async def apply_bruteforce_block(db: AsyncSession, email: str) -> None:
    """Ставит блокировку на 15 минут после 5 неверных попыток."""
    challenge = await _get_challenge(db, email)
    if challenge:
        challenge.blocked_until = datetime.now(timezone.utc) + timedelta(
            minutes=otp_config.block_minutes
        )
        await db.commit()


# ---------------------------------------------------------------------------
#  Отправка кода на email
# ---------------------------------------------------------------------------

def _build_email_body(code: str) -> tuple[str, str, str]:
    """Возвращает (subject, plain_text, html_text) для письма."""
    subject = "Код подтверждения — Ixteria"
    plain = (
        f"Ваш код для входа: {code}\n\n"
        "Код действителен 5 минут.\n"
        "Если вы не запрашивали код, просто проигнорируйте это письмо."
    )
    html = f"""\
<html><body style="font-family:sans-serif;text-align:center;padding:40px">
  <h2>Вход в Ixteria</h2>
  <p>Ваш код подтверждения:</p>
  <div style="font-size:36px;letter-spacing:8px;font-weight:bold;color:#3B82F6;margin:24px 0">
    {code}
  </div>
  <p style="color:#6B7280">Код действителен 5 минут.</p>
  <p style="color:#9CA3AF;font-size:12px">
    Если вы не запрашивали код, просто проигнорируйте это письмо.
  </p>
</body></html>"""
    return subject, plain, html


def send_email_sync(to_email: str, code: str) -> None:
    """Синхронная отправка письма с кодом (блокирующая).
    Вызывается через run_in_executor в async-контексте.
    Пробует: STARTTLS (587) → SSL (465) → лог кода в консоль."""
    subject, plain, html = _build_email_body(code)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = otp_config.from_email
    msg["To"] = to_email
    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html, "html"))

    if not otp_config.is_smtp_configured():
        logger.warning("SMTP не настроен — OTP код для %s: %s", to_email, code)
        return

    # Пробуем STARTTLS
    for host, port, use_ssl in [
        (otp_config.smtp_host, otp_config.smtp_port, False),
        (otp_config.smtp_host, 465, True),
    ]:
        try:
            if use_ssl:
                logger.info("Пробуем SMTP SSL %s:%s ...", host, port)
                with smtplib.SMTP_SSL(host, port, timeout=10) as server:
                    server.login(otp_config.smtp_user, otp_config.smtp_pass)
                    server.send_message(msg)
            else:
                logger.info("Пробуем SMTP STARTTLS %s:%s ...", host, port)
                with smtplib.SMTP(host, port, timeout=10) as server:
                    server.starttls()
                    server.login(otp_config.smtp_user, otp_config.smtp_pass)
                    server.send_message(msg)
            logger.info("OTP код отправлен на %s через %s:%s", to_email, host, port)
            return
        except smtplib.SMTPAuthenticationError:
            logger.exception(
                "SMTP AUTH ERROR на %s:%s — неверный логин/пароль", host, port
            )
            break  # auth ошибка — бесполезно пробовать другой порт
        except smtplib.SMTPException as exc:
            logger.warning(
                "SMTP ошибка на %s:%s: %s. Пробуем следующий способ...",
                host, port, exc,
            )
        except OSError as exc:
            logger.warning(
                "Сеть недоступна на %s:%s: %s. Пробуем следующий способ...",
                host, port, exc,
            )

    # Если всё упало — логируем код в консоль (dev fallback)
    logger.warning(
        "Не удалось отправить письмо через SMTP. OTP код для %s: %s",
        to_email, code,
    )


# ---------------------------------------------------------------------------
#  Сохранение / обновление челленджа в БД
# ---------------------------------------------------------------------------

async def store_challenge(db: AsyncSession, email: str, code: str) -> OtpChallenge:
    """Удаляет старые челленджи для email, создаёт новый с хешем кода."""
    # Удаляем все предыдущие
    from sqlalchemy import delete

    await db.execute(delete(OtpChallenge).where(OtpChallenge.email == email))
    expires_at = datetime.now(timezone.utc) + timedelta(
        milliseconds=otp_config.otp_expiry_ms
    )
    challenge = OtpChallenge(
        email=email,
        code_hash=hash_code(code),
        expires_at=expires_at,
        last_sent_at=datetime.now(timezone.utc),
    )
    db.add(challenge)
    await db.commit()
    await db.refresh(challenge)
    return challenge


# ---------------------------------------------------------------------------
#  Проверка кода
# ---------------------------------------------------------------------------

async def verify_code(
    db: AsyncSession, email: str, code: str
) -> tuple[bool, str]:
    """Проверяет код. Возвращает (ok, message).
    При успехе помечает челлендж как verified и возвращает ok=True.
    """
    challenge = await _get_challenge(db, email)

    if challenge is None:
        return False, "Код не найден. Запросите новый код."

    # Проверка блокировки
    if challenge.blocked_until and challenge.blocked_until > datetime.now(timezone.utc):
        remaining = (challenge.blocked_until - datetime.now(timezone.utc)).seconds
        mins = remaining // 60
        secs = remaining % 60
        return False, f"Слишком много попыток. Попробуйте через {mins} мин {secs} сек."

    # Проверка истечения
    if challenge.expires_at < datetime.now(timezone.utc):
        return False, "Код истёк. Запросите новый код."

    # Сравнение хеша
    if not secrets.compare_digest(challenge.code_hash, hash_code(code)):
        challenge.attempts += 1
        if challenge.attempts >= otp_config.max_attempts:
            challenge.blocked_until = datetime.now(timezone.utc) + timedelta(
                minutes=otp_config.block_minutes
            )
            await db.commit()
            return False, "Слишком много неверных попыток. Повторите через 15 минут."
        await db.commit()
        remaining = otp_config.max_attempts - challenge.attempts
        return False, f"Неверный код. Осталось попыток: {remaining}"

    # Успех — помечаем верифицированным
    challenge.verified = True
    await db.commit()
    return True, "OK"


# ---------------------------------------------------------------------------
#  Работа с пользователем (создание / поиск)
# ---------------------------------------------------------------------------

async def get_or_create_user(db: AsyncSession, email: str) -> User:
    """Находит пользователя по email или создаёт нового (без пароля)."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is not None:
        return user

    # Создаём нового пользователя
    username = email.split("@")[0]
    user = User(
        username=username,
        email=email,
        password_hash="",  # беспарольный вход
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


# ---------------------------------------------------------------------------
#  JWT
# ---------------------------------------------------------------------------

def create_jwt(user_id: int, email: str) -> str:
    """Создаёт JWT access-токен."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "email": email,
        "iat": now,
        "exp": now + timedelta(hours=otp_config.jwt_expiry_hours),
    }
    return jwt.encode(
        payload, otp_config.jwt_secret, algorithm=otp_config.jwt_algorithm
    )