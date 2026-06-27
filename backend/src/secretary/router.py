from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update, func, desc
from pydantic import BaseModel
from datetime import time, date
from typing import Optional
from src.database import get_db
from src.models import CalendarEvent, Reminder, Chat, Message, Agent

router = APIRouter(prefix="/api", tags=["secretary"])

# Pydantic models
class CalendarEventCreate(BaseModel):
    title: str
    start_time: str  # ISO format datetime string
    end_time: str    # ISO format datetime string
    color: str = "#3B82F6"
    description: Optional[str] = None

class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None

class CalendarEventResponse(BaseModel):
    id: int
    user_id: int
    title: str
    start_time: str
    end_time: str
    color: str
    description: Optional[str] = None

class ReminderCreate(BaseModel):
    text: str
    title: Optional[str] = None
    time: str  # HH:MM format
    date: Optional[str] = None  # YYYY-MM-DD format
    color: str = "#3B82F6"

class ReminderUpdate(BaseModel):
    text: Optional[str] = None
    title: Optional[str] = None
    time: Optional[str] = None
    date: Optional[str] = None
    completed: Optional[bool] = None
    color: Optional[str] = None

class ReminderResponse(BaseModel):
    id: int
    user_id: int
    text: str
    title: Optional[str] = None
    time: str
    date: Optional[str] = None
    completed: bool
    color: str

# Calendar Events endpoints
@router.get("/events/{user_id}")
async def get_calendar_events(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CalendarEvent).where(CalendarEvent.user_id == user_id))
    events = result.scalars().all()
    return [
        {
            "id": event.id,
            "user_id": event.user_id,
            "title": event.title,
            "start": event.start_time.isoformat(),
            "end": event.end_time.isoformat(),
            "color": event.color,
            "description": event.description
        }
        for event in events
    ]

@router.post("/events/{user_id}")
async def create_calendar_event(user_id: int, event_data: CalendarEventCreate, db: AsyncSession = Depends(get_db)):
    from datetime import datetime
    
    new_event = CalendarEvent(
        user_id=user_id,
        title=event_data.title,
        start_time=datetime.fromisoformat(event_data.start_time),
        end_time=datetime.fromisoformat(event_data.end_time),
        color=event_data.color,
        description=event_data.description
    )
    db.add(new_event)
    await db.commit()
    await db.refresh(new_event)
    
    return {
        "id": new_event.id,
        "user_id": new_event.user_id,
        "title": new_event.title,
        "start": new_event.start_time.isoformat(),
        "end": new_event.end_time.isoformat(),
        "color": new_event.color,
        "description": new_event.description
    }

@router.put("/events/{event_id}")
async def update_calendar_event(event_id: int, event_data: CalendarEventUpdate, db: AsyncSession = Depends(get_db)):
    from datetime import datetime
    
    result = await db.execute(select(CalendarEvent).where(CalendarEvent.id == event_id))
    event = result.scalar_one_or_none()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    update_data = {}
    if event_data.title is not None:
        update_data["title"] = event_data.title
    if event_data.start_time is not None:
        update_data["start_time"] = datetime.fromisoformat(event_data.start_time)
    if event_data.end_time is not None:
        update_data["end_time"] = datetime.fromisoformat(event_data.end_time)
    if event_data.color is not None:
        update_data["color"] = event_data.color
    if event_data.description is not None:
        update_data["description"] = event_data.description
    
    await db.execute(update(CalendarEvent).where(CalendarEvent.id == event_id).values(**update_data))
    await db.commit()
    await db.refresh(event)
    
    return {
        "id": event.id,
        "user_id": event.user_id,
        "title": event.title,
        "start": event.start_time.isoformat(),
        "end": event.end_time.isoformat(),
        "color": event.color,
        "description": event.description
    }

@router.delete("/events/{event_id}")
async def delete_calendar_event(event_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CalendarEvent).where(CalendarEvent.id == event_id))
    event = result.scalar_one_or_none()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    await db.execute(delete(CalendarEvent).where(CalendarEvent.id == event_id))
    await db.commit()
    
    return {"message": "Event deleted successfully"}

# Reminders endpoints
@router.get("/reminders/{user_id}")
async def get_reminders(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Reminder).where(Reminder.user_id == user_id))
    reminders = result.scalars().all()
    return [
        {
            "id": reminder.id,
            "user_id": reminder.user_id,
            "text": reminder.text,
            "title": reminder.title,
            "time": reminder.time.strftime("%H:%M"),
            "date": reminder.date.isoformat() if reminder.date else None,
            "completed": reminder.completed,
            "color": reminder.color
        }
        for reminder in reminders
    ]

@router.post("/reminders/{user_id}")
async def create_reminder(user_id: int, reminder_data: ReminderCreate, db: AsyncSession = Depends(get_db)):
    from datetime import datetime
    
    parsed_time = datetime.strptime(reminder_data.time, "%H:%M").time()
    parsed_date = date.fromisoformat(reminder_data.date) if reminder_data.date else None
    
    new_reminder = Reminder(
        user_id=user_id,
        text=reminder_data.text,
        title=reminder_data.title,
        time=parsed_time,
        date=parsed_date,
        color=reminder_data.color
    )
    db.add(new_reminder)
    await db.commit()
    await db.refresh(new_reminder)
    
    return {
        "id": new_reminder.id,
        "user_id": new_reminder.user_id,
        "text": new_reminder.text,
        "title": new_reminder.title,
        "time": new_reminder.time.strftime("%H:%M"),
        "date": new_reminder.date.isoformat() if new_reminder.date else None,
        "completed": new_reminder.completed,
        "color": new_reminder.color
    }

@router.put("/reminders/{reminder_id}")
async def update_reminder(reminder_id: int, reminder_data: ReminderUpdate, db: AsyncSession = Depends(get_db)):
    from datetime import datetime
    
    result = await db.execute(select(Reminder).where(Reminder.id == reminder_id))
    reminder = result.scalar_one_or_none()
    
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    update_data = {}
    if reminder_data.text is not None:
        update_data["text"] = reminder_data.text
    if reminder_data.title is not None:
        update_data["title"] = reminder_data.title
    if reminder_data.time is not None:
        update_data["time"] = datetime.strptime(reminder_data.time, "%H:%M").time()
    if reminder_data.date is not None:
        update_data["date"] = date.fromisoformat(reminder_data.date) if reminder_data.date else None
    if reminder_data.completed is not None:
        update_data["completed"] = reminder_data.completed
    if reminder_data.color is not None:
        update_data["color"] = reminder_data.color
    
    await db.execute(update(Reminder).where(Reminder.id == reminder_id).values(**update_data))
    await db.commit()
    await db.refresh(reminder)
    
    return {
        "id": reminder.id,
        "user_id": reminder.user_id,
        "text": reminder.text,
        "title": reminder.title,
        "time": reminder.time.strftime("%H:%M"),
        "date": reminder.date.isoformat() if reminder.date else None,
        "completed": reminder.completed,
        "color": reminder.color
    }

@router.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Reminder).where(Reminder.id == reminder_id))
    reminder = result.scalar_one_or_none()
    
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    await db.execute(delete(Reminder).where(Reminder.id == reminder_id))
    await db.commit()
    

# ============================================================
# Activity Log endpoint — агрегирует все действия секретаря
# ============================================================
@router.get("/secretary/logs/{user_id}")
async def get_secretary_logs(
    user_id: int,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """
    Возвращает ленту действий AI-секретаря:
    – созданные события календаря
    – созданные напоминания
    – сообщения из чатов с агентом Secretary
    """
    from datetime import datetime as dt_module

    logs = []

    # --- 1. Calendar Events ---
    events_result = await db.execute(
        select(CalendarEvent)
        .where(CalendarEvent.user_id == user_id)
        .order_by(desc(CalendarEvent.created_at))
    )
    events = events_result.scalars().all()
    for e in events:
        logs.append({
            "id": f"event-{e.id}",
            "action_type": "calendar",
            "title": f"Создал событие: {e.title}",
            "status": "success",
            "timestamp": e.created_at.isoformat() if e.created_at else dt_module.utcnow().isoformat(),
            "payload": {
                "id": e.id,
                "title": e.title,
                "start": e.start_time.isoformat() if e.start_time else None,
                "end": e.end_time.isoformat() if e.end_time else None,
                "color": e.color,
                "description": e.description,
                "source": "calendar_event"
            }
        })

    # --- 2. Reminders ---
    reminders_result = await db.execute(
        select(Reminder)
        .where(Reminder.user_id == user_id)
        .order_by(desc(Reminder.created_at))
    )
    reminders = reminders_result.scalars().all()
    for r in reminders:
        logs.append({
            "id": f"reminder-{r.id}",
            "action_type": "task",
            "title": f"Создал напоминание: {r.text[:60]}{'...' if len(r.text) > 60 else ''}",
            "status": "success" if not r.completed else "completed",
            "timestamp": r.created_at.isoformat() if r.created_at else dt_module.utcnow().isoformat(),
            "payload": {
                "id": r.id,
                "text": r.text,
                "title": r.title,
                "time": r.time.strftime("%H:%M") if r.time else None,
                "date": r.date.isoformat() if r.date else None,
                "completed": r.completed,
                "color": r.color,
                "source": "reminder"
            }
        })

    # --- 3. Messages from Secretary chats ---
    # Находим агента Secretary
    secretary_agent_result = await db.execute(
        select(Agent).where(Agent.name == "Secretary")
    )
    secretary_agent = secretary_agent_result.scalar_one_or_none()

    if secretary_agent:
        # Получаем все чаты с Secretary-агентом
        chats_result = await db.execute(
            select(Chat)
            .where(Chat.user_id == user_id, Chat.agent_id == secretary_agent.id)
        )
        secretary_chats = chats_result.scalars().all()
        chat_ids = [c.id for c in secretary_chats]

        if chat_ids:
            # Получаем сообщения (только assistant) из этих чатов
            messages_result = await db.execute(
                select(Message)
                .where(
                    Message.chat_id.in_(chat_ids),
                    Message.role == "assistant"
                )
                .order_by(desc(Message.created_at))
                .limit(50)
            )
            assistant_messages = messages_result.scalars().all()

            for m in assistant_messages:
                # Пытаемся понять тип действия из содержимого
                content_preview = m.content[:80]
                action = "chat"
                title = f"Ответил: {content_preview}{'...' if len(m.content) > 80 else ''}"
                
                if "встреч" in m.content.lower() or "событи" in m.content.lower() or "event" in m.content.lower():
                    action = "calendar"
                    title = f"Ответ о встрече: {content_preview}..."
                elif "напоминани" in m.content.lower() or "reminder" in m.content.lower():
                    action = "task"
                    title = f"Ответ о напоминании: {content_preview}..."
                elif "заметк" in m.content.lower() or "note" in m.content.lower():
                    action = "note"
                    title = f"Заметка: {content_preview}..."

                logs.append({
                    "id": f"msg-{m.id}",
                    "action_type": action,
                    "title": title,
                    "status": "success",
                    "timestamp": m.created_at.isoformat() if m.created_at else dt_module.utcnow().isoformat(),
                    "payload": {
                        "id": m.id,
                        "chat_id": m.chat_id,
                        "role": m.role,
                        "content": m.content,
                        "tokens_used": m.tokens_used,
                        "source": "chat_message"
                    }
                })

    # --- Сортировка всех логов по времени (новые сверху) ---
    logs.sort(key=lambda x: x["timestamp"], reverse=True)

    # --- Пагинация ---
    total = len(logs)
    start = (page - 1) * page_size
    end = start + page_size
    paged_logs = logs[start:end]

    return {
        "logs": paged_logs,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": end < total
    }


