from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.models import CalendarEvent, Reminder
from src.config import client
from datetime import datetime, time
import re

async def process(message: str, system_prompt: str, db: AsyncSession, user_id: int) -> tuple[str, int]:
    """
    Process message with Secretary agent.
    Returns: (response_text, tokens_used)
    """
    # Secretary system prompt
    secretary_prompt = """Ты — секретарь-ИИ. Твоя задача — помогать с планированием встреч, расписанием, напоминаниями и организацией.

Если пользователь просит запланировать встречу, создай событие в календаре.
Если пользователь просит создать напоминание, создай напоминание.
Отвечай кратко и по делу."""

    # Check if message is about creating an event or reminder
    message_lower = message.lower()

    # Simple pattern matching for event creation
    if any(keyword in message_lower for keyword in ['встреча', 'встречу', 'планировать', 'запланировать', 'расписание', 'событие']):
        # Try to extract time and title
        # This is a simple implementation - in production, use more sophisticated NLP
        response = "Я понял, что вы хотите запланировать встречу. Пожалуйста, используйте интерфейс календаря для создания событий с точным временем и описанием."
        tokens_used = 0  # Disabled for development
        return response, tokens_used

    # Simple pattern matching for reminder creation
    if any(keyword in message_lower for keyword in ['напомнить', 'напоминание', 'напомни']):
        response = "Я понял, что вы хотите создать напоминание. Пожалуйста, используйте интерфейс календаря для создания напоминаний с точным временем."
        tokens_used = 0  # Disabled for development
        return response, tokens_used

    # Default: use LLM to respond
    try:
        response = client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=[
                {"role": "system", "content": secretary_prompt},
                {"role": "user", "content": message}
            ],
            temperature=0.7,
            max_tokens=300,
            timeout=60.0
        )
        response_text = response.choices[0].message.content
        tokens_used = 0  # Disabled for development
        return response_text, tokens_used
    except Exception as e:
        print(f"Error in secretary agent: {e}")
        response = "Извините, произошла ошибка при обработке вашего запроса."
        tokens_used = 0  # Disabled for development
        return response, tokens_used
