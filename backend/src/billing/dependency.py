"""
Billing Dependency — проверяет дневной лимит ПЕРЕД обработкой запроса.

Используется как FastAPI dependency в платных эндпоинтах.
Выбрасывает HTTP 402 (Payment Required) с описанием превышения лимита.
"""

from fastapi import Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date

from src.database import get_db
from src.models import User
from .plans import PlanManager, UserPlan


async def _check_billing_for_user(
    user: User,
    estimated_cost: int = 1,
) -> dict:
    """
    Внутренняя проверка лимита для уже загруженного пользователя.
    Выбрасывает 402, если лимит исчерпан.
    """
    # Определяем план
    plan_str = (user.plan or "FREE").strip().lower()
    try:
        plan: UserPlan = UserPlan(plan_str)
    except ValueError:
        plan = UserPlan.FREE

    credits_used_today = user.credits_used or 0

    # Проверка лимита (для UNLIMITED — всегда пропускаем)
    if plan != UserPlan.UNLIMITED:
        remaining = plan.daily_limit - credits_used_today
        if remaining <= 0:
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "plan_limit_exceeded",
                    "message": f"Дневной лимит {plan.display_name} плана исчерпан. "
                               f"Использовано: {credits_used_today}/{plan.daily_limit} кредитов.",
                    "plan_id": plan.value,
                    "plan_name": plan.display_name,
                    "daily_limit": plan.daily_limit,
                    "credits_used_today": credits_used_today,
                    "credits_remaining": 0,
                },
            )

    # Проверка, хватит ли кредитов на estimated_cost
    if plan != UserPlan.UNLIMITED:
        remaining = plan.daily_limit - credits_used_today
        if remaining < estimated_cost:
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "plan_limit_exceeded",
                    "message": f"Недостаточно кредитов. Осталось: {remaining}, требуется: {estimated_cost}.",
                    "plan_id": plan.value,
                    "plan_name": plan.display_name,
                    "daily_limit": plan.daily_limit,
                    "credits_used_today": credits_used_today,
                    "credits_remaining": remaining,
                },
            )

    return {
        "user_id": user.id,
        "plan": plan.value,
        "credits_used_today": credits_used_today,
        "daily_limit": plan.daily_limit,
        "is_unlimited": plan == UserPlan.UNLIMITED,
    }


async def check_billing_limit(
    user: User,
    estimated_cost: int = 1,
    db: AsyncSession | None = None,
) -> dict:
    """
    Проверяет дневной лимит для уже загруженного объекта User.
    Перед проверкой сбрасывает счётчик, если наступил новый день.

    Используется в эндпоинтах, где user уже загружен.

    Args:
        user: Объект User из БД (должен быть загружен).
        estimated_cost: Предполагаемая стоимость в кредитах.
        db: Сессия БД (требуется для сброса счётчика).

    Returns:
        dict с информацией о статусе биллинга.

    Raises:
        HTTPException 402: Если дневной лимит превышен.
    """
    if db is not None:
        today = date.today()
        if user.last_credit_reset is None or user.last_credit_reset < today:
            user.credits_used = 0
            user.last_credit_reset = today
            await db.commit()
            await db.refresh(user)

    return await _check_billing_for_user(user, estimated_cost)


async def get_billing_status(
    user_id: int = Query(..., description="ID пользователя"),
    estimated_cost: int = 1,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    FastAPI dependency — проверяет дневной лимит по user_id из query.

    Raises:
        HTTPException 402: Если дневной лимит превышен.
        HTTPException 404: Если пользователь не найден.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Сброс счётчика при наступлении нового дня
    today = date.today()
    if user.last_credit_reset is None or user.last_credit_reset < today:
        user.credits_used = 0
        user.last_credit_reset = today
        await db.commit()
        await db.refresh(user)

    return await _check_billing_for_user(user, estimated_cost)
