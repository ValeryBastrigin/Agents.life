from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import AsyncGenerator
from src.models import CalendarEvent, Reminder, Note
from src.config import client
from src.image_utils import build_llm_user_message
from src.agents.streaming import stream_llm_response, StreamEvent, stream_text_with_delay
from datetime import datetime, timedelta, time, date
import re
import json

# In-memory session store for schedule approval flow
# Key: f"secretary_approval_{user_id}", Value: {"action": "await_approval_schedule"|"await_approval_evaluation", "data": {...}}
_schedule_sessions: dict[str, dict] = {}


def _get_session_key(user_id: int) -> str:
    return f"secretary_approval_{user_id}"


def _clear_session(user_id: int):
    key = _get_session_key(user_id)
    _schedule_sessions.pop(key, None)


def _extract_text(message) -> str:
    """Extract plain text from message regardless of format."""
    if isinstance(message, dict):
        return str(message.get("text", message.get("content", message.get("message", ""))))
    elif isinstance(message, str):
        try:
            parsed = json.loads(message)
            if isinstance(parsed, dict):
                return str(parsed.get("text", parsed.get("content", parsed.get("message", ""))))
        except (json.JSONDecodeError, TypeError):
            pass
        return message
    return str(message)


def _parse_time(time_str: str) -> time | None:
    """Parse HH:MM or H:MM string into time object."""
    try:
        return datetime.strptime(time_str.strip(), "%H:%M").time()
    except ValueError:
        try:
            return datetime.strptime(time_str.strip(), "%H:%M:%S").time()
        except ValueError:
            return None


async def _classify_message(text_content: str, msg_lower: str, has_image: bool) -> str:
    """
    Classify user message into one tag using LLM.
    Returns: "schedule_creation" | "schedule_query" | "note_creation" | "event_creation" | "general"
    """
    classify_prompt = f"""Ты — классификатор сообщений для ИИ-секретаря. Определи тип сообщения пользователя.

Сообщение: "{text_content}"
Текущая дата: {datetime.now().strftime('%Y-%m-%d')}

ТИПЫ:
1. "schedule_creation" — пользователь ОПИСЫВАЕТ СВОЙ ОБЫЧНЫЙ ДЕНЬ (распорядок, режим, дела по времени). 
   Признаки: перечисляет занятия (работаю, учусь, отдыхаю, кушаю), указывает время (с X до Y, в X часов), 
   говорит о своём типичном дне. Сообщение длинное, много временных диапазонов.
   
2. "schedule_query" — пользователь СПРАШИВАЕТ про существующее расписание/события.
   Признаки: "что у меня", "какие встречи", "расписание на", "что запланировано", "покажи календарь".

3. "note_creation" — пользователь хочет СОЗДАТЬ ЗАМЕТКУ.
   Признаки: "запиши", "создай заметку", "напомни заметку", "заметка", "сохрани мысль".

4. "event_creation" — пользователь просит СОЗДАТЬ ОДНО событие/напоминание на конкретную дату (сегодня/завтра/послезавтра/конкретная дата).
   Признаки: запланировать встречу, добавить дело на завтра, напомнить в пятницу.

5. "general" — всё остальное: приветствия, вопросы, просьбы рассказать о чём-то, команды.

ВАЖНО: Если пользователь перечисляет МНОГО дел с временем на каждый день (распорядок дня) — это schedule_creation.
Если просит добавить ОДНО конкретное дело на завтра/сегодня — это event_creation.

Верни ТОЛЬКО JSON с одним полем: {{"tag": "schedule_creation"}}"""

    try:
        response = await client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=[{"role": "user", "content": classify_prompt}],
            temperature=0.1,
            max_tokens=50
        )
        result = json.loads(response.choices[0].message.content)
        tag = result.get("tag", "general")
        if tag not in ("schedule_creation", "schedule_query", "note_creation", "event_creation", "general"):
            tag = "general"
        return tag
    except Exception as e:
        print(f"Error classifying message: {e}")
        return "general"


async def process(message: str, system_prompt: str, db: AsyncSession, user_id: int, attachments: list[dict] | None = None) -> tuple[str, int]:
    """
    Process message with Secretary agent.
    Returns: (response_text, tokens_used)
    
    Flow:
    1. LLM classifies message into one tag
    2. Based on tag, execute appropriate handler
    """
    text_content = _extract_text(message)
    msg_lower = text_content.lower().strip()
    
    has_image = attachments and any(a.get("type") == "image_url" for a in attachments)
    
    # ============================================================
    # 0. CHECK SESSION STATE — handle approval flows
    # ============================================================
    session_key = _get_session_key(user_id)
    session = _schedule_sessions.get(session_key)
    
    if session:
        action = session.get("action")
        
        # --- APPROVAL: Schedule creation (awaiting "yes/no" to create proposed schedule) ---
        if action == "await_approval_schedule":
            approval_keywords_yes = ['да', 'давай', 'создавай', 'ок', 'хорошо', 'отлично', 'согласен', 'согласна',
                                     'yes', 'ok', 'okay', 'good', 'add', 'добавляй', 'внеси', 'вноси', 'утверждаю',
                                     'подтверждаю', 'всё верно', 'все верно', 'правильно', 'норм', 'нормально',
                                     'замечательно', 'прекрасно', 'супер', 'конечно', 'ага', 'угу']
            approval_keywords_no = ['нет', 'не согласен', 'не согласна', 'измени', 'поменяй', 'переделай',
                                    'не так', 'неправильно', 'no', 'не подходит', 'плохо']
            
            if any(kw == msg_lower or msg_lower.startswith(kw) or msg_lower.endswith(kw) for kw in approval_keywords_yes):
                # User approved — create events from pending data
                pending = session.get("data", {})
                tasks = pending.get("tasks", [])
                
                created_events = []
                today_date = datetime.now().date()
                for item in tasks:
                    start_time_str = item.get("start_time", "09:00")
                    duration = item.get("duration_hours", 1.0)
                    try:
                        start_time_only = _parse_time(start_time_str)
                        if start_time_only is None:
                            start_time_only = datetime.strptime("09:00", "%H:%M").time()
                        start_dt = datetime.combine(today_date, start_time_only)
                        end_dt = start_dt + timedelta(hours=duration)
                        new_event = CalendarEvent(
                            user_id=user_id,
                            title=item.get("title", "Дело")[:50],
                            start_time=start_dt,
                            end_time=end_dt,
                            description=item.get("description", "")
                        )
                        db.add(new_event)
                        created_events.append(new_event)
                    except Exception as e:
                        print(f"Error creating approved event: {e}")
                
                await db.commit()
                _clear_session(user_id)
                
                response_text = "✅ **Расписание создано!**\n\n"
                for ev in created_events:
                    response_text += f"• {ev.start_time.strftime('%H:%M')} – {ev.end_time.strftime('%H:%M')}: {ev.title}\n"
                response_text += "\nПроверьте календарь. Если нужно что-то изменить — просто скажите."
                return response_text, 0
            
            elif any(kw in msg_lower for kw in approval_keywords_no):
                # User wants changes
                _clear_session(user_id)
                return "Понял! Расскажите, что именно нужно изменить в расписании, и я переделаю.", 0
            
            else:
                # New schedule description overrides session
                tag = await _classify_message(text_content, msg_lower, has_image)
                if tag == "schedule_creation":
                    _clear_session(user_id)
                    session = None
                else:
                    # Ambiguous response — ask again
                    return "Я вас не совсем понял. Вы согласны с предложенным расписанием? Скажите «да» чтобы создать, или опишите что изменить.", 0
        
        # --- APPROVAL: Schedule evaluation (awaiting "yes/no" to add evaluated schedule) ---
        elif action == "await_approval_evaluation":
            approval_yes = ['да', 'давай', 'добавляй', 'внеси', 'вноси', 'ок', 'хорошо', 'отлично',
                            'согласен', 'согласна', 'yes', 'ok', 'add', 'утверждаю', 'подтверждаю',
                            'конечно', 'ага', 'угу', 'замечательно', 'прекрасно', 'супер']
            if any(kw == msg_lower or msg_lower.startswith(kw) or msg_lower.endswith(kw) for kw in approval_yes):
                # User approved — add the evaluated schedule to calendar
                pending = session.get("data", {})
                schedule_details = pending.get("schedule_details", [])
                created_events = []
                
                for detail in schedule_details:
                    title = detail.get("title", "Дело")[:50]
                    time_str = detail.get("time", "09:00")
                    description = detail.get("description", "")
                    
                    try:
                        time_str_clean = re.sub(r'\s+', '', time_str)
                        today_date = datetime.now().date()
                        if '-' in time_str_clean:
                            parts = time_str_clean.split('-')
                            start_time_only = _parse_time(parts[0]) or time(9, 0)
                            end_time_only = _parse_time(parts[1]) or time(10, 0)
                            start_dt = datetime.combine(today_date, start_time_only)
                            end_dt = datetime.combine(today_date, end_time_only)
                        else:
                            start_time_only = _parse_time(time_str_clean) or time(9, 0)
                            start_dt = datetime.combine(today_date, start_time_only)
                            end_dt = start_dt + timedelta(hours=1)
                        
                        new_event = CalendarEvent(
                            user_id=user_id,
                            title=title,
                            start_time=start_dt,
                            end_time=end_dt,
                            description=description
                        )
                        db.add(new_event)
                        created_events.append(new_event)
                    except Exception as e:
                        print(f"Error parsing schedule detail time: {e}")
                
                await db.commit()
                _clear_session(user_id)
                
                response_text = "✅ **Расписание добавлено в календарь!**\n\n"
                for ev in created_events:
                    response_text += f"• {ev.start_time.strftime('%H:%M')} – {ev.end_time.strftime('%H:%M')}: {ev.title}\n"
                response_text += "\nГотово! Можете проверить календарь."
                return response_text, 0
            
            else:
                _clear_session(user_id)
                return "Хорошо, не буду добавлять это расписание. Если захотите — просто скажите.", 0
    
    # ============================================================
    # 1. CLASSIFY MESSAGE
    # ============================================================
    tag = await _classify_message(text_content, msg_lower, has_image)
    
    # ============================================================
    # 2. SCHEDULE QUERY — what's on a specific date?
    # ============================================================
    if tag == "schedule_query":
        schedule_query_prompt = f"""Проанализируй сообщение. Определи, на какую дату пользователь хочет узнать расписание.

        Сообщение: "{text_content}"
        Текущая дата: {datetime.now().strftime('%Y-%m-%d')}

        Если пользователь спросил "на сегодня" — верни сегодняшнюю дату.
        Если "на завтра" — верни завтрашнюю.
        Если "на понедельник/вторник/..." — верни дату ближайшего указанного дня недели.
        Если дата не указана — используй сегодня.

        Верни JSON: {{"date": "YYYY-MM-DD"}}
        Верни ТОЛЬКО JSON."""
        
        try:
            response = await client.chat.completions.create(
                model="google/gemini-3.1-flash-lite",
                messages=[{"role": "user", "content": schedule_query_prompt}],
                temperature=0.1,
                max_tokens=100
            )
            query_data = json.loads(response.choices[0].message.content)
            query_date_str = query_data.get("date")
            if query_date_str:
                query_date = date.fromisoformat(query_date_str)
            else:
                query_date = datetime.now().date()
            
            events_result = await db.execute(
                select(CalendarEvent).where(
                    CalendarEvent.user_id == user_id,
                    CalendarEvent.start_time >= datetime.combine(query_date, time.min),
                    CalendarEvent.start_time < datetime.combine(query_date + timedelta(days=1), time.min)
                )
            )
            events = events_result.scalars().all()
            
            reminders_result = await db.execute(
                select(Reminder).where(
                    Reminder.user_id == user_id,
                    Reminder.date == query_date
                )
            )
            reminders = reminders_result.scalars().all()
            
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
            return "Не удалось получить расписание. Попробуйте ещё раз.", 0
    
    # ============================================================
    # 3. NOTE CREATION
    # ============================================================
    if tag == "note_creation":
        note_extraction_prompt = f"""Пользователь хочет создать заметку. Выдели из сообщения суть, придумай краткий заголовок (до 60 символов) и оформи содержимое заметки.
        Сообщение: "{text_content}"

        Верни JSON:
        {{
            "title": "Краткий заголовок (суммируй суть)",
            "content": "Оформленное содержимое заметки (всё что сказал пользователь, структурированно)"
        }}
        Верни ТОЛЬКО JSON."""
        try:
            response = await client.chat.completions.create(
                model="google/gemini-3.1-flash-lite",
                messages=[{"role": "user", "content": note_extraction_prompt}],
                temperature=0.3, max_tokens=500
            )
            note_data = json.loads(response.choices[0].message.content)
            title = note_data.get("title", "Заметка")[:100]
            content = note_data.get("content", text_content)[:2000]

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
    
    # ============================================================
    # 4. EVENT CREATION — single event/reminder on a specific date
    # ============================================================
    if tag == "event_creation":
        extraction_prompt = f"""Проанализируй сообщение пользователя и определи, нужно ли создать событие или напоминание.
        Сообщение: "{text_content}"
        
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
            response = await client.chat.completions.create(
                model="google/gemini-3.1-flash-lite",
                messages=[{"role": "user", "content": extraction_prompt}],
                temperature=0.1,
                max_tokens=2000
            )
            data = json.loads(response.choices[0].message.content)
            
            if data.get("action") == "create":
                try:
                    if data.get("type") == "event":
                        start_time_str = data.get("start_time")
                        end_time_str = data.get("end_time")
                        
                        if not start_time_str and not end_time_str:
                            return "Укажите время для события в расписании.", 0
                        
                        if start_time_str and not end_time_str:
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
                        response_data = {
                            "type": "event_created",
                            "title": new_event.title,
                            "date": new_event.start_time.strftime('%d.%m.%Y'),
                            "time": f"{new_event.start_time.strftime('%H:%M')} - {new_event.end_time.strftime('%H:%M')}",
                            "kind": "event"
                        }
                        return json.dumps(response_data), 0
                    else:
                        date_str = data.get("date")
                        if not date_str:
                            return "Укажите дату для напоминания.", 0
                        
                        new_reminder = Reminder(
                            user_id=user_id,
                            text=data.get("title", "Напоминание")[:200],
                            title=data.get("title", "Напоминание")[:50],
                            time=time(9, 0),
                            date=date.fromisoformat(date_str)
                        )
                        db.add(new_reminder)
                        await db.commit()
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
                    return "Не удалось создать запись. Уточните детали.", 0
        except Exception as e:
            print(f"Error in event extraction: {e}")
            return "Не удалось создать запись. Уточните дату и время.", 0
    
    # ============================================================
    # 5. SCHEDULE CREATION — user describes their daily routine
    # ============================================================
    if tag == "schedule_creation":
        schedule_extraction_prompt = f"""Проанализируй сообщение пользователя и извлеки все дела, время и продолжительность ТОЧНО так, как описал пользователь.

Сообщение: "{text_content}"

ВАЖНЕЙШЕЕ ПРАВИЛО: Сохрани ВСЁ что сказал пользователь в ТОЧНОСТИ. 
- Используй ТОЛЬКО время, которое указал пользователь. НЕ придумывай своё.
- НЕ добавляй дела, которых нет в сообщении пользователя (не добавляй завтрак/обед/ужин, если пользователь их не назвал).
- НЕ меняй порядок дел и время.
- Если пользователь указал диапазон (например "с 8 до 16"), используй его.
- Если пользователь сказал "с 16 до 17 я кушаю" — это задача с временем 16:00-17:00.
- Продолжительность вычисляй из времени, которое указал пользователь.
- Если время указано как "с X до Y", длительность = Y - X часов.

Верни JSON:
{{
    "tasks": [
        {{"title": "Название дела", "start_time": "HH:MM", "duration_hours": 1.0, "description": "опционально"}}
    ]
}}

НЕ ДОБАВЛЯЙ ничего лишнего. Только то, что сказал пользователь.
Верни ТОЛЬКО JSON."""
        
        try:
            response = await client.chat.completions.create(
                model="google/gemini-3.1-flash-lite",
                messages=[{"role": "user", "content": schedule_extraction_prompt}],
                temperature=0.4,
                max_tokens=2000
            )
            schedule_data = json.loads(response.choices[0].message.content)
            
            tasks = schedule_data.get("tasks", [])
            
            if not tasks:
                return "Я не смог найти дела с временем в вашем сообщении. Опишите, пожалуйста, ваш день с указанием времени.", 0
            
            # Present proposed schedule to user
            response_text = "📋 **Вот какое расписание я предлагаю:**\n\n"
            response_text += "📌 **Дела:**\n"
            for t in tasks:
                name = t.get("title", "Дело")
                start = t.get("start_time", "—")
                dur = t.get("duration_hours", 1)
                today_date = datetime.now().date()
                end_h = None
                if start != "—":
                    parsed_start = _parse_time(start)
                    if parsed_start:
                        end_h = datetime.combine(today_date, parsed_start) + timedelta(hours=dur)
                end_str = end_h.strftime("%H:%M") if end_h else "—"
                response_text += f"• {start} – {end_str}: {name}\n"
            response_text += "\n"
            response_text += "Всё верно? Скажите **«да»** чтобы создать расписание, или опишите что изменить."
            
            # Save pending data for approval
            _schedule_sessions[session_key] = {
                "action": "await_approval_schedule",
                "data": {"tasks": tasks}
            }
            
            return response_text, 0
            
        except Exception as e:
            print(f"Error extracting schedule: {e}")
            return "Не удалось составить расписание. Опишите, пожалуйста, ваши дела подробнее.", 0
    
    # ============================================================
    # 6. GENERAL — default LLM response
    # ============================================================
    secretary_prompt = """Ты — секретарь-ИИ. Твоя задача — помогать с планированием встреч, расписанием, напоминаниями и организацией.
    
    Отвечай кратко и по делу. Если пользователь просит запланировать встречу, создать событие или напоминание — попроси уточнить дату и время.
    Если пользователь описывает свой распорядок дня — предложи составить расписание (скажи "Хотите, я составлю расписание на основе вашего дня?")."""
    
    try:
        user_msg = build_llm_user_message(text_content, attachments)
        messages = [
            {"role": "system", "content": secretary_prompt + "\nЗАПРЕЩЕНО предлагать пользователю использовать интерфейс или календарь. Если не можешь выполнить задачу — просто попроси уточнить детали."},
            user_msg if isinstance(user_msg, dict) else {"role": "user", "content": str(user_msg)},
        ]
        stream = await client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=messages,
            temperature=0.5,
            max_tokens=3000,
            timeout=60.0,
            stream=True,
        )
        response_text = ""
        async for chunk in stream:
            if chunk.choices and len(chunk.choices) > 0:
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    response_text += delta.content
        
        # Get real token usage from API response
        usage = getattr(stream, 'usage', None)
        if usage:
            tokens_used = getattr(usage, 'total_tokens', 0)
        else:
            tokens_used = 0
        
        if "интерфейс" in response_text.lower() or "календарь" in response_text.lower():
            return "Пожалуйста, уточните детали встречи или напоминания, чтобы я мог их создать.", tokens_used
            
        return response_text, tokens_used
    except Exception as e:
        print(f"Error in secretary agent: {e}")
        return "Извините, произошла ошибка при обработке вашего запроса.", 0


async def process_stream(
    message: str,
    system_prompt: str,
    db: AsyncSession,
    user_id: int,
    attachments: list[dict] | None = None,
) -> AsyncGenerator[StreamEvent, None]:
    """
    Streaming version of process() for Secretary agent.
    Yields StreamEvent tokens in real time.
    """
    try:
        text_content = _extract_text(message)
        msg_lower = text_content.lower().strip()
        has_image = attachments and any(a.get("type") == "image_url" for a in attachments)

        # === CHECK SESSION STATE ===
        session_key = _get_session_key(user_id)
        session = _schedule_sessions.get(session_key)

        if session:
            action = session.get("action")
            
            if action == "await_approval_schedule":
                approval_keywords_yes = ['да', 'давай', 'создавай', 'ок', 'хорошо', 'отлично', 'согласен', 'согласна',
                                         'yes', 'ok', 'okay', 'good', 'add', 'добавляй', 'внеси', 'вноси', 'утверждаю',
                                         'подтверждаю', 'всё верно', 'все верно', 'правильно', 'норм', 'нормально',
                                         'замечательно', 'прекрасно', 'супер', 'конечно', 'ага', 'угу']
                approval_keywords_no = ['нет', 'не согласен', 'не согласна', 'измени', 'поменяй', 'переделай',
                                        'не так', 'неправильно', 'no', 'не подходит', 'плохо']
                
                if any(kw == msg_lower or msg_lower.startswith(kw) or msg_lower.endswith(kw) for kw in approval_keywords_yes):
                    pending = session.get("data", {})
                    tasks = pending.get("tasks", [])
                    created_events = []
                    today_date = datetime.now().date()
                    for item in tasks:
                        start_time_str = item.get("start_time", "09:00")
                        duration = item.get("duration_hours", 1.0)
                        try:
                            start_time_only = _parse_time(start_time_str)
                            if start_time_only is None:
                                start_time_only = datetime.strptime("09:00", "%H:%M").time()
                            start_dt = datetime.combine(today_date, start_time_only)
                            end_dt = start_dt + timedelta(hours=duration)
                            new_event = CalendarEvent(
                                user_id=user_id,
                                title=item.get("title", "Дело")[:50],
                                start_time=start_dt,
                                end_time=end_dt,
                                description=item.get("description", "")
                            )
                            db.add(new_event)
                            created_events.append(new_event)
                        except Exception as e:
                            print(f"Error creating approved event: {e}")
                    await db.commit()
                    _clear_session(user_id)
                    
                    # Stream the response word by word
                    yield StreamEvent(type="token", content="✅ **Расписание создано!**\n\n")
                    for ev in created_events:
                        yield StreamEvent(type="token", content=f"• {ev.start_time.strftime('%H:%M')} – {ev.end_time.strftime('%H:%M')}: {ev.title}\n")
                    yield StreamEvent(type="token", content="\nПроверьте календарь. Если нужно что-то изменить — просто скажите.")
                    full_response = "✅ **Расписание создано!**\n\n" + "\n".join(f"• {ev.start_time.strftime('%H:%M')} – {ev.end_time.strftime('%H:%M')}: {ev.title}" for ev in created_events) + "\n\nПроверьте календарь. Если нужно что-то изменить — просто скажите."
                    yield StreamEvent(type="done", content=full_response, metadata={"tokens_used": 0})
                    return
                elif any(kw in msg_lower for kw in approval_keywords_no):
                    _clear_session(user_id)
                    response_text = "Понял! Расскажите, что именно нужно изменить в расписании, и я переделаю."
                    async for chunk in stream_text_with_delay(response_text, chunk_size=1, delay_ms=50):
                        yield StreamEvent(type="token", content=chunk)
                    yield StreamEvent(type="done", content=response_text, metadata={"tokens_used": 0})
                    return
                else:
                    tag = await _classify_message(text_content, msg_lower, has_image)
                    if tag == "schedule_creation":
                        _clear_session(user_id)
                        session = None
                    else:
                        response_text = "Я вас не совсем понял. Вы согласны с предложенным расписанием? Скажите «да» чтобы создать, или опишите что изменить."
                        async for chunk in stream_text_with_delay(response_text, chunk_size=1, delay_ms=50):
                            yield StreamEvent(type="token", content=chunk)
                        yield StreamEvent(type="done", content=response_text, metadata={"tokens_used": 0})
                        return
            
            elif action == "await_approval_evaluation":
                approval_yes = ['да', 'давай', 'добавляй', 'внеси', 'вноси', 'ок', 'хорошо', 'отлично',
                                'согласен', 'согласна', 'yes', 'ok', 'add', 'утверждаю', 'подтверждаю',
                                'конечно', 'ага', 'угу', 'замечательно', 'прекрасно', 'супер']
                if any(kw == msg_lower or msg_lower.startswith(kw) or msg_lower.endswith(kw) for kw in approval_yes):
                    pending = session.get("data", {})
                    schedule_details = pending.get("schedule_details", [])
                    created_events = []
                    for detail in schedule_details:
                        title = detail.get("title", "Дело")[:50]
                        time_str = detail.get("time", "09:00")
                        description = detail.get("description", "")
                        try:
                            time_str_clean = re.sub(r'\s+', '', time_str)
                            today_date = datetime.now().date()
                            if '-' in time_str_clean:
                                parts = time_str_clean.split('-')
                                start_time_only = _parse_time(parts[0]) or time(9, 0)
                                end_time_only = _parse_time(parts[1]) or time(10, 0)
                                start_dt = datetime.combine(today_date, start_time_only)
                                end_dt = datetime.combine(today_date, end_time_only)
                            else:
                                start_time_only = _parse_time(time_str_clean) or time(9, 0)
                                start_dt = datetime.combine(today_date, start_time_only)
                                end_dt = start_dt + timedelta(hours=1)
                            new_event = CalendarEvent(
                                user_id=user_id,
                                title=title,
                                start_time=start_dt,
                                end_time=end_dt,
                                description=description
                            )
                            db.add(new_event)
                            created_events.append(new_event)
                        except Exception as e:
                            print(f"Error parsing schedule detail time: {e}")
                    await db.commit()
                    _clear_session(user_id)
                    # Stream the response word by word
                    yield StreamEvent(type="token", content="✅ **Расписание добавлено в календарь!**\n\n")
                    for ev in created_events:
                        yield StreamEvent(type="token", content=f"• {ev.start_time.strftime('%H:%M')} – {ev.end_time.strftime('%H:%M')}: {ev.title}\n")
                    yield StreamEvent(type="token", content="\nГотово! Можете проверить календарь.")
                    full_response = "✅ **Расписание добавлено в календарь!**\n\n" + "\n".join(f"• {ev.start_time.strftime('%H:%M')} – {ev.end_time.strftime('%H:%M')}: {ev.title}" for ev in created_events) + "\n\nГотово! Можете проверить календарь."
                    yield StreamEvent(type="done", content=full_response, metadata={"tokens_used": 0})
                    return
                else:
                    _clear_session(user_id)
                    response_text = "Хорошо, не буду добавлять это расписание. Если захотите — просто скажите."
                    async for chunk in stream_text_with_delay(response_text, chunk_size=1, delay_ms=50):
                        yield StreamEvent(type="token", content=chunk)
                    yield StreamEvent(type="done", content=response_text, metadata={"tokens_used": 0})
                    return

        # === CLASSIFY MESSAGE ===
        tag = await _classify_message(text_content, msg_lower, has_image)

        # === SCHEDULE QUERY ===
        if tag == "schedule_query":
            schedule_query_prompt = f"""Проанализируй сообщение. Определи, на какую дату пользователь хочет узнать расписание.
            Сообщение: "{text_content}"
            Текущая дата: {datetime.now().strftime('%Y-%m-%d')}
            Если пользователь спросил "на сегодня" — верни сегодняшнюю дату.
            Если "на завтра" — верни завтрашнюю.
            Если "на понедельник/вторник/..." — верни дату ближайшего указанного дня недели.
            Если дата не указана — используй сегодня.
            Верни JSON: {{"date": "YYYY-MM-DD"}}
            Верни ТОЛЬКО JSON."""
            try:
                response = await client.chat.completions.create(
                    model="google/gemini-3.1-flash-lite",
                    messages=[{"role": "user", "content": schedule_query_prompt}],
                    temperature=0.1, max_tokens=100
                )
                query_data = json.loads(response.choices[0].message.content)
                query_date_str = query_data.get("date")
                query_date = date.fromisoformat(query_date_str) if query_date_str else datetime.now().date()
                events_result = await db.execute(
                    select(CalendarEvent).where(
                        CalendarEvent.user_id == user_id,
                        CalendarEvent.start_time >= datetime.combine(query_date, time.min),
                        CalendarEvent.start_time < datetime.combine(query_date + timedelta(days=1), time.min)
                    )
                )
                events = events_result.scalars().all()
                reminders_result = await db.execute(
                    select(Reminder).where(Reminder.user_id == user_id, Reminder.date == query_date)
                )
                reminders = reminders_result.scalars().all()
                response_data = {"type": "schedule", "date": query_date.strftime('%d.%m.%Y'), "events": [], "reminders": []}
                for event in events:
                    response_data["events"].append({"start_time": event.start_time.strftime('%H:%M'), "end_time": event.end_time.strftime('%H:%M'), "title": event.title})
                for reminder in reminders:
                    response_data["reminders"].append({"title": reminder.title or reminder.text})
                response_json = json.dumps(response_data)
                # Stream JSON as a single token (widgets should be atomic)
                yield StreamEvent(type="token", content=response_json)
                yield StreamEvent(type="done", content=response_json, metadata={"tokens_used": 0})
            except Exception as e:
                print(f"Error querying schedule: {e}")
                response_text = "Не удалось получить расписание. Попробуйте ещё раз."
                async for chunk in stream_text_with_delay(response_text, chunk_size=1, delay_ms=20):
                    yield StreamEvent(type="token", content=chunk)
                yield StreamEvent(type="done", content=response_text, metadata={"tokens_used": 0})
            return

        # === NOTE CREATION ===
        if tag == "note_creation":
            note_extraction_prompt = f"""Пользователь хочет создать заметку. Выдели из сообщения суть, придумай краткий заголовок (до 60 символов) и оформи содержимое заметки.
            Сообщение: "{text_content}"
            Верни JSON:
            {{
                "title": "Краткий заголовок (суммируй суть)",
                "content": "Оформленное содержимое заметки (всё что сказал пользователь, структурированно)"
            }}
            Верни ТОЛЬКО JSON."""
            try:
                response = await client.chat.completions.create(
                    model="google/gemini-3.1-flash-lite",
                    messages=[{"role": "user", "content": note_extraction_prompt}],
                    temperature=0.3, max_tokens=500
                )
                note_data = json.loads(response.choices[0].message.content)
                title = note_data.get("title", "Заметка")[:100]
                content = note_data.get("content", text_content)[:2000]
                new_note = Note(user_id=user_id, title=title, content=content, color="#8B5CF6")
                db.add(new_note)
                await db.commit()
                await db.refresh(new_note)
                widget = {"type": "note_created", "title": new_note.title, "content_preview": new_note.content[:100] + ("..." if len(new_note.content) > 100 else ""), "id": new_note.id}
                yield StreamEvent(type="widget", content=json.dumps(widget))
                yield StreamEvent(type="done", content=json.dumps(widget), metadata={"tokens_used": 0})
            except Exception as e:
                print(f"Error creating note: {e}")
                response_text = "Не удалось создать заметку. Попробуйте ещё раз."
                async for chunk in stream_text_with_delay(response_text, chunk_size=1, delay_ms=20):
                    yield StreamEvent(type="token", content=chunk)
                yield StreamEvent(type="done", content=response_text, metadata={"tokens_used": 0})
            return

        # === EVENT CREATION ===
        if tag == "event_creation":
            extraction_prompt = f"""Проанализируй сообщение пользователя и определи, нужно ли создать событие или напоминание.
            Сообщение: "{text_content}"
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
                response = await client.chat.completions.create(
                    model="google/gemini-3.1-flash-lite",
                    messages=[{"role": "user", "content": extraction_prompt}],
                    temperature=0.1, max_tokens=2000
                )
                data = json.loads(response.choices[0].message.content)
                if data.get("action") == "create":
                    if data.get("type") == "event":
                        start_time_str = data.get("start_time")
                        end_time_str = data.get("end_time")
                        if not start_time_str and not end_time_str:
                            response_text = "Укажите время для события в расписании."
                            async for chunk in stream_text_with_delay(response_text, chunk_size=1, delay_ms=50):
                                yield StreamEvent(type="token", content=chunk)
                            yield StreamEvent(type="done", content=response_text, metadata={"tokens_used": 0})
                            return
                        if start_time_str and not end_time_str:
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
                        widget = {"type": "event_created", "title": new_event.title, "date": new_event.start_time.strftime('%d.%m.%Y'), "time": f"{new_event.start_time.strftime('%H:%M')} - {new_event.end_time.strftime('%H:%M')}", "kind": "event"}
                        yield StreamEvent(type="widget", content=json.dumps(widget))
                        yield StreamEvent(type="done", content=json.dumps(widget), metadata={"tokens_used": 0})
                    else:
                        date_str = data.get("date")
                        if not date_str:
                            response_text = "Укажите дату для напоминания."
                            async for chunk in stream_text_with_delay(response_text, chunk_size=1, delay_ms=50):
                                yield StreamEvent(type="token", content=chunk)
                            yield StreamEvent(type="done", content=response_text, metadata={"tokens_used": 0})
                            return
                        new_reminder = Reminder(
                            user_id=user_id,
                            text=data.get("title", "Напоминание")[:200],
                            title=data.get("title", "Напоминание")[:50],
                            time=time(9, 0),
                            date=date.fromisoformat(date_str)
                        )
                        db.add(new_reminder)
                        await db.commit()
                        widget = {"type": "event_created", "title": new_reminder.title, "date": new_reminder.date.strftime('%d.%m.%Y'), "time": new_reminder.time.strftime('%H:%M'), "kind": "reminder"}
                        yield StreamEvent(type="widget", content=json.dumps(widget))
                        yield StreamEvent(type="done", content=json.dumps(widget), metadata={"tokens_used": 0})
                else:
                    response_text = "Не удалось создать запись. Уточните дату и время."
                    async for chunk in stream_text_with_delay(response_text, chunk_size=1, delay_ms=50):
                        yield StreamEvent(type="token", content=chunk)
                    yield StreamEvent(type="done", content=response_text, metadata={"tokens_used": 0})
            except Exception as e:
                print(f"Error in event extraction: {e}")
                response_text = "Не удалось создать запись. Уточните дату и время."
                async for chunk in stream_text_with_delay(response_text, chunk_size=1, delay_ms=50):
                    yield StreamEvent(type="token", content=chunk)
                yield StreamEvent(type="done", content=response_text, metadata={"tokens_used": 0})
            return

        # === SCHEDULE CREATION ===
        if tag == "schedule_creation":
            schedule_extraction_prompt = f"""Проанализируй сообщение пользователя и извлеки все дела, время и продолжительность ТОЧНО так, как описал пользователь.
            Сообщение: "{text_content}"
            ВАЖНЕЙШЕЕ ПРАВИЛО: Сохрани ВСЁ что сказал пользователь в ТОЧНОСТИ. 
            - Используй ТОЛЬКО время, которое указал пользователь. НЕ придумывай своё.
            - НЕ добавляй дела, которых нет в сообщении пользователя.
            - НЕ меняй порядок дел и время.
            - Если пользователь указал диапазон (например "с 8 до 16"), используй его.
            - Продолжительность вычисляй из времени, которое указал пользователь.
            - Если время указано как "с X до Y", длительность = Y - X часов.
            Верни JSON:
            {{
                "tasks": [
                    {{"title": "Название дела", "start_time": "HH:MM", "duration_hours": 1.0, "description": "опционально"}}
                ]
            }}
            НЕ ДОБАВЛЯЙ ничего лишнего. Только то, что сказал пользователь.
            Верни ТОЛЬКО JSON."""
            try:
                response = await client.chat.completions.create(
                    model="google/gemini-3.1-flash-lite",
                    messages=[{"role": "user", "content": schedule_extraction_prompt}],
                    temperature=0.4, max_tokens=2000
                )
                schedule_data = json.loads(response.choices[0].message.content)
                tasks = schedule_data.get("tasks", [])
                if not tasks:
                    response_text = "Я не смог найти дела с временем в вашем сообщении. Опишите, пожалуйста, ваш день с указанием времени."
                    async for chunk in stream_text_with_delay(response_text, chunk_size=1, delay_ms=50):
                        yield StreamEvent(type="token", content=chunk)
                    yield StreamEvent(type="done", content=response_text, metadata={"tokens_used": 0})
                    return
                
                # Stream the schedule proposal word by word
                yield StreamEvent(type="token", content="📋 **Вот какое расписание я предлагаю:**\n\n")
                yield StreamEvent(type="token", content="📌 **Дела:**\n")
                for t in tasks:
                    name = t.get("title", "Дело")
                    start = t.get("start_time", "—")
                    dur = t.get("duration_hours", 1)
                    today_date = datetime.now().date()
                    end_h = None
                    if start != "—":
                        parsed_start = _parse_time(start)
                        if parsed_start:
                            end_h = datetime.combine(today_date, parsed_start) + timedelta(hours=dur)
                    end_str = end_h.strftime("%H:%M") if end_h else "—"
                    yield StreamEvent(type="token", content=f"• {start} – {end_str}: {name}\n")
                yield StreamEvent(type="token", content="\nВсё верно? Скажите **«да»** чтобы создать расписание, или опишите что изменить.")
                
                # Build full response for done event
                full_response = "📋 **Вот какое расписание я предлагаю:**\n\n📌 **Дела:**\n"
                for t in tasks:
                    name = t.get("title", "Дело")
                    start = t.get("start_time", "—")
                    dur = t.get("duration_hours", 1)
                    today_date = datetime.now().date()
                    end_h = None
                    if start != "—":
                        parsed_start = _parse_time(start)
                        if parsed_start:
                            end_h = datetime.combine(today_date, parsed_start) + timedelta(hours=dur)
                    end_h_str = end_h.strftime("%H:%M") if end_h else "—"
                    full_response += f"• {start} – {end_h_str}: {name}\n"
                full_response += "\nВсё верно? Скажите **«да»** чтобы создать расписание, или опишите что изменить."
                
                _schedule_sessions[session_key] = {"action": "await_approval_schedule", "data": {"tasks": tasks}}
                yield StreamEvent(type="done", content=full_response, metadata={"tokens_used": 0})
            except Exception as e:
                print(f"Error extracting schedule: {e}")
                response_text = "Не удалось составить расписание. Опишите, пожалуйста, ваши дела подробнее."
                async for chunk in stream_text_with_delay(response_text, chunk_size=1, delay_ms=20):
                    yield StreamEvent(type="token", content=chunk)
                yield StreamEvent(type="done", content=response_text, metadata={"tokens_used": 0})
            return

        # === GENERAL ===
        secretary_prompt = """Ты — секретарь-ИИ. Твоя задача — помогать с планированием встреч, расписанием, напоминаниями и организацией.
        Отвечай кратко и по делу. Если пользователь просит запланировать встречу, создать событие или напоминание — попроси уточнить дату и время.
        Если пользователь описывает свой распорядок дня — предложи составить расписание (скажи "Хотите, я составлю расписание на основе вашего дня?")."""
        
        llm_messages = [
            {"role": "system", "content": secretary_prompt + "\nЗАПРЕЩЕНО предлагать пользователю использовать интерфейс или календарь. Если не можешь выполнить задачу — просто попроси уточнить детали."},
            {"role": "user", "content": text_content},
        ]
        
        async for event in stream_llm_response(
            client=client,
            model="google/gemini-3.1-flash-lite",
            messages=llm_messages,
            temperature=0.5,
            max_tokens=3000,
        ):
            yield event

    except Exception as e:
        print(f"Error in secretary agent stream: {e}")
        yield StreamEvent(type="error", content=f"Извините, произошла ошибка при обработке вашего запроса: {e}")
