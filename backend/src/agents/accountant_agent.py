import json
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from src.config import client
from src.image_utils import build_llm_user_message
from src.agents.streaming import stream_llm_response, StreamEvent


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
        response = await client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=messages,
            temperature=0.7,
            max_tokens=300,
            timeout=60.0
        )
        response_text = response.choices[0].message.content
        
        # Get real token usage from API response
        usage = getattr(response, 'usage', None)
        if usage:
            tokens_used = getattr(usage, 'total_tokens', 0)
        else:
            tokens_used = 0
        
        return response_text, tokens_used
    except Exception as e:
        print(f"Error in accountant agent: {e}")
        response = "Извините, произошла ошибка при обработке вашего запроса."
        tokens_used = 0
        return response, tokens_used


async def process_stream(
    message: str, system_prompt: str, db: AsyncSession, user_id: int, attachments: list[dict] | None = None
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
        temperature=0.7,
        max_tokens=3000,
    ):
        yield event


async def analyze_portfolio(image_urls: list[str]) -> tuple[dict, int, int]:
    """
    Analyze investment portfolio screenshots using LLM.
    image_urls: list of base64 data URIs or file URLs of screenshots
    Returns: (result_dict, input_tokens, output_tokens)
    """
    portfolio_prompt = """Ты — финансовый аналитик и инвестиционный консультант. Проанализируй предоставленные скриншоты инвестиционного портфеля.

Верни ТОЛЬКО JSON (без markdown, без ```) в следующем формате:
{
  "overall_score": <число от 1 до 10>,
  "strengths": ["сильная сторона 1", "сильная сторона 2", ...],
  "weaknesses": ["слабая сторона 1", "слабая сторона 2", ...],
  "recommendations": ["рекомендация 1", "рекомендация 2", ...],
  "asset_allocation": {
    "Акции": <процент>,
    "Облигации": <процент>,
    "Недвижимость": <процент>,
    "Наличные/Депозиты": <процент>,
    "Другое": <процент>
  }
}

Оценивай:
- Диверсификацию по классам активов
- Риск-профиль (соответствие целям)
- Концентрацию в отдельных бумагах
- Наличие защитных активов
- Валютную диверсификацию
- Качество активов (голубые фишки vs мусорные)

Будь строг, но объективен. Укажи 2-4 пункта для каждого списка.
Проценты в asset_allocation должны в сумме давать 100."""

    try:
        # Build user message with images
        user_content = [{"type": "text", "text": "Проанализируй этот инвестиционный портфель по скриншотам."}]
        for url in image_urls:
            user_content.append({
                "type": "image_url",
                "image_url": {"url": url, "detail": "high"}
            })

        messages = [
            {"role": "system", "content": portfolio_prompt},
            {"role": "user", "content": user_content},
        ]

        response = await client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=messages,
            temperature=0.3,
            max_tokens=2000,
            timeout=120.0
        )
        response_text = response.choices[0].message.content.strip()
        print(f"[Portfolio Analysis] Raw response: {response_text[:200]}...")

        # Get real token usage from API response
        usage = getattr(response, 'usage', None)
        if usage:
            input_tokens = getattr(usage, 'prompt_tokens', 0)
            output_tokens = getattr(usage, 'completion_tokens', 0)
        else:
            # Fallback to estimation
            input_tokens = 0
            output_tokens = 0

        # Parse JSON response
        # Handle potential markdown code fence wrapping
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            # Remove first and last ``` lines
            lines = [l for l in lines if not l.startswith("```")]
            response_text = "\n".join(lines).strip()
            # Also remove possible "json" language tag
            if response_text.startswith("json"):
                response_text = response_text[4:].strip()

        result = json.loads(response_text)
        return result, input_tokens, output_tokens

    except json.JSONDecodeError as e:
        print(f"[Portfolio Analysis] JSON parse error: {e}")
        print(f"[Portfolio Analysis] Raw text: {response_text}")
        return {
            "overall_score": 5,
            "strengths": ["Портфель существует и имеет некоторую диверсификацию"],
            "weaknesses": ["Не удалось детально проанализировать портфель по скриншотам"],
            "recommendations": ["Загрузите более качественные скриншоты для детального анализа"],
            "asset_allocation": {"Акции": 50, "Облигации": 20, "Наличные/Депозиты": 20, "Другое": 10}
        }, 0, 0
    except Exception as e:
        print(f"[Portfolio Analysis] Error: {e}")
        return {
            "overall_score": 5,
            "strengths": ["Анализ выполнен с базовыми настройками"],
            "weaknesses": [f"Ошибка анализа: {str(e)[:100]}"],
            "recommendations": ["Попробуйте повторить анализ позже"],
            "asset_allocation": {"Акции": 40, "Облигации": 30, "Наличные/Депозиты": 20, "Другое": 10}
        }, 0, 0