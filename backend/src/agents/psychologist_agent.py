from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.config import client
from src.image_utils import build_llm_user_message
from src.models import Message
from datetime import datetime, timezone
import json

PSYCHOLOGIST_SYSTEM_PROMPT = """Ты — профессиональный ИИ-психолог, специализирующийся на проведении терапевтических сеансов. Твоя главная задача — внимательно выслушать клиента, помочь ему разобраться в своих чувствах и мыслях, и поддержать его на пути к решению проблем.

## Правила ведения сеанса:
1. **Активное слушание** — внимательно читай каждое сообщение, отражай чувства клиента, показывай что ты его понимаешь.
2. **Эмпатия и теплота** — будь доброжелательным, принимающим, не осуждай. Создавай безопасное пространство.
3. **Открытые вопросы** — задавай вопросы, которые помогают клиенту глубже исследовать свои переживания: «Как вы себя чувствуете, когда говорите об этом?», «Что для вас это значит?»
4. **Рефлексия** — периодически резюмируй услышанное, чтобы клиент чувствовал, что его слышат: «Если я правильно понимаю, вас беспокоит то, что...»
5. **Не давай готовых советов** — вместо этого помогай клиенту самому найти решения. Используй техники когнитивно-поведенческой терапии (КПТ) и другие научно обоснованные подходы.
6. **Следи за временем сеанса** — сеанс длится до 1 часа. Ближе к концу мягко подводи итоги.
7. **Завершение сеанса** — когда клиент говорит о завершении или время подходит к концу, подведи краткий итог сеанса: что обсудили, какие инсайты были, что клиент может попробовать сделать до следующей встречи.

## Ограничения и безопасность:
1. Ты НЕ психотерапевт и НЕ психиатр. При необходимости напоминай: «Я ИИ-ассистент. При серьёзных проблемах обратитесь к квалифицированному специалисту.»
2. НЕ ставь диагнозы и не назначай лекарства.
3. Если пользователь говорит о суициде или самоповреждении — НЕМЕДЛЕННО предоставь контакты горячей линии: 8-800-2000-122 (Россия) или местный кризисный центр.
4. Если пользователь просит завершить сеанс — заверши его мягко, подведи итог и попрощайся.

## Стиль общения:
- Говори на русском языке, простым и понятным языком.
- Используй тёплый, поддерживающий тон.
- Отвечай развёрнуто, но не слишком длинно (до 200 слов).
- Используй эмодзи умеренно, только для передачи тепла (💜, 🌿, ✨).
- ⚠️ **ВАЖНО: Никогда не начинай свой ответ с приветствий, прелюдий или вступительных фраз (например «Здравствуйте», «Я внимательно вас слушаю», «Понимаю вас» и т.п.). Приветствие клиента уже сказано в самом начале сеанса. Сразу переходи к сути — отвечай по делу, продолжая терапевтическую беседу.**
- Если клиент не знает с чего начать, помоги наводящими вопросами: «Расскажите, что привело вас сегодня?», «Что вас беспокоит в последнее время?»

Помни: твоя цель — помочь клиенту разобраться в себе, а не решить проблему за него."""

SESSION_WELCOME_MESSAGE = """💜 **Здравствуйте, расскажите, что вас беспокоит?**

Я внимательно выслушаю вас и помогу разобраться в ваших переживаниях. Наш разговор строго конфиденциален — вы можете говорить совершенно открыто.

После завершения сеанса я запишу краткое резюме в раздел **«Ваши сеансы терапий и итоги»**, чтобы вы всегда могли вернуться к нашим обсуждениям.

Расскажите, с чего бы вы хотели начать сегодня? 🌿"""

SUMMARIZATION_PROMPT = """Ты — ИИ-психолог, который подводит итоги завершённого терапевтического сеанса.

Напиши краткое, структурированное резюме сеанса на русском языке на основе диалога между психологом и клиентом.

В резюме включи:
1. **Основная тема сеанса** — что обсуждалось, какая проблема или вопрос были в центре.
2. **Эмоциональное состояние клиента** — какие эмоции проявлял клиент (тревога, грусть, надежда и т.д.).
3. **Ключевые инсайты и выводы** — что клиент осознал, какие важные моменты были выявлены.
4. **Рекомендации и дальнейшие шаги** — что клиент может попробовать сделать для улучшения своего состояния.

Пиши профессионально, но тёплым и поддерживающим тоном. Не используй шаблонные фразы, будь конкретен, основываясь на содержании диалога. Длина резюме — 3-5 предложений."""


async def process(message: str, system_prompt: str, db: AsyncSession, user_id: int, attachments: list[dict] | None = None) -> tuple[str, int]:
    """
    Process message with Psychologist agent.
    Returns: (response_text, tokens_used)
    """
    try:
        user_msg = build_llm_user_message(message, attachments)
        messages = [
            {"role": "system", "content": PSYCHOLOGIST_SYSTEM_PROMPT},
            user_msg if isinstance(user_msg, dict) else {"role": "user", "content": str(user_msg)},
        ]
        response = client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=messages,
            temperature=0.6,
            max_tokens=1000,
            timeout=60.0
        )
        response_text = response.choices[0].message.content
        if response_text is None:
            response_text = "Извините, произошла ошибка. Попробуйте ещё раз."
        return response_text, 0
    except Exception as e:
        print(f"Error in psychologist agent: {e}")
        return "Извините, произошла ошибка при обработке вашего запроса.", 0


async def generate_session_summary(messages_text: str) -> str:
    """
    Generate a summary of a therapy session from pre-formatted messages text.
    """
    try:
        if not messages_text.strip():
            return "Сеанс был начат, но диалог не состоялся."
        
        summarization_messages = [
            {"role": "system", "content": SUMMARIZATION_PROMPT},
            {"role": "user", "content": f"Вот диалог сеанса:\n\n{messages_text}\n\n---\n\nНапиши резюме этого сеанса."}
        ]
        
        response = client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=summarization_messages,
            temperature=0.4,
            max_tokens=500,
            timeout=60.0
        )
        
        summary = response.choices[0].message.content
        if not summary:
            summary = "Не удалось сгенерировать резюме сеанса."
        
        return summary
    except Exception as e:
        print(f"Error generating session summary: {e}")
        return "Произошла ошибка при генерации резюме сеанса."


async def generate_summary(chat_id: int, db: AsyncSession) -> str:
    """
    Generate a summary of a therapy session from chat messages.
    """
    try:
        # Get all messages from the chat
        result = await db.execute(
            select(Message)
            .where(Message.chat_id == chat_id)
            .order_by(Message.created_at.asc())
        )
        messages = result.scalars().all()
        
        if not messages:
            return "Сеанс был начат, но диалог не состоялся."
        
        # Format dialogue for summarization
        dialogue_lines = []
        for msg in messages:
            role = "Клиент" if msg.role == "user" else "Психолог"
            content = msg.content
            if isinstance(content, dict):
                content = content.get("text", str(content))
            elif not isinstance(content, str):
                content = str(content)
            dialogue_lines.append(f"{role}: {content[:500]}")  # limit per message
        
        dialogue_text = "\n\n".join(dialogue_lines)
        
        summarization_messages = [
            {"role": "system", "content": SUMMARIZATION_PROMPT},
            {"role": "user", "content": f"Вот диалог сеанса:\n\n{dialogue_text}\n\n---\n\nНапиши резюме этого сеанса."}
        ]
        
        response = client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=summarization_messages,
            temperature=0.4,
            max_tokens=500,
            timeout=60.0
        )
        
        summary = response.choices[0].message.content
        if not summary:
            summary = "Не удалось сгенерировать резюме сеанса."
        
        return summary
    except Exception as e:
        print(f"Error generating summary: {e}")
        return "Произошла ошибка при генерации резюме сеанса."