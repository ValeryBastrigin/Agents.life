import json
import logging
from fastapi import APIRouter, Depends, HTTPException

logger = logging.getLogger(__name__)
from pydantic import BaseModel, Field
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from src.database import get_db
from src.agents.mentor_agent import (
    analyze_dream, add_active_goal, get_active_goals, update_goal_status,
    analyze_dream_steps, save_dream_goal, select_dream_steps
)

router = APIRouter(prefix="/api/mentor", tags=["mentor"])

class DreamRequest(BaseModel):
    dream: str = Field(..., min_length=1, max_length=2000)
    user_id: int = Field(default=1)

class DreamResponse(BaseModel):
    success: bool
    feasibility_rating: Optional[int] = None
    feasibility_comment: Optional[str] = None
    suggested_refinement: Optional[str] = None
    error: Optional[str] = None
    branches: list = []

class DreamGoalItem(BaseModel):
    category: str
    goal_summary: str
    analysis: str
    steps: list = []
    goal_id: Optional[int] = None

class DreamStepsResponse(BaseModel):
    success: bool
    goals: list[DreamGoalItem] = []
    error: Optional[str] = None

class ActiveGoalRequest(BaseModel):
    user_id: int = Field(default=1)
    title: str = Field(..., min_length=1, max_length=255)
    branch_type: str = Field(default="")
    resources: list = Field(default=[])

class GoalStatusRequest(BaseModel):
    user_id: int = Field(default=1)
    status: str = Field(..., pattern="^(active|completed|cancelled)$")

class SelectStepsRequest(BaseModel):
    goal_id: int = Field(..., ge=1)
    selected_ids: List[int] = Field(..., min_length=1)
    user_id: int = Field(default=1)

class GoalSelection(BaseModel):
    goal_id: int = Field(..., ge=1)
    selected_ids: List[int] = Field(..., min_length=1)

class SelectMultiStepsRequest(BaseModel):
    selections: List[GoalSelection] = Field(..., min_length=1)
    user_id: int = Field(default=1)

class SaveDreamGoalsRequest(BaseModel):
    goal_ids: List[int] = Field(..., min_length=1)
    user_id: int = Field(default=1)


@router.post("/analyze-dream", response_model=DreamResponse)
async def analyze_dream_endpoint(request: DreamRequest, db: AsyncSession = Depends(get_db)):
    """
    Analyze user's dream and generate a development tree plan.
    """
    result = await analyze_dream(
        dream=request.dream,
        user_id=request.user_id,
        db=db
    )
    return DreamResponse(**result)


@router.post("/analyze-dream-steps", response_model=DreamStepsResponse)
async def analyze_dream_steps_endpoint(request: DreamRequest, db: AsyncSession = Depends(get_db)):
    """
    Analyze user's dream and generate categorized steps (Мультидрим-режим).
    Returns array of goals with category, goal_summary, analysis, and steps.
    """
    # First analyze via AI
    result = await analyze_dream_steps(
        dream=request.dream,
        user_id=request.user_id,
        db=db
    )
    
    if not result.get("success"):
        return DreamStepsResponse(**result)
    
    saved_goals = []
    for goal in result.get("goals", []):
        save_result = await save_dream_goal(
            dream_text=request.dream,
            category=goal["category"],
            goal_summary=goal["goal_summary"],
            analysis=goal["analysis"],
            steps=goal["steps"],
            user_id=request.user_id,
            db=db
        )
        
        if save_result.get("success"):
            saved_goals.append({
                "category": goal["category"],
                "goal_summary": goal["goal_summary"],
                "analysis": goal["analysis"],
                "steps": goal["steps"],
                "goal_id": save_result["goal_id"]
            })
    
    if not saved_goals:
        return DreamStepsResponse(
            success=False,
            error="Не удалось сохранить цели"
        )
    
    return DreamStepsResponse(
        success=True,
        goals=saved_goals
    )


@router.post("/select-steps")
async def select_steps_endpoint(request: SelectStepsRequest, db: AsyncSession = Depends(get_db)):
    """
    Save selected step IDs, create a chat with mentor, and redirect to it.
    """
    result = await select_dream_steps(
        goal_id=request.goal_id,
        selected_ids=request.selected_ids,
        user_id=request.user_id,
        db=db
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to select steps"))
    
    return result


@router.post("/select-multi-steps")
async def select_multi_steps_endpoint(request: SelectMultiStepsRequest, db: AsyncSession = Depends(get_db)):
    """
    Save selected step IDs for multiple goals, create a single chat with mentor, and redirect to it.
    """
    from src.agents.mentor_agent import select_multi_dream_steps
    
    result = await select_multi_dream_steps(
        selections=[s.model_dump() for s in request.selections],
        user_id=request.user_id,
        db=db
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to select steps"))
    
    return result


@router.post("/active-goals")
async def add_active_goal_endpoint(request: ActiveGoalRequest, db: AsyncSession = Depends(get_db)):
    """
    Add a goal to user's active goals.
    """
    result = await add_active_goal(
        title=request.title,
        branch_type=request.branch_type,
        resources=request.resources,
        user_id=request.user_id,
        db=db
    )
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to add goal"))
    return result


@router.get("/active-goals")
async def get_active_goals_endpoint(user_id: int = 1, db: AsyncSession = Depends(get_db)):
    """
    Get all active goals for a user.
    """
    goals = await get_active_goals(user_id=user_id, db=db)
    return {"goals": goals}


@router.get("/dream-goals")
async def get_dream_goals_endpoint(user_id: int = 1, db: AsyncSession = Depends(get_db)):
    """
    Get all dream goals for a user (both active and saved).
    """
    from sqlalchemy import select
    from src.models import DreamGoal
    
    try:
        result = await db.execute(
            select(DreamGoal).where(
                DreamGoal.user_id == user_id
            ).order_by(DreamGoal.created_at.desc())
        )
        goals = result.scalars().all()
        
        return {
            "goals": [
                {
                    "goal_id": g.id,
                    "category": g.category,
                    "goal_summary": g.goal_summary,
                    "analysis": g.analysis,
                    "steps": json.loads(g.steps_data) if g.steps_data else [],
                    "status": g.status,
                    "created_at": g.created_at.isoformat() if g.created_at else None
                }
                for g in goals
            ]
        }
    except Exception as e:
        logger.error(f"Failed to get dream goals: {e}")
        raise HTTPException(status_code=500, detail="Failed to get goals")


@router.post("/save-dream-goals")
async def save_dream_goals_endpoint(request: SaveDreamGoalsRequest, db: AsyncSession = Depends(get_db)):
    """
    Mark dream goals as saved (visible in active goals widget).
    """
    from sqlalchemy import select, update
    from src.models import DreamGoal
    
    try:
        updated = []
        for goal_id in request.goal_ids:
            result = await db.execute(
                select(DreamGoal).where(
                    DreamGoal.id == goal_id,
                    DreamGoal.user_id == request.user_id
                )
            )
            goal = result.scalar_one_or_none()
            if goal:
                goal.status = "saved"
                updated.append({
                    "goal_id": goal.id,
                    "goal_summary": goal.goal_summary,
                    "category": goal.category
                })
        
        await db.commit()
        return {"success": True, "goals": updated}
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to save dream goals: {e}")
        raise HTTPException(status_code=500, detail="Failed to save goals")


@router.delete("/dream-goals/{goal_id}")
async def delete_dream_goal_endpoint(
    goal_id: int,
    user_id: int = 1,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a dream goal by ID.
    """
    from sqlalchemy import select
    from src.models import DreamGoal
    
    try:
        result = await db.execute(
            select(DreamGoal).where(
                DreamGoal.id == goal_id,
                DreamGoal.user_id == user_id
            )
        )
        goal = result.scalar_one_or_none()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        await db.delete(goal)
        await db.commit()
        return {"success": True, "message": "Goal deleted"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to delete dream goal: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete goal")


@router.patch("/active-goals/{goal_id}/status")
async def update_goal_status_endpoint(
    goal_id: int,
    request: GoalStatusRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Update goal status (active/completed/cancelled).
    """
    result = await update_goal_status(
        goal_id=goal_id,
        status=request.status,
        user_id=request.user_id,
        db=db
    )
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error", "Goal not found"))
    return result