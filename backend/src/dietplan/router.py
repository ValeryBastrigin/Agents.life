from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
from typing import Optional
from src.database import get_db
from src.models import DietPlan, UserDietProfile

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


# ---------- Profile endpoints ----------
class UserDietProfileData(BaseModel):
    height: Optional[int] = None
    weight: Optional[int] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    goal: Optional[str] = None
    activity_level: Optional[str] = None
    calorie_target: Optional[int] = None
    protein_target: Optional[int] = None
    fats_target: Optional[int] = None
    carbs_target: Optional[int] = None
    water_target: Optional[int] = None


class UserProfileResponse(BaseModel):
    id: Optional[int] = None
    user_id: int
    height: Optional[int] = None
    weight: Optional[int] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    goal: Optional[str] = None
    activity_level: Optional[str] = None
    calorie_target: Optional[int] = None
    protein_target: Optional[int] = None
    fats_target: Optional[int] = None
    carbs_target: Optional[int] = None
    water_target: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@router.get("/profile/{user_id}")
async def get_user_diet_profile(user_id: int, db: AsyncSession = Depends(get_db)):
    """Получить диетический профиль пользователя (рост, вес, цель и т.д.)."""
    result = await db.execute(
        select(UserDietProfile).where(UserDietProfile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        return {"profile": None}
    return {
        "profile": {
            "id": profile.id,
            "user_id": profile.user_id,
            "height": profile.height,
            "weight": profile.weight,
            "age": profile.age,
            "gender": profile.gender,
            "goal": profile.goal,
            "activity_level": profile.activity_level,
            "calorie_target": profile.calorie_target,
            "protein_target": profile.protein_target,
            "fats_target": profile.fats_target,
            "carbs_target": profile.carbs_target,
            "water_target": profile.water_target,
            "created_at": profile.created_at.isoformat() if profile.created_at else None,
            "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
        }
    }


@router.post("/profile/{user_id}")
async def save_user_diet_profile(
    user_id: int, data: UserDietProfileData, db: AsyncSession = Depends(get_db)
):
    """Сохранить или обновить диетический профиль пользователя (upsert)."""
    result = await db.execute(
        select(UserDietProfile).where(UserDietProfile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()
    
    if profile:
        # Update existing profile
        for field, value in data.model_dump().items():
            if value is not None:
                setattr(profile, field, value)
    else:
        # Create new profile
        profile = UserDietProfile(user_id=user_id, **data.model_dump())
        db.add(profile)
    
    await db.commit()
    await db.refresh(profile)
    
    return {
        "profile": {
            "id": profile.id,
            "user_id": profile.user_id,
            "height": profile.height,
            "weight": profile.weight,
            "age": profile.age,
            "gender": profile.gender,
            "goal": profile.goal,
            "activity_level": profile.activity_level,
            "calorie_target": profile.calorie_target,
            "protein_target": profile.protein_target,
            "fats_target": profile.fats_target,
            "carbs_target": profile.carbs_target,
            "water_target": profile.water_target,
            "created_at": profile.created_at.isoformat() if profile.created_at else None,
            "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
        }
    }
