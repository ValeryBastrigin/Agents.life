from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.models import CalendarEvent, Reminder
from src.config import client
from datetime import datetime, timedelta, time, date
import re

async def process(message: str, system_prompt: str, db: AsyncSession, user_id: int) -> tuple[str, int]:
    """
    Process message with Secretary agent.
    Returns: (response_text, tokens_used)
    """
    # Secretary system prompt
    secretary_prompt = """Ты — секретарь-ИИ. Твоя задача — помогать с планированием встреч, расписанием, напоминаниями и организацией.
    
    Если пользователь просит запланировать встречу, создать событие или напоминание — ТЫ ДОЛЖЕН САМ создать его в базе данных, используя инструменты.
    
    Если в сообщении есть информация о планировании, извлеки данные и создай событие/напоминание.
    Отвечай кратко и по делу, подтверждая создание."""

    # Always try to extract event/reminder details if the message seems to be a request for planning
    extraction_prompt = f"""Проанализируй сообщение пользователя и определи, нужно ли создать событие или напоминание.
    Сообщение: "{message}"
    
    Текущая дата: {datetime.now().strftime('%Y-%m-%d')}
    
    Если нужно создать, верни JSON:
    {{
        "action": "create",
        "type": "event" или "reminder",
        "title": "краткое название (макс. 50 символов)",
        "start_time": "YYYY-MM-DDTHH:MM:SS" (если есть точное время),
        "end_time": "YYYY-MM-DDTHH:MM:SS" (если есть время, например, с 10 до 12),
        "date": "YYYY-MM-DD" (если указана только дата без времени),
        "description": "подробное описание (если есть)"
    }}
    
    ПРАВИЛА:
- Если указано ВРЕМЯ (с 10 до 12, в 15:00, с 14:00 до 16:00 и т.д.) — type = "event" (расписание)
- Если указана только ДАТА без времени (завтра, 29 июня, 15 января и т.д.) — type = "reminder" (события и напоминания)
- Если не указана дата/время — верни {{"action": "none"}}
- Для относительных дат (завтра, послезавтра) используй текущую дату для расчета
    
    Верни ТОЛЬКО JSON, без дополнительного текста."""
    
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
                    return f"✅ Событие '{new_event.title}' добавлено в расписание с {new_event.start_time.strftime('%H:%M')} до {new_event.end_time.strftime('%H:%M')} ({new_event.start_time.strftime('%d.%m.%Y')}).", 0
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
                    return f"✅ Напоминание '{new_reminder.title}' создано на {new_reminder.date.strftime('%d.%m.%Y')}.", 0
            except Exception as e:
                print(f"Error creating event/reminder: {e}")
                return f"Не удалось создать запись. Уточните детали.", 0
    except Exception as e:
        # If extraction fails, fall through to default LLM response
        pass

    # Default: use LLM to respond
    # If we reached here, it means the extraction failed or wasn't needed.
    # We force the agent to NOT suggest using the interface.
    try:
        response = client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=[
                {"role": "system", "content": secretary_prompt + "\nЗАПРЕЩЕНО предлагать пользователю использовать интерфейс или календарь. Если не можешь выполнить задачу — просто попроси уточнить детали."},
                {"role": "user", "content": message}
            ],
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
