"""Конфигурация модуля Email OTP (беспарольная авторизация).

Все настройки берутся из переменных окружения (.env), чтобы модуль
оставался чистым, переиспользуемым и не зависел от жёстко зашитых значений.
"""

import os
from dataclasses import dataclass, field


@dataclass
class OtpConfig:
    # --- SMTP (отправка писем) ---
    smtp_host: str = field(default_factory=lambda: os.getenv("SMTP_HOST", ""))
    smtp_port: int = field(default_factory=lambda: int(os.getenv("SMTP_PORT", "587")))
    smtp_user: str = field(default_factory=lambda: os.getenv("SMTP_USER", ""))
    smtp_pass: str = field(default_factory=lambda: os.getenv("SMTP_PASSWORD", os.getenv("SMTP_PASS", "")))
    from_email: str = field(default_factory=lambda: os.getenv("FROM_EMAIL", "Ixteria <noreply@ixteria.com>"))

    # --- Жизненный цикл кода ---
    # Время жизни кода в миллисекундах (по умолчанию 5 минут). Берётся из .env OTP_EXPIRY.
    otp_expiry_ms: int = field(default_factory=lambda: int(os.getenv("OTP_EXPIRY", "300000")))

    # --- Rate limiting (защита от спама запросов кода) ---
    # Минимальный интервал между отправками кода одному email (секунды).
    resend_cooldown_seconds: int = 60

    # --- Защита от брутфорса при вводе кода ---
    # Максимальное число неверных попыток ввода до блокировки.
    max_attempts: int = 5
    # Длительность блокировки после исчерпания попыток (минуты).
    block_minutes: int = 15

    # --- JWT ---
    jwt_secret: str = field(default_factory=lambda: os.getenv("JWT_SECRET", ""))
    jwt_algorithm: str = "HS256"
    # Время жизни выданного access-токена (часы).
    jwt_expiry_hours: int = 24

    @property
    def otp_expiry_seconds(self) -> int:
        """Возвращает время жизни кода в секундах."""
        return self.otp_expiry_ms // 1000

    def is_smtp_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_user and self.smtp_pass)

    def is_jwt_configured(self) -> bool:
        return bool(self.jwt_secret)


# Singleton-экземпляр конфигурации, используемый во всём модуле.
otp_config = OtpConfig()
