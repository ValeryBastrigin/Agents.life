"""Telegram Login Widget verification service.

Проверка подписи данных от Telegram Login Widget через HMAC-SHA256.

Формула:
1. Отсортировать все поля (кроме hash) по алфавиту
2. Склеить в строку key=value\\nkey=value
3. secret_key = SHA256(bot_token)
4. Вычислить HMAC-SHA256(data_string, secret_key)
5. Сравнить полученный хеш с полем hash из Telegram
"""

import hashlib
import hmac
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class TelegramAuthData:
    """Данные, полученные от Telegram Login Widget после успешной авторизации."""
    id: int
    first_name: str
    username: str = ""
    photo_url: str = ""
    auth_date: int = 0
    hash: str = ""

    @property
    def auth_datetime(self) -> datetime:
        """Конвертирует UNIX timestamp auth_date в datetime."""
        return datetime.fromtimestamp(self.auth_date, tz=timezone.utc)

    def is_expired(self, max_age_seconds: int = 300) -> bool:
        """Проверяет, не устарели ли данные (по умолчанию 5 минут)."""
        now = datetime.now(timezone.utc)
        age = (now - self.auth_datetime).total_seconds()
        return age > max_age_seconds


def parse_telegram_data(query_string: str) -> Optional[TelegramAuthData]:
    """Парсит query string от Telegram Login Widget в TelegramAuthData.

    Ожидаемый формат:
        id=12345&first_name=John&username=john_doe&photo_url=https://...&auth_date=1700000000&hash=abc123...

    Возвращает None, если обязательные поля отсутствуют.
    """
    import urllib.parse

    params = urllib.parse.parse_qs(query_string)

    def get_first(key: str) -> str:
        vals = params.get(key, [])
        return vals[0] if vals else ""

    try:
        data = TelegramAuthData(
            id=int(get_first("id")),
            first_name=get_first("first_name"),
            username=get_first("username"),
            photo_url=get_first("photo_url"),
            auth_date=int(get_first("auth_date")),
            hash=get_first("hash"),
        )
        if not data.hash:
            logger.warning("Telegram data: hash field is missing")
            return None
        if not data.id:
            logger.warning("Telegram data: id field is missing")
            return None
        return data
    except (ValueError, TypeError) as e:
        logger.error("Failed to parse Telegram data: %s", e)
        return None


def verify_telegram_signature(data: TelegramAuthData, bot_token: str) -> bool:
    """Проверяет подпись данных от Telegram Login Widget.

    Шаги:
    1. Собрать все поля, кроме hash
    2. Отсортировать по алфавиту
    3. Склеить в строку key=value\\nkey=value
    4. Вычислить SHA256(bot_token) → secret_key
    5. Вычислить HMAC-SHA256(data_string, secret_key)
    6. Сравнить с data.hash (constant-time сравнение)

    Args:
        data: Данные от Telegram.
        bot_token: Токен бота (из .env).

    Returns:
        True если подпись валидна, False если нет.
    """
    # 1. Собираем поля в алфавитном порядке (исключая hash)
    fields = {
        "auth_date": str(data.auth_date),
        "first_name": data.first_name,
        "id": str(data.id),
        "photo_url": data.photo_url,
        "username": data.username,
    }

    # 2. Сортируем по ключу (алфавит)
    sorted_keys = sorted(fields.keys())

    # 3. Склеиваем в строку key=value\\nkey=value
    data_string = "\n".join(f"{k}={fields[k]}" for k in sorted_keys)

    # 4. Вычисляем secret_key = SHA256(bot_token)
    secret_key = hashlib.sha256(bot_token.encode()).digest()

    # 5. Вычисляем HMAC-SHA256
    computed_hash = hmac.new(
        secret_key, data_string.encode(), hashlib.sha256
    ).hexdigest()

    # 6. Constant-time сравнение
    is_valid = hmac.compare_digest(computed_hash, data.hash)

    if not is_valid:
        logger.warning(
            "Telegram signature mismatch for user %s (id=%s). "
            "Computed: %s, Received: %s",
            data.username, data.id, computed_hash[:16], data.hash[:16],
        )

    return is_valid