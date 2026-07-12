from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.models import CalendarEvent, Reminder, Note
from src.config import client
from src.image_utils import build_llm_user_message
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
        return str(message.get("text", message.get("content", message.get("message", "")))
    elif isinstance(message, str):
        try:
            parsed = json.loads(message)
            if isinstance(parsed, dict):
                return str(parsed.get("text", parsed.get("content", parsed.get("message", "")))
        except (json.JSONDecodeError, TypeError):
            pass
        return message
    return str(message)


async def process(message: str, system_prompt: str, db: AsyncSession, user_id: int, attachments: list[dict] | None = None) -> tuple[str, int]:
    """
    Process message with Secretary agent.
    Returns: (response_text, tokens_used)
    
    Flow:
    1. Check session state (approval flows)
    2. Schedule query (what's on date X?)
    3. Schedule evaluation (image/text of existing schedule → analyze → propose to add)
    4. Schedule creation (user describes routine → extract → present for approval → create)
    5. Note creation
    6. Single event/reminder creation
    7. Default LLM response
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
                breaks = pending.get("breaks", [])
                
                created_events = []
                all_items = tasks + breaks
                for item in all_items:
                    start_time_str = item.get("start_time", "09:00")
                    duration = item.get("duration_hours", 1.0)
                    try:
                        start_dt = datetime.strptime(start_time_str, "%H:%M")
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
                # User wants changes — keep session alive, ask what to change
                _clear_session(user_id)
                return "Понял! Расскажите, что именно нужно изменить в расписании, и я переделаю.", 0
            
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
                    
                    # Parse time — can be "HH:MM" or "HH:MM - HH:MM"
                    try:
                        time_str_clean = re.sub(r'\s+', '', time_str)
                        if '-' in time_str_clean:
                            parts = time_str_clean.split('-')
                            start_dt = datetime.strptime(parts[0], "%H:%M")
                            end_dt = datetime.strptime(parts[1], "%H:%M")
                        else:
                            start_dt = datetime.strptime(time_str_clean, "%H:%M")
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
    # 1. SCHEDULE QUERY — what's on a specific date?
    # ============================================================
    schedule_query_prompt = f"""Проанализируй сообщение. Определи, ХОЧЕТ ли пользователь УЗНАТЬ своё расписание, ИЛИ он просит СОЗДАТЬ/запланировать встречу.

    Сообщение: "{text_content}"
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
        query_data = json.loads(response.choices[0].message.content)
        
        if query_data.get("action") == "query_schedule":
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
        pass

    # ============================================================
    # 2. SCHEDULE EVALUATION — analyze existing schedule (image OR text) 
    #    → give feedback → ask if user wants to add to calendar
    # ============================================================
    
    # --- 2a. Check text for structured schedule patterns ---
    schedule_like_patterns = re.findall(
        r'(\d{1,2}[:.]\d{2})\s*[-–—]+\s*([\w\s]+)',
        text_content
    )
    has_text_schedule = len(schedule_like_patterns) >= 2  # At least 2 time entries look like a schedule
    
    if has_image or has_text_schedule:
        if has_image:
            # Vision-based evaluation
            image_url_parts = []
            for attachment in attachments:
                if attachment.get("type") == "image_url":
                    image_url = attachment.get("image_url", {}).get("url", "")
                    if image_url:
                        image_url_parts.append({"type": "image_url", "image_url": {"url": image_url}})
            
            evaluation_prompt = """Проанализируй расписание на изображении и дай честную оценку.

Твоя задача:
1. Перечисли все найденные дела с указанием времени
2. Оцени сильные стороны расписания (что хорошо)
3. Укажи слабые места (не хватает отдыха, слишком плотно, нет окон для новых дел, и т.д.)
4. Дай рекомендации по улучшению

Верни JSON:
{
    "has_schedule": true или false,
    "schedule_summary": "краткое описание расписания (1-2 предложения)",
    "strengths": ["сильная сторона 1", "сильная сторона 2"],
    "weaknesses": ["слабое место 1", "слабое место 2"],
    "recommendations": ["рекомендация 1", "рекомендация 2"],
    "schedule_details": [
        {"title": "Название дела", "time": "HH:MM или HH:MM-HH:MM", "description": "опционально"}
    ]
}

Если нет расписания — has_schedule: false, остальные поля пустыми массивами.
Верни ТОЛЬКО JSON."""
            
            image_url_parts.append({"type": "text", "text": evaluation_prompt})
            
            try:
                response = client.chat.completions.create(
                    model="google/gemini-2.0-flash-exp",
                    messages=[{"role": "user", "content": image_url_parts}],
                    temperature=0.3,
                    max_tokens=800
                )
                eval_data = json.loads(response.choices[0].message.content)
            except Exception as e:
                print(f"Error in vision evaluation: {e}")
                return "Не удалось проанализировать изображение. Попробуйте отправить ещё раз или опишите текстом.", 0
        
        else:
            # Text-based evaluation
            eval_prompt = f"""Проанализируй текстовое расписание пользователя и дай оценку.

Расписание:
{text_content}

Твоя задача:
1. Перечисли все дела с временем
2. Оцени сильные стороны
3. Укажи слабые места
4. Дай рекомендации

Верни JSON:
{{
    "has_schedule": true,
    "schedule_summary": "краткое описание расписания",
    "strengths": ["сильная сторона 1"],
    "weaknesses": ["слабое место 1"],
    "recommendations": ["рекомендация 1"],
    "schedule_details": [
        {{"title": "Название дела", "time": "HH:MM или HH:MM-HH:MM", "description": "опционально"}}
    ]
}}
Верни ТОЛЬКО JSON."""
            
            try:
                response = client.chat.completions.create(
                    model="google/gemini-3.1-flash-lite",
                    messages=[{"role": "user", "content": eval_prompt}],
                    temperature=0.3,
                    max_tokens=800
                )
                eval_data = json.loads(response.choices[0].message.content)
            except Exception as e:
                print(f"Error in text schedule evaluation: {e}")
                return "Не удалось проанализировать расписание. Попробуйте описать его более структурированно.", 0
        
        if eval_data.get("has_schedule", False):
            summary = eval_data.get("schedule_summary", "")
            strengths = eval_data.get("strengths", [])
            weaknesses = eval_data.get("weaknesses", [])
            recommendations = eval_data.get("recommendations", [])
            details = eval_data.get("schedule_details", [])
            
            response_text = "📋 **Анализ вашего расписания:**\n\n"
            response_text += f"{summary}\n\n"
            
            if strengths:
                response_text += "✅ **Сильные стороны:**\n"
                for s in strengths:
                    response_text += f"• {s}\n"
                response_text += "\n"
            
            if weaknesses:
                response_text += "⚠️ **Слабые места:**\n"
                for w in weaknesses:
                    response_text += f"• {w}\n"
                response_text += "\n"
            
            if recommendations:
                response_text += "💡 **Рекомендации:**\n"
                for r in recommendations:
                    response_text += f"• {r}\n"
                response_text += "\n"
            
            response_text += "Хотите, чтобы я внёс это расписание в ваш календарь? Скажите «да»."
            
            # Save session state for approval
            _schedule_sessions[session_key] = {
                "action": "await_approval_evaluation",
                "data": {"schedule_details": details}
            }
            
            return response_text, 0
        else:
            return "Я не нашёл информации о расписании в вашем сообщении. Опишите пожалуйста ваши дела с указанием времени, или пришлите скриншот.", 0

    # ============================================================
    # 3. SCHEDULE CREATION — user describes their routine
    #    → extract tasks → present for approval → wait for "yes"
    # ============================================================
    schedule_creation_keywords = ['расписание', 'планируй', 'составь график', 'как провести день',
                                   'занятия', 'дела', 'время', 'во сколько', 'после работы',
                                   'обыденное время', 'идеальное расписание', 'достигать целей',
                                   'режим дня', 'мой день', 'распорядок', 'график']
    
    task_keywords = ['работаю', 'учусь', 'занимаюсь', 'делаю', 'завтракаю', 'обедаю',
                     'ужинаю', 'сплю', 'встаю', 'иду', 'домой', 'гуляю', 'читаю',
                     'тренируюсь', 'уроки', 'проект', 'задачи', 'план',
                     'подъём', 'подъем', 'просыпаюсь', 'ложусь', 'выхожу',
                     'прихожу', 'возвращаюсь', 'моюсь', 'душ', 'ванна',
                     'чищу зубы', 'чистка зубов', 'зарядка', 'утренняя',
                     'вечерняя', 'работа', 'учёба', 'учеба', 'институт',
                     'университет', 'школа', 'колледж']
    
    has_schedule_creation_intent = any(kw in msg_lower for kw in schedule_creation_keywords)
    has_task_description = any(kw in msg_lower for kw in task_keywords)
    
    # Also check if message is long enough to be a routine description (>= 5 words with time mentions)
    time_mentions = re.findall(r'\b(\d{1,2})\s*(?:час|ч|:)\b', text_content)
    is_long_routine = len(text_content.split()) >= 15 and len(time_mentions) >= 2
    
    if has_schedule_creation_intent or (has_task_description and len(text_content.split()) >= 10) or is_long_routine:
        schedule_extraction_prompt = f"""Проанализируй сообщение пользователя и извлеки все дела, время и продолжительность.

Сообщение: "{text_content}"

Создай ИДЕАЛЬНОЕ индивидуальное расписание на ОДИН день (сегодня). Добавь перерывы на еду, отдых и свободные блоки.

Верни JSON:
{{
    "tasks": [
        {{"title": "Название дела", "start_time": "HH:MM", "duration_hours": 1.0, "description": "опционально"}}
    ],
    "breaks": [
        {{"title": "Обед / Перерыв", "start_time": "HH:MM", "duration_hours": 0.5}}
    ],
    "free_time": [
        {{"start_time": "HH:MM", "end_time": "HH:MM", "description": "Свободное время"}}
    ]
}}

ПРАВИЛА:
- Если время не указано, распределяй равномерно с 7:00 до 23:00
- Продолжительность по умолчанию 1 час, если не указано
- ОБЯЗАТЕЛЬНО добавь: завтрак (~30 мин), обед (~1 час), ужин (~30 мин)
- Оставь хотя бы 2 свободных блока по 1-2 часа для новых дел
- Не делай расписание слишком плотным — оставляй 15-30 минут между делами
- Учитывай режим: подъём утром, отбой вечером
- Верни ТОЛЬКО JSON."""
        
        try:
            response = client.chat.completions.create(
                model="google/gemini-3.1-flash-lite",
                messages=[{"role": "user", "content": schedule_extraction_prompt}],
                temperature=0.4,
                max_tokens=1200
            )
            schedule_data = json.loads(response.choices[0].message.content)
            
            tasks = schedule_data.get("tasks", [])
            breaks = schedule_data.get("breaks", [])
            free_time = schedule_data.get("free_time", [])
            
            # Present proposed schedule to user
            response_text = "📋 **Вот какое расписание я предлагаю:**\n\n"
            
            if tasks:
                response_text += "📌 **Дела:**\n"
                for t in tasks:
                    name = t.get("title", "Дело")
                    start = t.get("start_time", "—")
                    dur = t.get("duration_hours", 1)
                    end_h = datetime.strptime(start, "%H:%M") + timedelta(hours=dur) if start != "—" else None
                    end_str = end_h.strftime("%H:%M") if end_h else "—"
                    response_text += f"• {start} – {end_str}: {name}\n"
                response_text += "\n"
            
            if breaks:
                response_text += "☕ **Перерывы:**\n"
                for b in breaks:
                    name = b.get("title", "Перерыв")
                    start = b.get("start_time", "—")
                    dur = b.get("duration_hours", 0.5)
                    end_h = datetime.strptime(start, "%H:%M") + timedelta(hours=dur) if start != "—" else None
                    end_str = end_h.strftime("%H:%M") if end_h else "—"
                    response_text += f"• {start} – {end_str}: {name}\n"
                response_text += "\n"
            
            if free_time:
                response_text += "🕐 **Свободное время:**\n"
                for ft in free_time:
                    start = ft.get("start_time", "—")
                    end = ft.get("end_time", "—")
                    desc = ft.get("description", "")
                    response_text += f"• {start} – {end}: {desc}\n"
                response_text += "\n"
            
            response_text += "Всё верно? Скажите **«да»** чтобы создать расписание, или опишите что изменить."
            
            # Save pending data for approval
            _schedule_sessions[session_key] = {
                "action": "await_approval_schedule",
                "data": {"tasks": tasks, "breaks": breaks}
            }
            
            return response_text, 0
            
        except Exception as e:
            print(f"Error extracting schedule: {e}")
            return "Не удалось составить расписание. Опишите, пожалуйста, ваши дела подробнее.", 0

    # ============================================================
    # 4. NOTE CREATION
    # ============================================================
    note_keywords = ['заметк', 'запиши заметк', 'создай заметк', 'надикт', 'note',
                     'добавь заметк', 'напомни заметк']
    if any(kw in msg_lower for kw in note_keywords):
        note_extraction_prompt = f"""Пользователь хочет создать заметку. Выдели из сообщения суть, придумай краткий заголовок (до 60 символов) и оформи содержимое заметки.
        Сообщение: "{text_content}"

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
    # 5. SINGLE EVENT/REMINDER CREATION
    # ============================================================
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
        response = client.chat.completions.create(
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
        pass

    # ============================================================
    # 6. DEFAULT LLM RESPONSE
    # ============================================================
    create_keywords = ['назначь', 'создай', 'запланируй', 'запиши', 'добавь', 'поставь',
                       'schedule', 'create', 'add', 'set up', 'book']
    if any(kw in msg_lower for kw in create_keywords):
        return "Уточните дату и время для создания записи.", 0

    secretary_prompt = """Ты — секретарь-ИИ. Твоя задача — помогать с планированием встреч, расписанием, напоминаниями и организацией.
    
    Если пользователь просит запланировать встречу, создать событие или напоминание — извлеки данные и создай.
    Если пользователь описывает свой распорядок дня — составь расписание на одобрение.
    Отвечай кратко и по делу."""
    
    try:
        user_msg = build_llm_user_message(text_content, attachments)
        messages = [
            {"role": "system", "content": secretary_prompt + "\nЗАПРЕЩЕНО предлагать пользователю использовать интерфейс или календарь. Если не можешь выполнить задачу — просто попроси уточнить детали."},
            user_msg if isinstance(user_msg, dict) else {"role": "user", "content": str(user_msg)},
        ]
        response = client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=messages,
            temperature=0.5,
            max_tokens=2000,
            timeout=60.0
        )
        response_text = response.choices[0].message.content
        
        if "интерфейс" in response_text.lower() or "календарь" in response_text.lower():
            return "Пожалуйста, уточните детали встречи или напоминания, чтобы я мог их создать.", 0
            
        return response_text, 0
    except Exception as e:
        print(f"Error in secretary agent: {e}")
        return "Извините, произошла ошибка при обработке вашего запроса.", 0
