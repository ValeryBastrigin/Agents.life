"""
Billing API Router — эндпоинты для фронтенда:
- GET /api/billing/status  — статус биллинга текущего пользователя
- GET /api/billing/plans   — список тарифных планов
"""

from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from src.database import get_db
from src.models import User
from .plans import UserPlan

router = APIRouter(prefix="/api/billing", tags=["billing"])


class CreditLimitExceeded(HTTPException):
    """Исключение для превышения лимита кредитов"""
    def __init__(self, detail="Credit limit exceeded. Please upgrade your plan."):
        super().__init__(status_code=402, detail=detail)


async def check_user_credits(user_id: int, db: AsyncSession, required_credits: int = 1) -> User:
    """
    Проверяет, имеет ли пользователь достаточно кредитов для выполнения действия.
    Если кредиты превышены, выбрасывает CreditLimitExceeded (402).
    Возвращает объект пользователя.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Определяем план
    plan_str = (user.plan or "FREE").strip().lower()
    try:
        plan: UserPlan = UserPlan(plan_str)
    except ValueError:
        plan = UserPlan.FREE
    
    # Если безлимитный план - пропускаем проверку
    if plan == UserPlan.UNLIMITED:
        return user
    
    # Сброс дневного счётчика если наступил новый день
    today = date.today()
    if user.last_credit_reset is None or user.last_credit_reset < today:
        user.credits_used = 0
        user.last_credit_reset = today
        await db.commit()
        await db.refresh(user)
    
    # Проверяем дневной лимит
    daily_limit = plan.daily_limit
    credits_used_today = user.credits_used or 0
    
    if credits_used_today + required_credits > daily_limit:
        raise CreditLimitExceeded(
            f"Daily credit limit exceeded. Used: {credits_used_today}/{daily_limit}, Required: {required_credits}"
        )
    
    return user


# ---------- Все планы (статический список) ----------

PLANS_LIST = [
    {
        "plan_id": "free",
        "name": "Бесплатный",
        "credits": 200,
        "price_usd": 0,
        "is_infinite": False,
        "recommended": False,
        "features": [
            "До 200 кредитов в день",
            "Базовые AI-агенты",
            "Веб-поиск (ограниченно)",
        ],
    },
    {
        "plan_id": "pro",
        "name": "Pro",
        "credits": 1000,
        "price_usd": 10,
        "is_infinite": False,
        "recommended": True,
        "features": [
            "До 1000 кредитов в день",
            "Все AI-агенты без ограничений",
            "Веб-поиск и RAG",
            "Анализ PDF и изображений",
            "Приоритетная поддержка",
        ],
    },
    {
        "plan_id": "unlimited",
        "name": "Безлимит",
        "credits": 3000,
        "price_usd": 25,
        "is_infinite": True,
        "recommended": False,
        "features": [
            "Безлимитные кредиты",
            "Всё из Pro",
            "Персональные настройки агентов",
            "Ранний доступ к новым функциям",
        ],
    },
]


@router.get("/plans")
async def get_billing_plans():
    """Возвращает список всех тарифных планов."""
    return PLANS_LIST


@router.get("/status")
async def get_billing_status(
    user_id: int = Query(..., description="ID пользователя"),
    db: AsyncSession = Depends(get_db),
):
    """
    Возвращает статус биллинга для пользователя:
    - текущий план
    - баланс кредитов (token_balance)
    - дневной лимит
    - сколько потрачено сегодня
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Определяем план
    plan_str = (user.plan or "FREE").strip().lower()
    try:
        plan: UserPlan = UserPlan(plan_str)
    except ValueError:
        # fallback to FREE if plan string is corrupted
        plan = UserPlan.FREE

    daily_limit = plan.daily_limit
    is_infinite = plan == UserPlan.UNLIMITED

    # Сброс дневного счётчика credits_used при наступлении нового дня
    today = date.today()
    credits_used_today = user.credits_used or 0

    if user.last_credit_reset is None or user.last_credit_reset < today:
        credits_used_today = 0
        user.credits_used = 0
        user.last_credit_reset = today
        await db.commit()
        await db.refresh(user)

    return {
        "user_id": user.id,
        "plan_id": plan.value,
        "plan_name": plan.display_name,
        "is_infinite": is_infinite,
        "credits_remaining": max(user.token_balance or 0, 0),
        "credits_total": daily_limit,          # дневной лимит
        "credits_used_today": credits_used_today,
        "daily_limit": daily_limit,
    }
