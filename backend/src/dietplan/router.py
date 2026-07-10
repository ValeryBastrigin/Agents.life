from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
from typing import Optional
from src.database import get_db
from src.models import DietPlan

router = APIRouter(prefix="/api/dietplan", tags=["dietplan"])

class DietPlanCreate(BaseModel):
    plan_data: str  # JSON string

class DietPlanResponse(BaseModel):
    id: int
    user_id: int
    plan_data: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

@router.get("/{user_id}")
async def get_diet_plan(user_id: int, db: AsyncSession = Depends(get_db)):
    """Получить сохранённый рацион пользователя."""
    result = await db.execute(select(DietPlan).where(DietPlan.user_id == user_id))
    plan = result.scalar_one_or_none()
    if not plan:
        return {"plan_data": None}
    return {
        "id": plan.id,
        "user_id": plan.user_id,
        "plan_data": plan.plan_data,
        "created_at": plan.created_at.isoformat() if plan.created_at else None,
        "updated_at": plan.updated_at.isoformat() if plan.updated_at else None,
    }

@router.put("/{user_id}")
async def save_diet_plan(user_id: int, data: DietPlanCreate, db: AsyncSession = Depends(get_db)):
    """Сохранить или обновить рацион пользователя (upsert)."""
    result = await db.execute(select(DietPlan).where(DietPlan.user_id == user_id))
    plan = result.scalar_one_or_none()
    if plan:
        plan.plan_data = data.plan_data
    else:
        plan = DietPlan(user_id=user_id, plan_data=data.plan_data)
        db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return {
        "id": plan.id,
        "user_id": plan.user_id,
        "plan_data": plan.plan_data,
        "created_at": plan.created_at.isoformat() if plan.created_at else None,
        "updated_at": plan.updated_at.isoformat() if plan.updated_at else None,
    }

@router.delete("/{user_id}")
async def delete_diet_plan(user_id: int, db: AsyncSession = Depends(get_db)):
    """Удалить рацион пользователя."""
    result = await db.execute(select(DietPlan).where(DietPlan.user_id == user_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Diet plan not found")
    await db.execute(delete(DietPlan).where(DietPlan.user_id == user_id))
    await db.commit()
    return {"message": "Diet plan deleted"}