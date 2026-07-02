from sqlalchemy.ext.asyncio import AsyncSession
from src.config import client
from src.image_utils import build_llm_user_message

async def process(message: str, system_prompt: str, db: AsyncSession, user_id: int, attachments: list[dict] | None = None) -> tuple[str, int]:
    """
    Process message with Accountant agent.
    Returns: (response_text, tokens_used)
    """
    # Accountant system prompt
    accountant_prompt = """Ты — бухгалтер-ИИ. Твоя задача — помогать с бюджетированием, учетом расходов и финансовым планированием.

Отвечай кратко и по делу. Давай практические советы по управлению финансами."""

    try:
        user_msg = build_llm_user_message(message, attachments)
        messages = [
            {"role": "system", "content": accountant_prompt},
            user_msg if isinstance(user_msg, dict) else {"role": "user", "content": str(user_msg)},
        ]
        response = client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=messages,
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
