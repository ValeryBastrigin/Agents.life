"""
User Plans — управление тарифными планами пользователей.

Определяет дневные лимиты для каждого плана и предоставляет
методы для проверки и получения информации о лимитах.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Dict


class UserPlan(Enum):
    """Тарифные планы пользователей."""

    FREE = "free"
    PRO = "pro"
    UNLIMITED = "unlimited"

    @property
    def daily_limit(self) -> int:
        """Дневной лимит кредитов для данного плана."""
        return _PLAN_LIMITS[self]

    @property
    def monthly_price_usd(self) -> float:
        """Стоимость плана в USD в месяц (0 для FREE)."""
        return _PLAN_PRICES[self]

    @property
    def display_name(self) -> str:
        """Человекочитаемое имя плана."""
        return _PLAN_DISPLAY_NAMES[self]


# Внутренние справочники
_PLAN_LIMITS: Dict[UserPlan, int] = {
    UserPlan.FREE: 200,
    UserPlan.PRO: 1000,
    UserPlan.UNLIMITED: 3000,
}

_PLAN_PRICES: Dict[UserPlan, float] = {
    UserPlan.FREE: 0.0,
    UserPlan.PRO: 10.0,
    UserPlan.UNLIMITED: 25.0,
}

_PLAN_DISPLAY_NAMES: Dict[UserPlan, str] = {
    UserPlan.FREE: "Free",
    UserPlan.PRO: "Pro",
    UserPlan.UNLIMITED: "Unlimited",
}


class PlanExceededError(Exception):
    """Исключение при превышении дневного лимита кредитов."""

    def __init__(
        self,
        plan: UserPlan,
        daily_limit: int,
        attempted_credits: int,
    ) -> None:
        self.plan = plan
        self.daily_limit = daily_limit
        self.attempted_credits = attempted_credits
        super().__init__(
            f"Plan '{plan.display_name}' daily limit exceeded: "
            f"{attempted_credits} credits attempted, "
            f"but daily limit is {daily_limit} credits."
        )


class PlanManager:
    """
    Менеджер тарифных планов.

    Предоставляет методы для определения лимитов, проверки
    доступности кредитов и получения информации о плане.
    """

    @staticmethod
    def get_daily_limit(plan: UserPlan) -> int:
        """
        Возвращает дневной лимит кредитов для указанного плана.

        Args:
            plan: Тарифный план пользователя.

        Returns:
            Количество кредитов, доступное в день.
        """
        return plan.daily_limit

    @staticmethod
    def can_use_credits(
        plan: UserPlan,
        credits_used_today: int,
        requested_credits: int,
    ) -> bool:
        """
        Проверяет, может ли пользователь использовать запрошенное количество кредитов.

        Args:
            plan: Тарифный план пользователя.
            credits_used_today: Количество кредитов, уже использованных сегодня.
            requested_credits: Количество запрашиваемых кредитов.

        Returns:
            True, если кредиты доступны; иначе False.
        """
        daily_limit = plan.daily_limit
        return (credits_used_today + requested_credits) <= daily_limit

    @staticmethod
    def check_credits_or_raise(
        plan: UserPlan,
        credits_used_today: int,
        requested_credits: int,
    ) -> None:
        """
        Проверяет доступность кредитов и выбрасывает исключение при превышении лимита.

        Args:
            plan: Тарифный план пользователя.
            credits_used_today: Количество кредитов, уже использованных сегодня.
            requested_credits: Количество запрашиваемых кредитов.

        Raises:
            PlanExceededError: Если дневной лимит будет превышен.
        """
        if not PlanManager.can_use_credits(plan, credits_used_today, requested_credits):
            raise PlanExceededError(
                plan=plan,
                daily_limit=plan.daily_limit,
                attempted_credits=credits_used_today + requested_credits,
            )

    @staticmethod
    def get_remaining_credits(
        plan: UserPlan,
        credits_used_today: int,
    ) -> int:
        """
        Возвращает количество оставшихся кредитов на сегодня.

        Args:
            plan: Тарифный план пользователя.
            credits_used_today: Количество кредитов, уже использованных сегодня.

        Returns:
            Количество кредитов, доступных до конца дня (минимум 0).
        """
        remaining = plan.daily_limit - credits_used_today
        return max(remaining, 0)

    @staticmethod
    def from_string(plan_str: str) -> UserPlan:
        """
        Парсит строковое представление плана в UserPlan.

        Args:
            plan_str: Строка ('free', 'pro', 'unlimited' — регистронезависимо).

        Returns:
            Соответствующий элемент UserPlan.

        Raises:
            ValueError: Если строка не соответствует ни одному плану.
        """
        normalized = plan_str.strip().lower()
        for plan in UserPlan:
            if plan.value == normalized:
                return plan
        raise ValueError(
            f"Unknown plan: '{plan_str}'. "
            f"Available plans: {', '.join(p.value for p in UserPlan)}"
        )