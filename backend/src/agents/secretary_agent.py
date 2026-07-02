from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.models import CalendarEvent, Reminder, Note
from src.config import client
from src.image_utils import build_llm_user_message
from datetime import datetime, timedelta, time, date
import re

async def process(message: str, system_prompt: str, db: AsyncSession, user_id: int, attachments: list[dict] | None = None) -> tuple[str, int]:
    """
    Process message with Secretary agent.
    Returns: (response_text, tokens_used)
    """
    # Secretary system prompt
    secretary_prompt = """Ты — секретарь-ИИ. Твоя задача — помогать с планированием встреч, расписанием, напоминаниями и организацией.
    
    Если пользователь просит запланировать встречу, создать событие или напоминание — ТЫ ДОЛЖЕН САМ создать его в базе данных, используя инструменты.
    
    Если в сообщении есть информация о планировании, извлеки данные и создай событие/напоминание.
    Отвечай кратко и по делу, подтверждая создание."""

    # Check if user is asking about schedule/events on a specific date
    schedule_query_prompt = f"""Проанализируй сообщение. Определи, ХОЧЕТ ли пользователь УЗНАТЬ своё расписание, ИЛИ он просит СОЗДАТЬ/запланировать встречу.

    Сообщение: "{message}"
    Текущая дата: {datetime.now().strftime('%Y-%m-%d')}

    ПРАВИЛА (строго):
    - Если пользователь ПРОСИТ СОЗДАТЬ, НАЗНАЧИТЬ, ЗАПЛАНИРОВАТЬ, ЗАПИСАТЬ, ДОБАВИТЬ встречу/событие/напоминание — верни {{"action": "none"}}
      (Ключевые слова: назначь, создай, запланируй, запиши, добавь, поставь, сделай, schedule, create, add)
    - Если пользователь СПРАШИВАЕТ "что у меня", "какие встречи", "что запланировано", "расписание на" — верни query_schedule.
    - Если просто названа дата без явного вопроса — верни {{"action": "none"}}

    Если это запрос расписания, верни:
    {{"action": "query_schedule", "date": "YYYY-MM-DD"}}

    Если это НЕ запрос расписания, верни {{"action": "none"}}
    Верни ТОЛЬКО JSON."""
    
    try:
        response = client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=[{"role": "user", "content": schedule_query_prompt}],
            temperature=0.1,
            max_tokens=100
        )
        import json
        llm_response = response.choices[0].message.content
        print(f"DEBUG: Schedule query LLM response: {llm_response}")
        query_data = json.loads(llm_response)
        print(f"DEBUG: Parsed query data: {query_data}")
        
        if query_data.get("action") == "query_schedule":
            # Query actual events from database
            query_date_str = query_data.get("date")
            if query_date_str:
                query_date = date.fromisoformat(query_date_str)
            else:
                query_date = datetime.now().date()
            
            # Get calendar events for the date
            events_result = await db.execute(
                select(CalendarEvent).where(
                    CalendarEvent.user_id == user_id,
                    CalendarEvent.start_time >= datetime.combine(query_date, time.min),
                    CalendarEvent.start_time < datetime.combine(query_date + timedelta(days=1), time.min)
                )
            )
            events = events_result.scalars().all()
            
            # Get reminders for the date
            reminders_result = await db.execute(
                select(Reminder).where(
                    Reminder.user_id == user_id,
                    Reminder.date == query_date
                )
            )
            reminders = reminders_result.scalars().all()
            
            # Format the data for LLM
            events_info = []
            for event in events:
                events_info.append(f"- {event.start_time.strftime('%H:%M')} - {event.end_time.strftime('%H:%M')}: {event.title}")
            
            reminders_info = []
            for reminder in reminders:
                reminders_info.append(f"- {reminder.title or reminder.text}")
            
            # Build response based on actual data - return JSON for frontend rendering
            import json
            response_data = {
                "type": "schedule",
                "date": query_date.strftime('%d.%m.%Y'),
                "events": [],
                "reminders": []
            }
            
            for event in events:
                response_data["events"].append({
                    "start_time": event.start_time.strftime('%H:%M'),
                    "end_time": event.end_time.strftime('%H:%M'),
                    "title": event.title
                })
            
            for reminder in reminders:
                response_data["reminders"].append({
                    "title": reminder.title or reminder.text
                })
            
            return json.dumps(response_data), 0
    except Exception as e:
        print(f"Error querying schedule: {e}")
        pass  # Fall through to extraction logic

    # ============================================================
    # Note creation — detect BEFORE event/reminder extraction
    # ============================================================
    msg_lower = message.lower()
    note_keywords = ['заметк', 'запиши заметк', 'создай заметк', 'надикт', 'note',
                     'добавь заметк', 'напомни заметк']
    if any(kw in msg_lower for kw in note_keywords):
        note_extraction_prompt = f"""Пользователь хочет создать заметку. Выдели из сообщения суть, придумай краткий заголовок (до 60 символов) и оформи содержимое заметки.
        Сообщение: "{message}"

        Верни JSON:
        {{
            "title": "Краткий заголовок (суммируй суть)",
            "content": "Оформленное содержимое заметки (всё что сказал пользователь, структурированно)"
        }}
        Верни ТОЛЬКО JSON."""
        try:
            response = client.chat.completions.create(
                model="google/gemini-3.1-flash-lite",
                messages=[{"role": "user", "content": note_extraction_prompt}],
                temperature=0.3, max_tokens=500
            )
            import json
            note_data = json.loads(response.choices[0].message.content)
            title = note_data.get("title", "Заметка")[:100]
            content = note_data.get("content", message)[:2000]

            new_note = Note(user_id=user_id, title=title, content=content, color="#8B5CF6")
            db.add(new_note)
            await db.commit()
            await db.refresh(new_note)

            return json.dumps({
                "type": "note_created",
                "title": new_note.title,
                "content_preview": new_note.content[:100] + ("..." if len(new_note.content) > 100 else ""),
                "id": new_note.id
            }), 0
        except Exception as e:
            print(f"Error creating note: {e}")
            return "Не удалось создать заметку. Попробуйте ещё раз.", 0

    # Always try to extract event/reminder details if the message seems to be a request for planning
    extraction_prompt = f"""Проанализируй сообщение пользователя и определи, нужно ли создать событие или напоминание.
    Сообщение: "{message}"
    
    Текущая дата: {datetime.now().strftime('%Y-%m-%d')}
    
    Если нужно создать, верни JSON:
    {{
        "action": "create",
        "type": "event" или "reminder",
        "title": "краткое название (макс. 50 символов)",
        "start_time": "YYYY-MM-DDTHH:MM:SS" (ТОЛЬКО если указано время),
        "end_time": "YYYY-MM-DDTHH:MM:SS" (ТОЛЬКО если указано время окончания),
        "date": "YYYY-MM-DD" (дата, ОБЯЗАТЕЛЬНО),
        "description": "подробное описание"
    }}
    
    ПРАВИЛА (строго по порядку):
    1. Если в сообщении НЕТ даты и нет слов "завтра"/"послезавтра" — верни {{"action": "none"}}
    2. Если указано ВРЕМЯ (в 15:00, с 10 до 12, к 14:00 и т.д.) — type="event", ОБЯЗАТЕЛЬНО заполни start_time и end_time
    3. Если указана только ДАТА без времени — type="reminder"
    4. "завтра" = завтрашняя дата, "послезавтра" = послезавтра
    
    Верни ТОЛЬКО JSON."""
    
    try:
        response = client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=[{"role": "user", "content": extraction_prompt}],
            temperature=0.1,
            max_tokens=200
        )
        import json
        data = json.loads(response.choices[0].message.content)
        
        if data.get("action") == "create":
            try:
                if data.get("type") == "event":
                    # С указанием времени - создаем CalendarEvent (расписание)
                    start_time_str = data.get("start_time")
                    end_time_str = data.get("end_time")
                    
                    if not start_time_str and not end_time_str:
                        return "Укажите время для события в расписании.", 0
                    
                    if start_time_str and not end_time_str:
                        # Если указано только время начала - дефолт 1 час
                        start_dt = datetime.fromisoformat(start_time_str)
                        end_dt = start_dt + timedelta(hours=1)
                        end_time_str = end_dt.strftime('%Y-%m-%dT%H:%M:%S')
                    
                    new_event = CalendarEvent(
                        user_id=user_id,
                        title=data.get("title", "Встреча")[:50],
                        start_time=datetime.fromisoformat(start_time_str),
                        end_time=datetime.fromisoformat(end_time_str),
                        description=data.get("description", "")
                    )
                    db.add(new_event)
                    await db.commit()
                    import json
                    response_data = {
                        "type": "event_created",
                        "title": new_event.title,
                        "date": new_event.start_time.strftime('%d.%m.%Y'),
                        "time": f"{new_event.start_time.strftime('%H:%M')} - {new_event.end_time.strftime('%H:%M')}",
                        "kind": "event"
                    }
                    return json.dumps(response_data), 0
                else:
                    # Без времени - создаем Reminder (события и напоминания)
                    date_str = data.get("date")
                    if not date_str:
                        return "Укажите дату для напоминания.", 0
                    
                    new_reminder = Reminder(
                        user_id=user_id,
                        text=data.get("title", "Напоминание")[:200],
                        title=data.get("title", "Напоминание")[:50],
                        time=time(9, 0),  # Дефолтное время
                        date=date.fromisoformat(date_str)
                    )
                    db.add(new_reminder)
                    await db.commit()
                    import json
                    response_data = {
                        "type": "event_created",
                        "title": new_reminder.title,
                        "date": new_reminder.date.strftime('%d.%m.%Y'),
                        "time": new_reminder.time.strftime('%H:%M'),
                        "kind": "reminder"
                    }
                    return json.dumps(response_data), 0
            except Exception as e:
                print(f"Error creating event/reminder: {e}")
                return f"Не удалось создать запись. Уточните детали.", 0
    except Exception as e:
        # If extraction fails, fall through to default LLM response
        pass

    # If we reached here, extraction returned none or failed.
    # Check if user is trying to create something without a date
    create_keywords = ['назначь', 'создай', 'запланируй', 'запиши', 'добавь', 'поставь',
                       'schedule', 'create', 'add', 'set up', 'book']
    msg_lower = message.lower()
    if any(kw in msg_lower for kw in create_keywords):
        return "Уточните дату и время для создания записи.", 0

    # Default: use LLM to respond
    # We force the agent to NOT suggest using the interface.
    try:
        user_msg = build_llm_user_message(message, attachments)
        messages = [
            {"role": "system", "content": secretary_prompt + "\nЗАПРЕЩЕНО предлагать пользователю использовать интерфейс или календарь. Если не можешь выполнить задачу — просто попроси уточнить детали."},
            user_msg if isinstance(user_msg, dict) else {"role": "user", "content": str(user_msg)},
        ]
        response = client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=messages,
            temperature=0.5,
            max_tokens=150,
            timeout=60.0
        )
        response_text = response.choices[0].message.content
        
        # Final safety check
        if "интерфейс" in response_text.lower() or "календарь" in response_text.lower():
            return "Пожалуйста, уточните детали встречи или напоминания, чтобы я мог их создать.", 0
            
        return response_text, 0
    except Exception as e:
        print(f"Error in secretary agent: {e}")
        return "Извините, произошла ошибка при обработке вашего запроса.", 0
