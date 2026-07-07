from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from src.database import get_db
from src.agents.mentor_agent import analyze_dream, add_active_goal, get_active_goals, update_goal_status

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

class ActiveGoalRequest(BaseModel):
    user_id: int = Field(default=1)
    title: str = Field(..., min_length=1, max_length=255)
    branch_type: str = Field(default="")
    resources: list = Field(default=[])

class GoalStatusRequest(BaseModel):
    user_id: int = Field(default=1)
    status: str = Field(..., pattern="^(active|completed|cancelled)$")

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