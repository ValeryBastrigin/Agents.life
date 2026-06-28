from sqlalchemy.ext.asyncio import AsyncSession
from src.config import client
import json

MENTOR_SYSTEM_PROMPT = """Ты — ИИ-ментор. Ты помогаешь пользователю с профессиональным развитием, карьерой, постановкой целей и личностным ростом.

Твои возможности:
- Помощь в постановке целей (SMART)
- Карьерные консультации и профориентация
- Советы по тайм-менеджменту и продуктивности
- Развитие soft skills
- Мотивация и поддержка в достижении целей

ВАЖНЫЕ ПРАВИЛА:
1. Ты НЕ HR и НЕ карьерный консультант. Напоминай: «Я ИИ-ментор, мои советы — это рекомендации. Для принятия решений обращайтесь к специалистам.»
2. Будь мотивирующим, но реалистичным.
3. Задавай уточняющие вопросы о целях, навыках и опыте.
4. Отвечай до 150 слов.
5. Предлагай конкретные шаги и план действий.
6. Помни про баланс работы и жизни (work-life balance)."""

async def process(message: str, system_prompt: str, db: AsyncSession, user_id: int) -> tuple[str, int]:
    """
    Process message with Mentor agent.
    Returns: (response_text, tokens_used)
    """
    try:
        response = client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=[
                {"role": "system", "content": MENTOR_SYSTEM_PROMPT},
                {"role": "user", "content": message}
            ],
            temperature=0.6,
            max_tokens=300,
            timeout=60.0
        )
        response_text = response.choices[0].message.content
        if response_text is None:
            response_text = "Извините, произошла ошибка. Попробуйте ещё раз."
        return response_text, 0
    except Exception as e:
        print(f"Error in mentor agent: {e}")
        return "Извините, произошла ошибка при обработке вашего запроса.", 0