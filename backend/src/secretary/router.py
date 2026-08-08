from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update, func, desc
from pydantic import BaseModel
from datetime import time, date, datetime
from typing import Optional, List
from src.database import get_db
from src.models import CalendarEvent, Reminder, Note, User, ScheduleAnalysis
from src.billing.dependency import check_billing_limit

router = APIRouter(tags=["secretary"])

# Pydantic models
class CalendarEventCreate(BaseModel):
    title: str
    start_time: str  # ISO format datetime string
    end_time: str    # ISO format datetime string
    color: str = "#3B82F6"
    description: Optional[str] = None
    push_enabled: bool = False

class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    push_enabled: Optional[bool] = None

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
    try:
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            return []
            
        result = await db.execute(select(CalendarEvent).where(CalendarEvent.user_id == user_id))
        events = result.scalars().all()
        if not events:
            return []
            
        return [
            {
                "id": event.id,
                "user_id": event.user_id,
                "title": event.title,
                "start": event.start_time.isoformat() if event.start_time else "",
                "end": event.end_time.isoformat() if event.end_time else "",
                "color": event.color or "#3B82F6",
                "description": event.description,
                "completed": event.completed if hasattr(event, "completed") else False,
                "push_enabled": event.push_enabled if hasattr(event, "push_enabled") else False
            }
            for event in events
        ]
    except Exception as e:
        print(f"Error fetching calendar events for user {user_id}: {e}")
        return []

@router.post("/events/{user_id}")
async def create_calendar_event(user_id: int, event_data: CalendarEventCreate, db: AsyncSession = Depends(get_db)):
    try:
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            # Auto-create user if not exists to prevent 500 errors when working with new/cleared DB
            user = User(
                id=user_id,
                username=f"user_{user_id}",
                email=f"user_{user_id}@lifeagent.com",
                password_hash="hashed_password_placeholder",
                token_balance=1000,
                theme_preference="light"
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

        def parse_dt(dt_str):
            if not dt_str:
                return datetime.now()
            if isinstance(dt_str, datetime):
                return dt_str
            try:
                cleaned = dt_str.replace('Z', '+00:00')
                return datetime.fromisoformat(cleaned)
            except Exception:
                try:
                    return datetime.strptime(dt_str[:19], "%Y-%m-%dT%H:%M:%S")
                except Exception:
                    try:
                        return datetime.strptime(dt_str[:16], "%Y-%m-%dT%H:%M")
                    except Exception:
                        return datetime.now()

        new_event = CalendarEvent(
            user_id=user_id,
            title=event_data.title,
            start_time=parse_dt(event_data.start_time),
            end_time=parse_dt(event_data.end_time),
            color=event_data.color,
            description=event_data.description,
            push_enabled=event_data.push_enabled
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
            "description": new_event.description,
            "push_enabled": new_event.push_enabled
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        await db.rollback()
        print(f"Error creating calendar event for user {user_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/events/{event_id}")
async def update_calendar_event(event_id: int, event_data: CalendarEventUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CalendarEvent).where(CalendarEvent.id == event_id))
    event = result.scalar_one_or_none()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    update_data = {}
    if event_data.title is not None:
        update_data["title"] = event_data.title
    if event_data.start_time is not None:
        update_data["start_time"] = datetime.fromisoformat(event_data.start_time.replace('Z', '+00:00'))
    if event_data.end_time is not None:
        update_data["end_time"] = datetime.fromisoformat(event_data.end_time.replace('Z', '+00:00'))
    if event_data.color is not None:
        update_data["color"] = event_data.color
    if event_data.description is not None:
        update_data["description"] = event_data.description
    if event_data.push_enabled is not None:
        update_data["push_enabled"] = event_data.push_enabled
    
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
        "description": event.description,
        "push_enabled": event.push_enabled
    }

@router.put("/events/{event_id}/toggle")
async def toggle_event_completed(event_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CalendarEvent).where(CalendarEvent.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event.completed = not event.completed
    await db.commit()
    await db.refresh(event)
    
    return {
        "id": event.id,
        "completed": event.completed
    }

@router.put("/events/{event_id}/toggle-push")
async def toggle_event_push(event_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CalendarEvent).where(CalendarEvent.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event.push_enabled = not event.push_enabled
    await db.commit()
    await db.refresh(event)
    return {"status": "success", "push_enabled": event.push_enabled}

@router.put("/reminders/{reminder_id}/toggle-push")
async def toggle_reminder_push(reminder_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Reminder).where(Reminder.id == reminder_id))
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    reminder.push_enabled = not reminder.push_enabled
    await db.commit()
    await db.refresh(reminder)
    return {"status": "success", "push_enabled": reminder.push_enabled}

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
    try:
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            return []
            
        result = await db.execute(select(Reminder).where(Reminder.user_id == user_id))
        reminders = result.scalars().all()
        if not reminders:
            return []
            
        return [
            {
                "id": reminder.id,
                "user_id": reminder.user_id,
                "text": reminder.text,
                "title": reminder.title,
                "time": reminder.time.strftime("%H:%M") if reminder.time else "00:00",
                "date": reminder.date.isoformat() if reminder.date else None,
                "completed": reminder.completed if hasattr(reminder, "completed") else False,
                "color": reminder.color or "#3B82F6"
            }
            for reminder in reminders
        ]
    except Exception as e:
        print(f"Error fetching reminders for user {user_id}: {e}")
        return []

@router.post("/reminders/{user_id}")
async def create_reminder(user_id: int, reminder_data: ReminderCreate, db: AsyncSession = Depends(get_db)):
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
    return {"message": "Reminder deleted successfully"}


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
    logs = []

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
            "timestamp": e.created_at.isoformat() if e.created_at else datetime.utcnow().isoformat(),
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
            "timestamp": r.created_at.isoformat() if r.created_at else datetime.utcnow().isoformat(),
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

    notes_result = await db.execute(
        select(Note).where(Note.user_id == user_id).order_by(desc(Note.created_at))
    )
    notes = notes_result.scalars().all()
    for n in notes:
        logs.append({
            "id": f"note-{n.id}",
            "action_type": "note",
            "title": "Создал заметку: " + (n.title[:60] + ("..." if len(n.title) > 60 else "")),
            "status": "success",
            "timestamp": n.created_at.isoformat() if n.created_at else datetime.utcnow().isoformat(),
            "payload": {
                "id": n.id,
                "title": n.title,
                "content": n.content,
                "color": n.color,
                "is_pinned": n.is_pinned,
                "source": "note"
            }
        })

    logs.sort(key=lambda x: x["timestamp"], reverse=True)

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


# ============================================================
# Notes CRUD
# ============================================================
class NoteCreate(BaseModel):
    title: str
    content: str = ""
    color: str = "#8B5CF6"

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_pinned: Optional[bool] = None
    color: Optional[str] = None

@router.get("/notes/{user_id}")
async def get_notes(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Note).where(Note.user_id == user_id).order_by(desc(Note.is_pinned), desc(Note.updated_at))
    )
    notes = result.scalars().all()
    return [
        {
            "id": n.id,
            "user_id": n.user_id,
            "title": n.title,
            "content": n.content,
            "is_pinned": n.is_pinned,
            "color": n.color,
            "created_at": n.created_at.isoformat() if n.created_at else None,
            "updated_at": n.updated_at.isoformat() if n.updated_at else None,
        }
        for n in notes
    ]

@router.post("/notes/{user_id}")
async def create_note(user_id: int, data: NoteCreate, db: AsyncSession = Depends(get_db)):
    note = Note(user_id=user_id, title=data.title, content=data.content, color=data.color)
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return {"id": note.id, "title": note.title, "content": note.content, "is_pinned": note.is_pinned, "color": note.color}

@router.put("/notes/{note_id}")
async def update_note(note_id: int, data: NoteUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Note).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    update_data = {}
    if data.title is not None: update_data["title"] = data.title
    if data.content is not None: update_data["content"] = data.content
    if data.is_pinned is not None: update_data["is_pinned"] = data.is_pinned
    if data.color is not None: update_data["color"] = data.color
    await db.execute(update(Note).where(Note.id == note_id).values(**update_data))
    await db.commit()
    return {"message": "Note updated"}

@router.delete("/notes/{note_id}")
async def delete_note(note_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Note).where(Note.id == note_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Note not found")
    await db.execute(delete(Note).where(Note.id == note_id))
    await db.commit()
    return {"message": "Note deleted"}


# ============================================================
# Schedule Parsing & Analysis
# ============================================================
class ScheduleTextParseRequest(BaseModel):
    text: str

class SaveParsedScheduleRequest(BaseModel):
    events: list[dict]
    period: str  # 'today' | 'week' | 'month' | 'custom'
    custom_date: Optional[str] = None

class AnalyzeScheduleRangeRequest(BaseModel):
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD

@router.post("/parse-schedule/{user_id}")
async def parse_schedule_legacy(user_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    return await parse_schedule_image(user_id, file, db)

@router.post("/secretary/parse-schedule/{user_id}")
async def parse_schedule_secretary_alias(user_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    return await parse_schedule_image(user_id, file, db)

@router.post("/parse-schedule-image/{user_id}")
async def parse_schedule_image_primary(user_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    return await parse_schedule_image(user_id, file, db)

@router.post("/secretary/parse-schedule-image/{user_id}")
async def parse_schedule_image_secretary_alias(user_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    return await parse_schedule_image(user_id, file, db)

async def parse_schedule_image(user_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail=f"Пользователь с ID {user_id} не найден.")

    await check_billing_limit(user, estimated_cost=5, db=db)

    import json
    import base64
    try:
        from src.config import client
        from src.billing.calculator import calculate_cost
        contents = await file.read()
        b64_img = base64.b64encode(contents).decode("utf-8")
        data_uri = f"data:{file.content_type or 'image/jpeg'};base64,{b64_img}"

        prompt = """ВНИМАНИЕ: Внимательно проанализируй прикрепленное изображение с расписанием пользователя. Извлеки все реальные события, встречи, занятия и задачи, указанные на этой картинке, с их временем (например, 09:00 - 10:00) и названиями.
Верни результат СТРОГО в формате JSON:
{
  "events": [
    {"title": "Название события с картинки", "time": "09:00 - 10:00", "description": "Детали с картинки"}
  ]
}"""

        response = await client.chat.completions.create(
            model="google/gemini-2.5-flash-lite",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": data_uri}}
                    ]
                }
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content
        print(f"DEBUG: OCR Schedule Vision Result: {content}")

        input_tokens = response.usage.prompt_tokens if response.usage else 500
        output_tokens = response.usage.completion_tokens if response.usage else 500

        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if user:
            credits_cost = calculate_cost("google/gemini-2.5-flash-lite", input_tokens=input_tokens, output_tokens=output_tokens)
            if credits_cost == 0:
                credits_cost = 2
            user.credits_used = (user.credits_used or 0) + credits_cost
            user.token_balance = max((user.token_balance or 0) - credits_cost, 0)
            user.last_credit_reset = date.today()
            await db.commit()

        res_json = json.loads(content)
        events_list = []
        if res_json and "events" in res_json and isinstance(res_json["events"], list):
            events_list = res_json["events"]
        elif res_json and isinstance(res_json, list):
            events_list = res_json
        elif res_json and isinstance(res_json, dict):
            for k, v in res_json.items():
                if isinstance(v, list):
                    events_list = v
                    break

        if events_list and len(events_list) > 0:
            return {"events": events_list}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error parsing schedule image via LLM Vision: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="К сожалению не смог распознать расписание, попробуйте еще раз.")

    raise HTTPException(status_code=400, detail="К сожалению не смог распознать расписание, попробуйте еще раз.")

@router.post("/parse-schedule-text/{user_id}")
async def parse_schedule_text(user_id: int, data: ScheduleTextParseRequest, db: AsyncSession = Depends(get_db)):
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()
    if user:
        await check_billing_limit(user, estimated_cost=5, db=db)

    import json
    import re
    try:
        from src.config import client
        from src.billing.calculator import calculate_cost

        prompt = f"""ВНИМАНИЕ: Проанализируй текст пользователя с описанием его расписания, встреч и планов. Извлеки все события и разбей их на отдельные блоки с указанием времени (в формате ЧЧ:ММ - ЧЧ:ММ), названия и описания.
Текст пользователя:
\"{data.text}\"

Верни JSON СТРОГО в следующем формате (без лишнего текста и без обертки markdown вроде ```json):
{{
  "events": [
    {{"title": "Название события", "time": "09:00 - 10:00", "description": "Описание"}}
  ]
}}"""

        response = await client.chat.completions.create(
            model="google/gemini-2.5-flash-lite",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2
        )
        content = response.choices[0].message.content.strip()
        print(f"DEBUG: Parse text schedule response: {content}")

        if content.startswith("```"):
            content = re.sub(r"^```(?:json)?\s*", "", content)
            content = re.sub(r"\s*```$", "", content)

        res_json = json.loads(content)

        input_tokens = response.usage.prompt_tokens if response.usage else len(prompt) // 4
        output_tokens = response.usage.completion_tokens if response.usage else len(content) // 4
        
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if user:
            credits_cost = calculate_cost("google/gemini-2.5-flash-lite", input_tokens=input_tokens, output_tokens=output_tokens)
            if credits_cost == 0:
                credits_cost = 1
            user.credits_used = (user.credits_used or 0) + credits_cost
            user.token_balance = max((user.token_balance or 0) - credits_cost, 0)
            user.last_credit_reset = date.today()
            await db.commit()

        events_list = []
        if res_json and "events" in res_json and isinstance(res_json["events"], list):
            events_list = res_json["events"]
        elif res_json and isinstance(res_json, list):
            events_list = res_json
        elif res_json and isinstance(res_json, dict):
            for k, v in res_json.items():
                if isinstance(v, list):
                    events_list = v
                    break

        if events_list and len(events_list) > 0:
            return {"events": events_list}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error parsing schedule via LLM: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="К сожалению не смог распознать расписание, попробуйте еще раз.")

    raise HTTPException(status_code=400, detail="К сожалению не смог распознать расписание, попробуйте еще раз.")

@router.post("/secretary/parse-schedule-text/{user_id}")
async def parse_schedule_text_alias(user_id: int, data: ScheduleTextParseRequest, db: AsyncSession = Depends(get_db)):
    return await parse_schedule_text(user_id, data, db)

@router.post("/save-parsed-schedule/{user_id}")
async def save_parsed_schedule(user_id: int, data: SaveParsedScheduleRequest, db: AsyncSession = Depends(get_db)):
    return await save_parsed_schedule_inner(user_id, data, db)

@router.post("/secretary/save-parsed-schedule/{user_id}")
async def save_parsed_schedule_alias(user_id: int, data: SaveParsedScheduleRequest, db: AsyncSession = Depends(get_db)):
    return await save_parsed_schedule_inner(user_id, data, db)

async def save_parsed_schedule_inner(user_id: int, data: SaveParsedScheduleRequest, db: AsyncSession = Depends(get_db)):
    from datetime import timedelta
    
    base_date = date.today()
    if data.period == 'custom' and data.custom_date:
        try:
            base_date = datetime.strptime(data.custom_date, "%Y-%m-%d").date()
        except:
            pass

    days_to_create = 1
    if data.period == 'week':
        days_to_create = 7
    elif data.period == 'month':
        days_to_create = 30

    created_count = 0
    for day_offset in range(days_to_create):
        current_day = base_date + timedelta(days=day_offset)
        for ev in data.events:
            time_str = ev.get("time", "09:00 - 10:00")
            parts = time_str.split("-")
            start_str = parts[0].strip() if len(parts) > 0 else "09:00"
            end_str = parts[1].strip() if len(parts) > 1 else "10:00"

            try:
                start_t = datetime.strptime(start_str, "%H:%M").time()
                end_t = datetime.strptime(end_str, "%H:%M").time()
            except:
                start_t = time(9, 0)
                end_t = time(10, 0)

            start_dt = datetime.combine(current_day, start_t)
            end_dt = datetime.combine(current_day, end_t)
            if end_dt <= start_dt:
                end_dt = start_dt + timedelta(hours=1)

            new_event = CalendarEvent(
                user_id=user_id,
                title=ev.get("title", "Событие"),
                start_time=start_dt,
                end_time=end_dt,
                color="#3B82F6",
                description=ev.get("description", ""),
                push_enabled=True
            )
            db.add(new_event)
            created_count += 1

    await db.commit()
    return {"message": f"Successfully created {created_count} events in secretary calendar.", "count": created_count}


# ============================================================
# Analyze Schedule Range endpoint (for 3rd card in ScheduleManager)
# ============================================================
class SaveScheduleAnalysisRequest(BaseModel):
    analysis_data: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None

@router.get("/saved-analysis/{user_id}")
@router.get("/secretary/saved-analysis/{user_id}")
async def get_saved_schedule_analysis(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScheduleAnalysis).where(ScheduleAnalysis.user_id == user_id))
    record = result.scalar_one_or_none()
    if not record:
        return {"exists": False}
    return {
        "exists": True,
        "analysis_data": record.analysis_data,
        "start_date": record.start_date,
        "end_date": record.end_date,
        "updated_at": record.updated_at.isoformat() if record.updated_at else None
    }

@router.post("/save-analysis/{user_id}")
@router.post("/secretary/save-analysis/{user_id}")
async def save_schedule_analysis(user_id: int, data: SaveScheduleAnalysisRequest, db: AsyncSession = Depends(get_db)):
    # Delete existing if any (keep only the latest one)
    await db.execute(delete(ScheduleAnalysis).where(ScheduleAnalysis.user_id == user_id))
    
    new_record = ScheduleAnalysis(
        user_id=user_id,
        analysis_data=data.analysis_data,
        start_date=data.start_date,
        end_date=data.end_date
    )
    db.add(new_record)
    await db.commit()
    return {"status": "success", "message": "Analysis saved successfully"}

@router.post("/analyze-schedule-range/{user_id}")
@router.post("/secretary/analyze-schedule-range/{user_id}")
async def analyze_schedule_range(user_id: int, data: AnalyzeScheduleRangeRequest, db: AsyncSession = Depends(get_db)):
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail=f"Пользователь с ID {user_id} не найден.")

    await check_billing_limit(user, estimated_cost=5, db=db)

    try:
        start_d = date.fromisoformat(data.start_date)
        end_d = date.fromisoformat(data.end_date)
    except Exception:
        raise HTTPException(status_code=400, detail="Неверный формат даты.")

    # Fetch calendar events in range
    start_dt = datetime.combine(start_d, time.min)
    end_dt = datetime.combine(end_d, time.max)

    events_res = await db.execute(
        select(CalendarEvent)
        .where(CalendarEvent.user_id == user_id)
        .where(CalendarEvent.start_time >= start_dt)
        .where(CalendarEvent.start_time <= end_dt)
    )
    events = events_res.scalars().all()

    # Fetch reminders in range
    reminders_res = await db.execute(
        select(Reminder)
        .where(Reminder.user_id == user_id)
        .where(Reminder.date >= start_d)
        .where(Reminder.date <= end_d)
    )
    reminders = reminders_res.scalars().all()

    events_data = [
        {
            "title": e.title,
            "start": e.start_time.isoformat(),
            "end": e.end_time.isoformat(),
            "description": e.description
        }
        for e in events
    ]

    reminders_data = [
        {
            "text": r.text,
            "title": r.title,
            "time": r.time.strftime("%H:%M") if r.time else None,
            "date": r.date.isoformat() if r.date else None,
            "completed": r.completed
        }
        for r in reminders
    ]

    if not events_data and not reminders_data:
        return {"analysis": f"На период с {data.start_date} по {data.end_date} не найдено ни событий, ни задач/напоминаний. График абсолютно свободен!"}

    try:
        from src.config import client
        from src.billing.calculator import calculate_cost

        prompt = f"""Проанализируй расписание и задачи пользователя за период с {data.start_date} по {data.end_date}.
События календаря: {events_data}
Напоминания и задачи: {reminders_data}

Дай конструктивную, мотивирующую и профессиональную рецензию на график пользователя (оцени баланс работы и отдыха, наличие перегрузок, дай полезные советы по тайм-менеджменту). Отвечай на русском языке в дружелюбном, экспертном стиле."""

        response = await client.chat.completions.create(
            model="google/gemini-2.5-flash-lite",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        analysis_text = response.choices[0].message.content.strip()

        input_tokens = response.usage.prompt_tokens if response.usage else 500
        output_tokens = response.usage.completion_tokens if response.usage else 500
        credits_cost = calculate_cost("google/gemini-2.5-flash-lite", input_tokens=input_tokens, output_tokens=output_tokens)
        if credits_cost == 0:
            credits_cost = 2
        user.credits_used = (user.credits_used or 0) + credits_cost
        user.token_balance = max((user.token_balance or 0) - credits_cost, 0)
        user.last_credit_reset = date.today()
        await db.commit()

        return {"analysis": analysis_text}
    except Exception as e:
        print(f"Error analyzing schedule range via LLM: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Ошибка при анализе расписания через ИИ.")
