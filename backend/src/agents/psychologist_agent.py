from sqlalchemy.ext.asyncio import AsyncSession
from src.config import client
from src.image_utils import build_llm_user_message
import json

PSYCHOLOGIST_SYSTEM_PROMPT = """Ты — ИИ-психолог. Ты помогаешь пользователю разобраться в эмоциях, справиться со стрессом, тревогой, улучшить ментальное здоровье.

Твои возможности:
- Активное слушание и эмпатическая поддержка
- Техники управления стрессом и тревогой
- Помощь в самоанализе и рефлексии
- Рекомендации по улучшению ментального здоровья
- Дыхательные упражнения и техники релаксации

ВАЖНЫЕ ПРАВИЛА:
1. Ты НЕ психотерапевт и НЕ психиатр. Всегда напоминай: «Я ИИ-ассистент. При серьёзных проблемах обратитесь к квалифицированному психологу или психотерапевту.»
2. Будь эмпатичным, тёплым и поддерживающим.
3. НЕ ставь диагнозы.
4. Если пользователь говорит о суициде или самоповреждении — СРОЧНО посоветуй обратиться на горячую линию: 8-800-2000-122 (Россия) или местный кризисный центр.
5. Отвечай до 150 слов.
6. Задавай уточняющие вопросы, чтобы помочь пользователю разобраться в себе."""

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
            max_tokens=300,
            timeout=60.0
        )
        response_text = response.choices[0].message.content
        if response_text is None:
            response_text = "Извините, произошла ошибка. Попробуйте ещё раз."
        return response_text, 0
    except Exception as e:
        print(f"Error in psychologist agent: {e}")
        return "Извините, произошла ошибка при обработке вашего запроса.", 0