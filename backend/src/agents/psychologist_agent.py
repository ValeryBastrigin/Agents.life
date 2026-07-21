from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.config import client
from src.image_utils import build_llm_user_message
from src.agents.streaming import stream_llm_response, StreamEvent
from src.models import Message
from typing import AsyncGenerator


async def generate_summary(chat_id: int, db: AsyncSession) -> str:
    """Generate a therapy session summary from chat messages."""
    result = await db.execute(
        select(Message)
        .where(Message.chat_id == chat_id)
        .order_by(Message.created_at)
    )
    messages = result.scalars().all()

    if not messages:
        return "Сеанс без сообщений."

    conversation_text = ""
    for msg in messages[-50:]:  # last 50 messages for summary
        role_label = "Клиент" if msg.role == "user" else "Психолог"
        conversation_text += f"{role_label}: {msg.content}\n\n"

    summary_prompt = f"""Ты — ИИ-психолог. Составь краткое резюме (3-5 предложений) терапевтического сеанса на основе диалога.

Диалог:
{conversation_text}

Резюме должно отражать:
- Основную тему/проблему, которую обсуждал клиент
- Эмоциональное состояние клиента
- Ключевые инсайты или выводы
- Рекомендации (если уместно)

Ответ напиши на русском языке."""

    try:
        response = await client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=[{"role": "user", "content": summary_prompt}],
            temperature=0.3,
            max_tokens=500,
            timeout=30.0,
        )
        summary = response.choices[0].message.content
        return summary or "Сеанс был завершён."
    except Exception as e:
        print(f"Error generating therapist summary: {e}")
        return "Сеанс был завершён."


async def process(
    message: str, system_prompt: str, db, user_id: int, attachments: list[dict] | None = None
) -> tuple[str, int]:
    """Legacy synchronous interface — aggregates stream for backwards compatibility."""
    full_text = ""
    async for event in process_stream(message, system_prompt, db, user_id, attachments):
        if event.type == "token":
            full_text += event.content
        elif event.type == "done":
            return full_text, event.metadata.get("tokens_used", 0)
    return full_text, 0


async def process_stream(
    message: str, system_prompt: str, db, user_id: int, attachments: list[dict] | None = None
) -> AsyncGenerator[StreamEvent, None]:
    """Streaming version — yields tokens in real time."""
    text_content = message
    if isinstance(message, dict):
        text_content = str(message.get("text", message.get("content", message.get("message", ""))))
    elif isinstance(message, str):
        text_content = message
    else:
        text_content = str(message)

    user_msg = build_llm_user_message(text_content, attachments)
    messages = [
        {"role": "system", "content": system_prompt},
        user_msg if isinstance(user_msg, dict) else {"role": "user", "content": str(user_msg)},
    ]

    async for event in stream_llm_response(
        client=client,
        model="google/gemini-3.1-flash-lite",
        messages=messages,
        temperature=0.5,
        max_tokens=3000,
    ):
        yield event
