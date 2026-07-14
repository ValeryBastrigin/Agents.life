"""
Billing Service — расчёт стоимости запросов к AI-моделям.

Функция calculate_cost принимает model_id, количество входных/выходных токенов,
минуты аудио (для mistral_audio) и возвращает стоимость в кредитах.
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from .constants import CREDITS_PER_USD
from .pricing_config import MODELS_PRICING, ModelPricing

MILLION: int = 1_000_000


class UnknownModelError(KeyError):
    """Исключение при попытке рассчитать стоимость для неизвестной модели."""

    def __init__(self, model_id: str) -> None:
        self.model_id = model_id
        super().__init__(f"Unknown model_id: '{model_id}'. "
                          f"Supported models: {', '.join(MODELS_PRICING.keys())}")


def _price_per_token(price_per_million: float) -> Decimal:
    """Конвертирует цену за 1M токенов в цену за 1 токен (Decimal)."""
    return Decimal(str(price_per_million)) / Decimal(str(MILLION))


def calculate_cost(
    model_id: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
    audio_minutes: float = 0.0,
    *,
    cache_read_tokens: int = 0,
    cache_write_tokens: int = 0,
    image_count: int = 0,
) -> int:
    """
    Рассчитывает стоимость запроса в кредитах.

    Формула:
        cost_usd = input_price + output_price + cache_read_price
                   + cache_write_price + image_price + audio_price
        credits = round(cost_usd * CREDITS_PER_USD)

    Args:
        model_id: Идентификатор модели (из MODELS_PRICING).
        input_tokens: Количество входных токенов.
        output_tokens: Количество выходных токенов.
        audio_minutes: Длительность аудио в минутах (только mistral_audio).
        cache_read_tokens: Токены чтения из кэша (для Gemin-моделей).
        cache_write_tokens: Токены записи в кэш (для Gemini-моделей).
        image_count: Количество обработанных изображений.

    Returns:
        Стоимость в кредитах (целое число).

    Raises:
        UnknownModelError: Если model_id отсутствует в MODELS_PRICING.
    """
    pricing: Optional[ModelPricing] = MODELS_PRICING.get(model_id)

    if pricing is None:
        raise UnknownModelError(model_id)

    total_usd: Decimal = Decimal("0.0")

    # --- Стандартные токены (input / output) ---
    if input_tokens > 0 and "input_price" in pricing:
        total_usd += _price_per_token(pricing["input_price"]) * Decimal(str(input_tokens))

    if output_tokens > 0 and "output_price" in pricing:
        total_usd += _price_per_token(pricing["output_price"]) * Decimal(str(output_tokens))

    # --- Кэш (Gemini-специфичные поля) ---
    if cache_read_tokens > 0 and "cache_read" in pricing:
        total_usd += _price_per_token(pricing["cache_read"]) * Decimal(str(cache_read_tokens))

    if cache_write_tokens > 0 and "cache_write" in pricing:
        total_usd += _price_per_token(pricing["cache_write"]) * Decimal(str(cache_write_tokens))

    # --- Изображения (Gemini) ---
    if image_count > 0 and "image" in pricing:
        total_usd += _price_per_token(pricing["image"]) * Decimal(str(image_count))

    # --- Аудио (Gemini или mistral_audio) ---
    if audio_minutes > 0.0:
        if "per_minute" in pricing:
            # mistral_audio: цена за минуту напрямую
            total_usd += Decimal(str(pricing["per_minute"])) * Decimal(str(audio_minutes))
        elif "audio" in pricing:
            # Gemini: audio price per 1M units — считаем по токенам
            # audio_minutes интерпретируем как единицы (токены в минуту)
            total_usd += _price_per_token(pricing["audio"]) * Decimal(str(audio_minutes))

    # --- Конвертация в кредиты ---
    credits: Decimal = total_usd * Decimal(str(CREDITS_PER_USD))
    credits = credits.quantize(Decimal("1"), rounding=ROUND_HALF_UP)

    return int(credits)