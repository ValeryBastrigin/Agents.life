from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, cast, Date
from typing import AsyncGenerator
from src.models import CalendarEvent, Reminder, Note
from src.config import client
from src.image_utils import build_llm_user_message
from src.agents.streaming import stream_llm_response, StreamEvent, stream_text_with_delay
from datetime import datetime, timedelta, time, date
import re
import json
import traceback

_schedule_sessions: dict[str, dict] = {}

def _get_session_key(user_id: int) -> str:
    return f"secretary_approval_{user_id}"

def _clear_session(user_id: int):
    key = _get_session_key(user_id)
    _schedule_sessions.pop(key, None)

def _extract_text(message) -> str:
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
    try:
        return datetime.strptime(time_str.strip(), "%H:%M").time()
    except ValueError:
        try:
            return datetime.strptime(time_str.strip(), "%H:%M:%S").time()
        except ValueError:
            return None

async def _parse_date_from_text(text_content: str) -> tuple[date, date, str]:
    today = datetime.now().date()
    msg_lower = text_content.lower()
    
    # Fast checks for common relative terms
    if "послезавтра" in msg_lower:
        start_date = today + timedelta(days=2)
        end_date = start_date + timedelta(days=1)
        return start_date, end_date, "на послезавтра"
    elif "завтра" in msg_lower:
        start_date = today + timedelta(days=1)
        end_date = start_date + timedelta(days=1)
        return start_date, end_date, "на завтра"
    elif "недел" in msg_lower:
        start_date = today
        end_date = today + timedelta(days=7)
        return start_date, end_date, "на неделю"
    elif "сегодня" in msg_lower:
        start_date = today
        end_date = today + timedelta(days=1)
        return start_date, end_date, "на сегодня"

    # Use LLM to accurately extract specific dates (e.g. "6 августа", next Tuesday, etc.) relative to today
    try:
        prompt = f"""Сегодняшняя дата: {today.strftime('%Y-%m-%d')} ({today.strftime('%A')}).
Сообщение пользователя: "{text_content}"

Определи целевую дату, о которой спрашивает пользователь (например, конкретное число и месяц, день недели).
Если дата указана без года, используй текущий или ближайший будущий год.
Верни JSON строго в формате:
{{
  "date": "YYYY-MM-DD",
  "period_title": "на 6 августа"
}}
Если дата не распознана или не указана, верни сегодняшнюю дату ({today.strftime('%Y-%m-%d')}) и "на сегодня".
"""
        response = await client.chat.completions.create(
            model="google/gemini-2.5-flash-lite",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        res = json.loads(response.choices[0].message.content)
        date_str = res.get("date")
        period_title = res.get("period_title", "на указанную дату")
        if date_str:
            parsed_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            start_date = parsed_date
            end_date = parsed_date + timedelta(days=1)
            return start_date, end_date, period_title
    except Exception as e:
        print(f"Error parsing date via LLM: {e}")

    start_date = today
    end_date = today + timedelta(days=1)
    return start_date, end_date, "на сегодня"

async def _classify_message(text_content: str, msg_lower: str, has_image: bool) -> str:
    print(f"DEBUG: Secretary _classify_message received text: '{text_content}', msg_lower: '{msg_lower}'")
    
    # Check for schedule analysis FIRST (so words like "расписание" combined with "проанализируй" trigger analysis, not query)
    if any(kw in msg_lower for kw in ["проанализируй", "проанализировать", "анализ", "оцени", "оценить", "что можешь сказать", "как тебе"]) and any(kw in msg_lower for kw in ["расписани", "план", "график", "день", "сегодня", "завтра", "недел"]):
        print(f"DEBUG: Secretary classifier matched keyword fallback for schedule_analysis!")
        return "schedule_analysis"

    if any(kw in msg_lower for kw in ["какое у меня", "покажи расписание", "список задач", "что по плану", "что у меня на", "какие планы", "расписание на", "планы на"]):
        print(f"DEBUG: Secretary classifier matched keyword fallback for schedule_query!")
        return "schedule_query"

    classify_prompt = f"""Ты — классификатор сообщений для ИИ-секретаря. Определи тип сообщения пользователя.

Сообщение: "{text_content}"
Текущая дата: {datetime.now().strftime('%Y-%m-%d')}

ТИПЫ:
1. "schedule_creation" — пользователь ОПИСЫВАЕТ СВОЙ ОБЫЧНЫЙ ДЕНЬ (распорядок, режим, дела по времени).
2. "schedule_query" — пользователь СПРАШИВАЕТ про существующее расписание/события на конкретный день (просто показать список).
3. "schedule_analysis" — пользователь просит ПРОАНАЛИЗИРОВАТЬ расписание, оценить его, найти риски, дать предложения.
4. "note_creation" — пользователь хочет СОЗДАТЬ ЗАМЕТКУ.
5. "event_creation" — пользователь просит СОЗДАТЬ ОДНО событие/напоминание на конкретную дату.
6. "general" — всё остальное.

Верни ТОЛЬКО JSON с одним полем: {{"tag": "general"}}"""

    try:
        response = await client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=[{"role": "user", "content": classify_prompt}],
            temperature=0.1,
            max_tokens=50
        )
        result = json.loads(response.choices[0].message.content)
        tag = result.get("tag", "general")
        if tag not in ("schedule_creation", "schedule_query", "schedule_analysis", "note_creation", "event_creation", "general"):
            tag = "general"
        return tag
    except Exception as e:
        print(f"Error classifying message: {e}")
        return "general"

async def process(message: str, system_prompt: str, db: AsyncSession, user_id: int, attachments: list[dict] | None = None) -> tuple[str, int]:
    text_content = _extract_text(message)
    msg_lower = text_content.lower().strip()
    has_image = attachments and any(a.get("type") == "image_url" for a in attachments)
    
    tag = await _classify_message(text_content, msg_lower, has_image)
    print(f"DEBUG: Secretary process classified tag as: {tag}")
    
    if tag in ("schedule_query", "schedule_analysis"):
        try:
            start_date, end_date, period_title = await _parse_date_from_text(text_content)

            events_result = await db.execute(
                select(CalendarEvent).where(
                    CalendarEvent.user_id == user_id,
                    cast(CalendarEvent.start_time, Date) >= start_date,
                    cast(CalendarEvent.start_time, Date) < end_date
                ).order_by(CalendarEvent.start_time.asc())
            )
            events = events_result.scalars().all()

            reminders_result = await db.execute(
                select(Reminder).where(
                    Reminder.user_id == user_id,
                    Reminder.date >= start_date,
                    Reminder.date < end_date
                )
            )
            reminders = reminders_result.scalars().all()

            events_list_str = "\n".join([f"- **{e.start_time.strftime('%Y-%m-%d %H:%M')} – {e.end_time.strftime('%H:%M')}**: {e.title} {f'({e.description})' if e.description else ''}" for e in events])
            reminders_list_str = "\n".join([f"- {r.date or ''} {r.time or ''}: {r.title or r.text}" for r in reminders])

            if not events and not reminders:
                return f"📋 Расписания и событий {period_title} нет, составим?", 0

            if tag == "schedule_query":
                query_response = f"📅 **Ваше расписание {period_title}:**\n\n"
                if events:
                    query_response += "**События:**\n" + events_list_str + "\n\n"
                if reminders:
                    query_response += "**Напоминания:**\n" + reminders_list_str
                return query_response.strip(), 0

            llm_eval_prompt = f"""Ты — ИИ-секретарь и эксперт по тайм-менеджменту и продуктивности. Проанализируй расписание пользователя {period_title}.
ВАЖНО: Все данные расписания, события и напоминания пользователя УЖЕ получены из базы данных и приведены ниже. НИ В КОЕМ СЛУЧАЕ не проси у пользователя прислать скриншот или текст расписания — опирайся ТОЛЬКО на предоставленные ниже данные!

События в календаре:
{events_list_str if events else "Нет событий"}

Напоминания:
{reminders_list_str if reminders else "Нет напоминаний"}

Сделай профессиональный, глубокий анализ расписания на русском языке в формате Markdown:
1. **📊 Общая оценка загрузки:** Оцени уровень загруженности (например, сбалансировано, высокая перегрузка, легкий день), плотность встреч.
2. **⚠️ Риски и подводные камни:** Подсвети потенциальные проблемы (например, слишком много встреч подряд без перерыва на обед/отдых, наложение или слишком плотное расписание, риск выгорания или опозданий).
3. **💡 Полезные предложения и рекомендации:** Дай практичные советы (когда сделать перерыв, что перенести, как оптимизировать день).

Отвечай вежливо, структурированно, без лишней воды."""

            eval_response = await client.chat.completions.create(
                model="google/gemini-3.1-flash-lite",
                messages=[{"role": "user", "content": llm_eval_prompt}],
                temperature=0.4,
                max_tokens=1500
            )
            return eval_response.choices[0].message.content, 0
        except Exception as e:
            traceback.print_exc()
            print(f"Error in schedule analysis/query: {e}")
            return "Не удалось получить расписание. Попробуйте еще раз.", 0

    return "Пожалуйста, уточните детали вашего запроса.", 0

async def process_stream(
    message: str,
    system_prompt: str,
    db: AsyncSession,
    user_id: int,
    attachments: list[dict] | None = None,
) -> AsyncGenerator[StreamEvent, None]:
    try:
        text_content = _extract_text(message)
        msg_lower = text_content.lower().strip()
        has_image = attachments and any(a.get("type") == "image_url" for a in attachments)

        tag = await _classify_message(text_content, msg_lower, has_image)
        print(f"DEBUG: Secretary process_stream classified tag as: {tag}")

        if tag in ("schedule_query", "schedule_analysis"):
            start_date, end_date, period_title = await _parse_date_from_text(text_content)

            events_result = await db.execute(
                select(CalendarEvent).where(
                    CalendarEvent.user_id == user_id,
                    cast(CalendarEvent.start_time, Date) >= start_date,
                    cast(CalendarEvent.start_time, Date) < end_date
                ).order_by(CalendarEvent.start_time.asc())
            )
            events = events_result.scalars().all()

            reminders_result = await db.execute(
                select(Reminder).where(
                    Reminder.user_id == user_id,
                    Reminder.date >= start_date,
                    Reminder.date < end_date
                )
            )
            reminders = reminders_result.scalars().all()

            events_list_str = "\n".join([f"- **{e.start_time.strftime('%Y-%m-%d %H:%M')} – {e.end_time.strftime('%H:%M')}**: {e.title} {f'({e.description})' if e.description else ''}" for e in events])
            reminders_list_str = "\n".join([f"- {r.date or ''} {r.time or ''}: {r.title or r.text}" for r in reminders])

            if not events and not reminders:
                analysis_text = f"📋 Расписания и событий {period_title} нет, составим?"
            elif tag == "schedule_query":
                analysis_text = f"📅 **Ваше расписание {period_title}:**\n\n"
                if events:
                    analysis_text += "**События:**\n" + events_list_str + "\n\n"
                if reminders:
                    analysis_text += "**Напоминания:**\n" + reminders_list_str
                analysis_text = analysis_text.strip()
            else:
                llm_eval_prompt = f"""Ты — ИИ-секретарь и эксперт по тайм-менеджменту и продуктивности. Проанализируй расписание пользователя {period_title}.
ВАЖНО: Все данные расписания, события и напоминания пользователя УЖЕ получены из базы данных и приведены ниже. НИ В КОЕМ СЛУЧАЕ не проси у пользователя прислать скриншот или текст расписания — опирайся ТОЛЬКО на предоставленные ниже данные!

События в календаре:
{events_list_str if events else "Нет событий"}

Напоминания:
{reminders_list_str if reminders else "Нет напоминаний"}

Сделай профессиональный, глубокий анализ расписания на русском языке в формате Markdown:
1. **📊 Общая оценка загрузки:** Оцени уровень загруженности (например, сбалансировано, высокая перегрузка, легкий день), плотность встреч.
2. **⚠️ Риски и подводные камни:** Подсвети потенциальные проблемы (например, слишком много встреч подряд без перерыва на обед/отдых, наложение или слишком плотное расписание, риск выгорания или опозданий).
3. **💡 Полезные предложения и рекомендации:** Дай практичные советы (когда сделать перерыв, что перенести, как оптимизировать день).

Отвечай вежливо, структурированно, без лишней воды."""

                eval_response = await client.chat.completions.create(
                    model="google/gemini-3.1-flash-lite",
                    messages=[{"role": "user", "content": llm_eval_prompt}],
                    temperature=0.4,
                    max_tokens=1500
                )
                analysis_text = eval_response.choices[0].message.content

            async for chunk in stream_text_with_delay(analysis_text, chunk_size=2, delay_ms=10):
                yield StreamEvent(type="token", content=chunk)
            yield StreamEvent(type="done", content=analysis_text, metadata={"tokens_used": 0})
            return

        # General stream fallback
        llm_messages = [
            {"role": "system", "content": "Ты — секретарь-ИИ. Помогай с расписанием и организацией."},
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
        traceback.print_exc()
        print(f"Error in secretary agent stream: {e}")
        yield StreamEvent(type="error", content=f"Извините, произошла ошибка: {e}")
