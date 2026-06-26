from sqlalchemy.ext.asyncio import AsyncSession
from src.config import client

async def process(message: str, system_prompt: str, db: AsyncSession, user_id: int) -> tuple[str, int]:
    """
    Process message with Accountant agent.
    Returns: (response_text, tokens_used)
    """
    # Accountant system prompt
    accountant_prompt = """Ты — бухгалтер-ИИ. Твоя задача — помогать с бюджетированием, учетом расходов и финансовым планированием.

Отвечай кратко и по делу. Давай практические советы по управлению финансами."""

    try:
        response = client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=[
                {"role": "system", "content": accountant_prompt},
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
        print(f"Error in accountant agent: {e}")
        response = "Извините, произошла ошибка при обработке вашего запроса."
        tokens_used = 0  # Disabled for development
        return response, tokens_used
