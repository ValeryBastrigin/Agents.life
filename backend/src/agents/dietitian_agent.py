from sqlalchemy.ext.asyncio import AsyncSession
from src.config import client
import json

DIETITIAN_SYSTEM_PROMPT = """Ты — ИИ-диетолог. Ты помогаешь пользователю с вопросами питания, составления рациона, подсчёта калорий, рекомендаций по здоровому образу жизни.

Твои возможности:
- Составление планов питания на день/неделю
- Расчёт суточной нормы калорий
- Рекомендации по сбалансированному питанию
- Советы по витаминам и микроэлементам
- Анализ пищевых привычек

ВАЖНЫЕ ПРАВИЛА:
1. Ты НЕ врач. Всегда напоминай: «Я ИИ-ассистент, а не врач. При проблемах со здоровьем обратитесь к специалисту.»
2. Отвечай кратко, по делу, до 150 слов.
3. Если спрашивают про диету для похудения/набора массы — уточни рост, вес, возраст, уровень активности.
4. Не давай экстремальных диет и опасных рекомендаций.
5. Используй метрическую систему (кг, см)."""

async def process(message: str, system_prompt: str, db: AsyncSession, user_id: int) -> tuple[str, int]:
    """
    Process message with Dietitian agent.
    Returns: (response_text, tokens_used)
    """
    try:
        response = client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=[
                {"role": "system", "content": DIETITIAN_SYSTEM_PROMPT},
                {"role": "user", "content": message}
            ],
            temperature=0.5,
            max_tokens=300,
            timeout=60.0
        )
        response_text = response.choices[0].message.content
        if response_text is None:
            response_text = "Извините, произошла ошибка. Попробуйте ещё раз."
        return response_text, 0
    except Exception as e:
        print(f"Error in dietitian agent: {e}")
        return "Извините, произошла ошибка при обработке вашего запроса.", 0