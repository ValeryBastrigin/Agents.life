from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, desc
from src.database import get_db
from src.models import TherapySession, MoodEntry, Message
from src.agents.psychologist_agent import generate_summary

router = APIRouter(prefix="/api", tags=["psychologist"])


# ─── Pydantic schemas ─────────────────────────────────────────────────────


class MoodCreate(BaseModel):
    mood: int = Field(..., ge=1, le=5)
    emoji: str = Field(..., min_length=1, max_length=10)
    label: str = Field(..., min_length=1, max_length=50)


class MoodEntryResponse(BaseModel):
    id: int
    user_id: int
    mood: int
    emoji: str
    label: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TherapySessionCreate(BaseModel):
    chat_id: int = Field(...)


class TherapySessionResponse(BaseModel):
    id: int
    user_id: int
    chat_id: int
    summary: Optional[str] = ""
    status: str = "active"
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ActiveSessionResponse(BaseModel):
    active: bool
    session: Optional[TherapySessionResponse] = None


# ─── Mood endpoints ───────────────────────────────────────────────────────


@router.post("/user/{user_id}/mood", response_model=MoodEntryResponse)
async def create_mood(user_id: int, data: MoodCreate, db: AsyncSession = Depends(get_db)):
    """Save a mood entry for the user."""
    entry = MoodEntry(
        user_id=user_id,
        mood=data.mood,
        emoji=data.emoji,
        label=data.label,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.get("/user/{user_id}/mood-week", response_model=List[MoodEntryResponse])
async def get_mood_week(user_id: int, db: AsyncSession = Depends(get_db)):
    """Get mood entries for the last 7 days."""
    result = await db.execute(
        select(MoodEntry)
        .where(MoodEntry.user_id == user_id)
        .order_by(desc(MoodEntry.created_at))
        .limit(50)
    )
    entries = result.scalars().all()
    return entries


# ─── Therapy session endpoints ─────────────────────────────────────────────


@router.get("/user/{user_id}/therapy/active", response_model=ActiveSessionResponse)
async def get_active_therapy_session(user_id: int, db: AsyncSession = Depends(get_db)):
    """Check if user has an active therapy session."""
    result = await db.execute(
        select(TherapySession)
        .where(TherapySession.user_id == user_id)
        .where(TherapySession.status == "active")
        .order_by(desc(TherapySession.created_at))
        .limit(1)
    )
    session = result.scalar_one_or_none()
    if session:
        return ActiveSessionResponse(
            active=True,
            session=TherapySessionResponse.model_validate(session)
        )
    return ActiveSessionResponse(active=False, session=None)


@router.get("/user/{user_id}/therapy-sessions", response_model=List[TherapySessionResponse])
async def list_therapy_sessions(user_id: int, db: AsyncSession = Depends(get_db)):
    """Get all therapy sessions for a user."""
    result = await db.execute(
        select(TherapySession)
        .where(TherapySession.user_id == user_id)
        .order_by(desc(TherapySession.created_at))
    )
    sessions = result.scalars().all()
    return sessions


@router.post("/user/{user_id}/therapy-sessions", response_model=TherapySessionResponse)
async def create_therapy_session(user_id: int, data: TherapySessionCreate, db: AsyncSession = Depends(get_db)):
    """Create a new therapy session."""
    # Deactivate any existing active sessions
    existing_result = await db.execute(
        select(TherapySession)
        .where(TherapySession.user_id == user_id)
        .where(TherapySession.status == "active")
    )
    active_sessions = existing_result.scalars().all()
    for s in active_sessions:
        s.status = "completed"
        s.ended_at = datetime.utcnow()

    session = TherapySession(
        user_id=user_id,
        chat_id=data.chat_id,
        status="active",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.post("/user/{user_id}/therapy-sessions/{session_id}/force-end", response_model=TherapySessionResponse)
async def force_end_therapy_session(user_id: int, session_id: int, db: AsyncSession = Depends(get_db)):
    """Force-end a therapy session and generate summary."""
    result = await db.execute(
        select(TherapySession)
        .where(TherapySession.id == session_id)
        .where(TherapySession.user_id == user_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.status != "active":
        raise HTTPException(status_code=400, detail="Session is not active")
    
    # Generate summary from chat messages
    try:
        summary = await generate_summary(session.chat_id, db)
        session.summary = summary
    except Exception as e:
        print(f"Error generating summary for force-end: {e}")
        session.summary = "Сеанс был завершён досрочно."
    
    session.status = "completed"
    session.ended_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(session)
    return session


@router.delete("/therapy-sessions/{session_id}", status_code=204)
async def delete_therapy_session(session_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a therapy session."""
    result = await db.execute(
        select(TherapySession).where(TherapySession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.delete(session)
    await db.commit()