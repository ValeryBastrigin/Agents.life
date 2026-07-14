"""
Pricing Registry — реестр стоимости моделей.

Все цены указаны в USD за 1 миллион единиц (токенов, пикселей, секунд и т.д.),
кроме mistral_audio (цена за 1 минуту).

Для добавления новой модели достаточно добавить запись в MODELS_PRICING
и, при необходимости, указать модель в SUPPORTED_MODELS.
"""

from typing import Dict, Literal, TypedDict


class ModelPricing(TypedDict, total=False):
    """Структура ценообразования для модели."""

    input_price: float       # цена входных токенов за 1M
    output_price: float      # цена выходных токенов за 1M
    cache_read: float        # цена чтения из кэша за 1M
    cache_write: float       # цена записи в кэш за 1M
    image: float             # цена за изображение за 1M
    audio: float             # цена аудио за 1M
    thought: float           # цена "мышления" за 1M
    per_minute: float        # цена за минуту (mistral_audio)


# Pricing Data (USD per 1M units, except per_minute)
MODELS_PRICING: Dict[str, ModelPricing] = {
    "gemini_3_1_flash": {
        "input_price": 0.313,
        "output_price": 1.945,
        "cache_read": 0.0325,
        "cache_write": 0.104,
        "image": 0.00026,
        "audio": 0.639,
        "thought": 1.950,
    },
    "gemini_2_5_flash": {
        "input_price": 0.1175,
        "output_price": 0.5090,
        "cache_read": 0.0130,
        "cache_write": 0.1044,
        "image": 0.00013,
        "audio": 0.3785,
        "thought": 0.5200,
    },
    "openai_embedding": {
        "input_price": 0.026,
    },
    "mistral_audio": {
        "per_minute": 0.003915,
    },
}

# Список поддерживаемых model_id для быстрой проверки
ModelId = Literal[
    "gemini_3_1_flash",
    "gemini_2_5_flash",
    "openai_embedding",
    "mistral_audio",
]

SUPPORTED_MODELS = tuple(MODELS_PRICING.keys())