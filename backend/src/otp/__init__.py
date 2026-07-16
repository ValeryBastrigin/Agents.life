"""Модуль беспарольной авторизации (Email OTP) для Ixteria."""

from .router import router as otp_router

__all__ = ["otp_router"]