from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import AsyncGenerator
from src.config import client
from src.image_utils import build_vision_message_parts, attachment_to_image_url, is_image_attachment
from src.models import UserDietProfile, FoodConsumption, DietPlan
from src.agents.streaming import stream_llm_response, StreamEvent, stream_text_with_delay
from datetime import datetime, timedelta, timezone
import json
import re

DIETITIAN_SYSTEM_PROMPT = """Ты — ИИ-диетолог. Ты помогаешь пользователю с вопросами питания, составления рациона, подсчёта калорий, рекомендаций по здоровому образу жизни.

Твои возможности:
- Составление планов питания на день/неделю
- Расчёт суточной нормы калорий
- Рекомендации по сбалансированному питанию
- Советы по витаминам и микроэлементам
- Анализ пищевых привычек
- Добавление съеденных продуктов в дневник питания

ВАЖНЫЕ ПРАВИЛА:
1. Ты НЕ врач. Всегда напоминай: «Я ИИ-ассистент, а не врач. При проблемах со здоровьем обратитесь к специалисту.»
2. Отвечай кратко, по делу, до 150 слов.
3. Если пользователь настроил свой профиль — используй его данные (рост, вес, возраст, цель, КБЖУ) для персональных рекомендаций. НЕ переспрашивай то, что уже известно из профиля.
4. Не давай экстремальных диет и опасных рекомендаций.
5. Используй метрическую систему (кг, см)."""

GOAL_LABELS = {"lose": "похудение", "gain": "набор массы", "maintain": "поддержание веса"}
ACTIVITY_LABELS = {
    "sedentary": "сидячий", "light": "лёгкий", "moderate": "умеренный",
    "active": "активный", "veryActive": "очень активный"
}

MEAL_EMOJIS = {"breakfast": "🌅", "lunch": "☀️", "dinner": "🌙", "snack": "🍪", "other": "🍽️"}

MEAL_PLAN_SYSTEM_PROMPT = """Ты — ИИ-диетолог по составлению персональных рационов питания.

Пользователь просит составить рацион на день. Твоя задача — сгенерировать полноценный план питания, включив завтрак, обед, ужин и перекус.

ПРАВИЛА:
1. Блюда должны быть разнообразными, вкусными и сбалансированными по КБЖУ.
2. Учитывай пожелания пользователя.
3. Если известен профиль пользователя — используй его данные для калорийности.
4. Каждое блюдо должно иметь название, краткое описание и КБЖУ.

ОТВЕТЬ СТРОГО В ФОРМАТЕ JSON (без markdown-разметки, без комментариев, только валидный JSON):
{
  "meals": [
    {
      "type": "breakfast",
      "dishes": [
        { "name": "Название блюда", "description": "Краткое описание", "calories": "ккал", "protein": "г", "fats": "г", "carbs": "г" }
      ]
    },
    {
      "type": "lunch",
      "dishes": [
        { "name": "Название блюда", "description": "Краткое описание", "calories": "ккал", "protein": "г", "fats": "г", "carbs": "г" }
      ]
    },
    {
      "type": "dinner",
      "dishes": [
        { "name": "Название блюда", "description": "Краткое описание", "calories": "ккал", "protein": "г", "fats": "г", "carbs": "г" }
      ]
    },
    {
      "type": "snack",
      "dishes": [
        { "name": "Название блюда", "description": "Краткое описание", "calories": "ккал", "protein": "г", "fats": "г", "carbs": "г" }
      ]
    }
  ]
}

В каждом блоке может быть НЕСКОЛЬКО блюд (2-3). Не ограничивайся одним блюдом на приём пищи."""
MEAL_LABELS = {"breakfast": "Завтрак", "lunch": "Обед", "dinner": "Ужин", "snack": "Перекус", "other": "Приём пищи"}


def _build_profile_context(profile: UserDietProfile | None) -> str:
    """Build personalised profile context string."""
    if profile:
        return f"""

ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ (уже настроен, НЕ переспрашивай эти данные):
- Рост: {profile.height} см
- Вес: {profile.weight} кг
- Возраст: {profile.age} лет
- Пол: {'мужской' if profile.gender == 'male' else 'женский'}
- Цель: {GOAL_LABELS.get(profile.goal, profile.goal)}
- Уровень активности: {ACTIVITY_LABELS.get(profile.activity_level, profile.activity_level)}
- Целевая норма калорий: {profile.calorie_target} ккал/день
- Норма белков: {profile.protein_target} г/день
- Норма жиров: {profile.fats_target} г/день
- Норма углеводов: {profile.carbs_target} г/день
- Норма воды: {profile.water_target} стаканов/день

Используй эти данные во всех расчётах и рекомендациях. Не спрашивай рост, вес, возраст и цели повторно — они уже известны."""
    else:
        return "\n\nПользователь ещё не настроил свой профиль. Если он спрашивает про диету или похудение — попроси его настроить профиль в разделе «Настройте агента под вас» на странице диетолога, чтобы получить персональные расчёты КБЖУ."


async def _detect_meal_plan_intent(message: str) -> bool:
    """
    Determine if the user is asking to GENERATE a meal/diet plan (рацион).
    """
    prompt = f"""Определи, просит ли пользователь СОСТАВИТЬ РАЦИОН ПИТАНИЯ / ПЛАН ПИТАНИЯ на день.
    
Примеры ДА (meal plan):
- "составь план питания на день"
- "рацион на сегодня"
- "сгенерируй меню на день"
- "что мне съесть сегодня?"
- "составь рацион"
- "план питания"
- "меню на день"
- "персональный план питания" 
- "составь персональный план питания на 1 день"

Примеры НЕТ (не meal plan):
- "съел шоколадку"
- "сколько калорий в яблоке"
- "какая норма калорий?"
- "удали пюре из рациона"
- "привет"
- "спасибо"

Сообщение: "{message}"

Верни ТОЛЬКО одно слово: "да" или "нет"."""
    try:
        response = await client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=10,
            timeout=15.0
        )
        result = (response.choices[0].message.content or "").strip().lower()
        return "да" in result
    except Exception as e:
        print(f"Error detecting meal plan intent: {e}")
        # Fallback: keyword check
        meal_plan_kw = ["составь", "сгенерируй", "рацион", "план питания", "меню на день", "питания на день"]
        msg_lower = message.lower()
        return any(kw in msg_lower for kw in meal_plan_kw)


async def _detect_food_intent(message: str) -> bool:
    """
    Use Gemini to determine if the message is about logging food consumption.
    Returns True if user is telling what they ate/drank.
    """
    prompt = f"""Определи, сообщает ли пользователь о том, ЧТО ОН СЪЕЛ или ВЫПИЛ (добавление еды в дневник питания).

Примеры ДА (food log):
- "съел шоколадный пончик из пятёрочки"
- "на завтрак была овсянка с бананом"
- "выпил колу без сахара 0.5"
- "съел 300 грамм вареных макарон, 200 грамм вареной грудки"
- "я пообедал супом и салатом"
- "перекусил яблоком"
- "запил кефиром"

Примеры НЕТ (не food log):
- "какая норма калорий для мужчины 30 лет?"
- "составь план питания на неделю"
- "полезно ли есть яйца каждый день?"
- "как похудеть на 5 кг?"
- "сколько белка мне нужно?"
- "привет"
- "спасибо"
- "удали пюре из рациона"
- "убери шоколадный пончик"

Сообщение: "{message}"

Верни ТОЛЬКО одно слово: "да" или "нет"."""
    try:
        response = await client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=10,
            timeout=15.0
        )
        result = (response.choices[0].message.content or "").strip().lower()
        return "да" in result
    except Exception as e:
        print(f"Error detecting food intent: {e}")
        # Fallback: check for russian food keywords
        food_kw = ["съел", "съела", "поел", "поела", "скушал", "скушала", "выпил", "выпила",
                   "позавтракал", "пообедал", "поужинал", "перекусил", "перекусила",
                   "на завтрак", "на обед", "на ужин", "на перекус",
                   "завтракал", "обедал", "ужинал", "грамм", "порцию", "порция"]
        msg_lower = message.lower()
        return any(kw in msg_lower for kw in food_kw)


async def _detect_food_delete_intent(message: str) -> bool:
    """
    Determine if the user wants to DELETE food from their consumption log.
    """
    delete_kw = ["удали", "убрать", "убери", "удалить", "вычеркни", "сотри", "убери"]
    msg_lower = message.lower()
    has_delete = any(kw in msg_lower for kw in delete_kw)
    
    if not has_delete:
        return False
    
    # Check if food-related
    food_nouns = ["рацион", "продукт", "еду", "съеден", "блюдо", "пюре", "суп", "каш", "салат", 
                  "пончик", "булк", "хлеб", "мяс", "куриц", "рыб", "яблок", "банан", "шоколад",
                  "конфет", "торт", "пирож", "печен", "молок", "кефир", "йогурт", "творог",
                  "макарон", "греч", "рис", "овсян", "яйц", "колбас", "сосиск", "котлет",
                  "напиток", "сок", "кол", "чай", "кофе", "вода", "компот"]
    
    return any(kw in msg_lower for kw in food_nouns)


async def _extract_delete_target(message: str) -> str | None:
    """
    Extract the food product name to delete from a delete command.
    """
    prompt = f"""Извлеки название продукта/блюда, которое пользователь ХОЧЕТ УДАЛИТЬ из своего рациона.

Примеры:
- "удали пюре быстрого приготовления из рациона" → "пюре быстрого приготовления"
- "убери шоколадный пончик" → "шоколадный пончик"
- "сотри куриную грудку" → "куриная грудка"
- "вычеркни колу без сахара" → "кола без сахара"

Сообщение: "{message}"

Верни ТОЛЬКО название продукта, без лишних слов. Если не можешь определить — верни "null"."""
    try:
        response = await client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=50,
            timeout=10.0
        )
        raw = (response.choices[0].message.content or "").strip()
        if raw.lower() == "null" or raw.lower() == "none" or raw == "":
            return None
        return raw
    except Exception as e:
        print(f"Error extracting delete target: {e}")
        return None


async def _handle_food_delete(message: str, db: AsyncSession, user_id: int) -> tuple[str, int]:
    """
    Handle a food deletion request:
    1. Extract the target product name
    2. Find matching items in today's consumption
    3. Delete and return confirmation
    """
    target = await _extract_delete_target(message)
    
    if not target:
        return (
            "Не понял, какой именно продукт нужно удалить. Уточните, например: «удали шоколадный пончик из рациона».",
            0,
        )
    
    # Search for matching items in today's consumption
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(FoodConsumption).where(
            FoodConsumption.user_id == user_id,
            FoodConsumption.consumed_at >= today_start
        )
    )
    items = result.scalars().all()
    
    if not items:
        return "У вас нет записей о питании за сегодня.", 0
    
    # Fuzzy match: find items that contain the target product name
    target_lower = target.lower().strip()
    matched = []
    
    for item in items:
        item_name_lower = item.product_name.lower()
        # Check if target is contained in product name or vice versa
        if target_lower in item_name_lower or item_name_lower in target_lower:
            matched.append(item)
    
    # If no exact substring match, try word-by-word match
    if not matched:
        target_words = set(target_lower.split())
        for item in items:
            item_words = set(item.product_name.lower().split())
            common = target_words & item_words
            if len(common) >= max(1, len(target_words) // 2):  # At least half of words match
                matched.append(item)
    
    if not matched:
        # List today's items to help user
        item_names = [f"• {item.product_name} ({item.grams}г, {item.calories} ккал)" for item in items]
        names_text = "\n".join(item_names)
        return (
            f"Не нашёл «{target}» в сегодняшнем рационе. Вот что у вас за сегодня:\n{names_text}\n\nУточните, какой именно продукт удалить.",
            0,
        )
    
    if len(matched) == 1:
        item = matched[0]
        name = item.product_name
        cal = item.calories
        await db.delete(item)
        await db.commit()
        return (
            f"✅ Удалил «{name}» ({item.grams}г, {cal} ккал) из сегодняшнего рациона.",
            0,
        )
    
    # Multiple matches — ask user to clarify
    item_list = "\n".join([f"• {it.product_name} ({it.grams}г, {it.calories} ккал)" for it in matched])
    return (
        f"Нашлось несколько продуктов похожих на «{target}»:\n{item_list}\n\nУточните, какой именно удалить.",
        0,
    )


async def _extract_food_items(message: str) -> list[dict]:
    """
    Extract food items with grams and meal type from user message.
    Returns list of dicts with keys: product, grams (int or None), meal_type.
    """
    prompt = f"""Извлеки из сообщения пользователя ВСЕ продукты/блюда/напитки, которые он употребил.

Для КАЖДОГО продукта определи:
- "product" — название продукта/блюда (строка)
- "grams" — количество в граммах (целое число), если пользователь ЯВНО указал граммовку. Если не указал — null.
- "meal_type" — приём пищи: "breakfast" / "lunch" / "dinner" / "snack" / "other"

ПРАВИЛА:
1. "0.5" рядом с напитком обычно означает 0.5 литра = 500 мл/грамм. "кола 0.5" → grams=500.
2. Если написано "стакан" — НЕ угадывай граммы, ставь null.
3. Если написано "тарелка", "порция", "немного", "кусочек" без цифр — ставь null.
4. Извлекай ВСЕ продукты из сообщения, даже если их много (как в перечислении через запятую).
5. Не придумывай продукты, которых нет в сообщении.

Сообщение: "{message}"

Верни ТОЛЬКО JSON-массив:
[{{"product": "...", "grams": 300, "meal_type": "lunch"}}, ...]"""
    try:
        response = await client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=500,
            timeout=20.0
        )
        raw = (response.choices[0].message.content or "").strip()
        # Try to extract JSON array from response
        json_match = re.search(r'\[.*\]', raw, re.DOTALL)
        if json_match:
            items = json.loads(json_match.group())
            return items
        return []
    except Exception as e:
        print(f"Error extracting food items: {e}")
        return []


async def _search_kbju(product_name: str) -> dict | None:
    """
    Search the web for KBJU of a product per 100 grams.
    Uses Gemini with web search capability to find accurate KBJU data.
    Returns dict with keys: calories, protein, fats, carbs (all per 100g), or None.
    """
    search_prompt = f"""Найди в интернете точную пищевую ценность продукта "{product_name}" на 100 грамм.

Ты ДОЛЖЕН найти реальные данные по КБЖУ для этого продукта. Используй свои знания о пищевой ценности продуктов.

Верни ТОЛЬКО JSON (без форматирования, одной строкой):
{{"calories_per_100g": число, "protein_per_100g": число, "fats_per_100g": число, "carbs_per_100g": число, "source": "краткое описание источника данных"}}

Если продукт составной (например, "шоколадный пончик из пятёрочки") — оцени КБЖУ по составу (мука, шоколад, сахар, масло), укажи примерные значения.
Если продукт — напиток с нулевой калорийностью (например, "кола без сахара", "cola zero") — calories_per_100g = 0, всё остальное = 0.
Если НЕВОЗМОЖНО определить КБЖУ — верни {{"error": "не удалось найти"}}.

ВАЖНО: все числа должны быть ЦЕЛЫМИ (округляй)."""
    try:
        response = await client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=[{"role": "user", "content": search_prompt}],
            temperature=0.2,
            max_tokens=300,
            timeout=25.0
        )
        raw = (response.choices[0].message.content or "").strip()
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            if "error" in data:
                return None
            return data
        return None
    except Exception as e:
        print(f"Error searching KBJU for '{product_name}': {e}")
        return None


async def _get_today_totals(db: AsyncSession, user_id: int) -> dict:
    """Get today's total KBJU from DB."""
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(
            func.coalesce(func.sum(FoodConsumption.calories), 0),
            func.coalesce(func.sum(FoodConsumption.protein), 0),
            func.coalesce(func.sum(FoodConsumption.fats), 0),
            func.coalesce(func.sum(FoodConsumption.carbs), 0),
            func.count(FoodConsumption.id)
        ).where(
            FoodConsumption.user_id == user_id,
            FoodConsumption.consumed_at >= today_start
        )
    )
    row = result.one()
    return {
        "calories": int(row[0]),
        "protein": int(row[1]),
        "fats": int(row[2]),
        "carbs": int(row[3]),
        "items_count": int(row[4])
    }


async def _handle_meal_plan(message: str, db: AsyncSession, user_id: int, profile: UserDietProfile | None) -> tuple[str, int]:
    """
    Handle meal plan request — return a widget with button redirecting to /dietitian/plan
    where user can create their meal plan.
    """
    # Build a friendly response with a go_to_meal_plan widget
    widget = {
        "type": "go_to_meal_plan",
        "text": "Я сформирую для вас индивидуальный план питания с учётом ваших параметров, целей и предпочтений. Нажмите кнопку ниже, чтобы перейти в раздел создания рациона — там я подберу блюда специально для вас! 🥗"
    }
    
    return json.dumps(widget, ensure_ascii=False), 0


async def generate_meal_plan(message: str, db: AsyncSession, user_id: int) -> tuple[str, int]:
    """
    Public function: Generate a meal plan and save it to DietPlan table.
    1. Loads user diet profile
    2. Calls _handle_meal_plan with the message (preferences from user)
    3. If result is JSON with type: "meal_plan", saves to DietPlan table
    Returns: (response_text_with_widget, tokens_used)
    """
    try:
        # Load user diet profile
        result = await db.execute(
            select(UserDietProfile).where(UserDietProfile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()

        # Combine preferences with profile context
        response_text, tokens_used = await _handle_meal_plan(message, db, user_id, profile)

        # Try to extract JSON and save to DietPlan if valid meal_plan
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            try:
                parsed = json.loads(json_match.group())
                if parsed.get("type") == "meal_plan" and "meals" in parsed:
                    # Save/update DietPlan in DB
                    result = await db.execute(
                        select(DietPlan).where(DietPlan.user_id == user_id)
                    )
                    existing_plan = result.scalar_one_or_none()
                    if existing_plan:
                        existing_plan.plan_data = json.dumps(parsed, ensure_ascii=False)
                    else:
                        new_plan = DietPlan(user_id=user_id, plan_data=json.dumps(parsed, ensure_ascii=False))
                        db.add(new_plan)
                    await db.commit()
                    print(f"DEBUG: Saved meal plan to DietPlan for user {user_id}")
            except (json.JSONDecodeError, Exception) as e:
                print(f"DEBUG: Failed to save meal plan to DietPlan: {e}")

        return response_text, tokens_used
    except Exception as e:
        print(f"Error in generate_meal_plan: {e}")
        return "Ошибка генерации рациона. Пожалуйста, попробуйте ещё раз.", 0


async def process(message: str, system_prompt: str, db: AsyncSession, user_id: int, attachments: list[dict] | None = None) -> tuple[str, int]:
    """
    Process message with Dietitian agent.
    Handles both general diet questions AND food consumption logging.
    attachments: optional list of file attachments (images etc.)
    Returns: (response_text, tokens_used)
    """
    try:
        # Load user diet profile from DB
        result = await db.execute(
            select(UserDietProfile).where(UserDietProfile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()

        # Detect if user is asking to generate a meal plan (check FIRST)
        is_meal_plan = await _detect_meal_plan_intent(message)
        if is_meal_plan:
            print(f"DEBUG: Detected meal plan intent — generating with 2000 max_tokens")
            return await _handle_meal_plan(message, db, user_id, profile)

        # Detect if this is a food DELETE command
        is_food_delete = await _detect_food_delete_intent(message)
        if is_food_delete:
            return await _handle_food_delete(message, db, user_id)

        # Detect if this is a food consumption log
        is_food_log = await _detect_food_intent(message)

        # If there are image attachments, always pass them to LLM for analysis
        has_images = any(
            str(a.get("type") or a.get("content_type") or "").startswith("image/")
            or str(a.get("url", "")).startswith("/uploads/")
            or str(a.get("url", "")).startswith("data:image/")
            for a in (attachments or [])
        )

        if is_food_log or has_images:
            return await _handle_food_log(message, db, user_id, profile, attachments)

        # Regular dietitian chat
        user_context = _build_profile_context(profile)
        
        # Build LLM messages - include images if present
        llm_messages = [{"role": "system", "content": DIETITIAN_SYSTEM_PROMPT + user_context}]
        
        # Use shared image_utils to build content with images
        vision_parts = build_vision_message_parts(message, attachments)
        if len(vision_parts) == 1 and vision_parts[0]["type"] == "text":
            llm_messages.append({"role": "user", "content": vision_parts[0]["text"]})
        else:
            llm_messages.append({"role": "user", "content": vision_parts})

        response = await client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=llm_messages,
            temperature=0.5,
            max_tokens=1000,
            timeout=60.0
        )
        response_text = response.choices[0].message.content
        if response_text is None:
            response_text = "Извините, произошла ошибка. Попробуйте ещё раз."
        return response_text, 0
    except Exception as e:
        print(f"Error in dietitian agent: {e}")
        return "Извините, произошла ошибка при обработке вашего запроса.", 0


async def process_stream(
    message: str,
    system_prompt: str,
    db: AsyncSession,
    user_id: int,
    attachments: list[dict] | None = None,
) -> AsyncGenerator[StreamEvent, None]:
    """
    Streaming version of process().
    Yields StreamEvent tokens in real time instead of returning a full response.
    """
    try:
        # Load user diet profile from DB
        result = await db.execute(
            select(UserDietProfile).where(UserDietProfile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()

        # Detect if user is asking to generate a meal plan (check FIRST)
        is_meal_plan = await _detect_meal_plan_intent(message)
        if is_meal_plan:
            widget_text, _ = await _handle_meal_plan(message, db, user_id, profile)
            # Widget responses should be atomic (sent as one token)
            yield StreamEvent(type="widget", content=widget_text)
            yield StreamEvent(type="done", content=widget_text, metadata={"tokens_used": 0})
            return

        # Detect if this is a food DELETE command
        is_food_delete = await _detect_food_delete_intent(message)
        if is_food_delete:
            text, _ = await _handle_food_delete(message, db, user_id)
            # Stream the response with delay for natural feel
            async for chunk in stream_text_with_delay(text, chunk_size=1, delay_ms=20):
                yield StreamEvent(type="token", content=chunk)
            yield StreamEvent(type="done", content=text, metadata={"tokens_used": 0})
            return

        # Detect if this is a food consumption log
        is_food_log = await _detect_food_intent(message)

        # If there are image attachments, always pass them to LLM for analysis
        has_images = any(
            str(a.get("type") or a.get("content_type") or "").startswith("image/")
            or str(a.get("url", "")).startswith("/uploads/")
            or str(a.get("url", "")).startswith("data:image/")
            for a in (attachments or [])
        )

        if is_food_log or has_images:
            response_text, _ = await _handle_food_log(message, db, user_id, profile, attachments)
            # Check if response is JSON widget
            try:
                parsed = json.loads(response_text)
                if isinstance(parsed, dict) and "type" in parsed:
                    yield StreamEvent(type="widget", content=response_text)
                    yield StreamEvent(type="done", content=response_text, metadata={"tokens_used": 0})
                    return
            except json.JSONDecodeError:
                pass
            # Stream the response with delay for natural feel
            async for chunk in stream_text_with_delay(response_text, chunk_size=1, delay_ms=20):
                yield StreamEvent(type="token", content=chunk)
            yield StreamEvent(type="done", content=response_text, metadata={"tokens_used": 0})
            return

        # Regular dietitian chat — real SSE streaming
        user_context = _build_profile_context(profile)
        llm_messages = [{"role": "system", "content": DIETITIAN_SYSTEM_PROMPT + user_context}]

        vision_parts = build_vision_message_parts(message, attachments)
        if len(vision_parts) == 1 and vision_parts[0]["type"] == "text":
            llm_messages.append({"role": "user", "content": vision_parts[0]["text"]})
        else:
            llm_messages.append({"role": "user", "content": vision_parts})

        async for event in stream_llm_response(
            client=client,
            model="google/gemini-3.1-flash-lite",
            messages=llm_messages,
            temperature=0.5,
            max_tokens=1000,
        ):
            yield event

    except Exception as e:
        print(f"Error in dietitian agent stream: {e}")
        yield StreamEvent(type="error", content=f"Извините, произошла ошибка при обработке вашего запроса: {e}")


async def _handle_food_log(message: str, db: AsyncSession, user_id: int, profile: UserDietProfile | None, attachments: list[dict] | None = None) -> tuple[str, int]:
    """
    Handle a food consumption log request:
    1. Extract food items from message (or from image if present)
    2. Search KBJU for each item
    3. If grams missing and not found — ask user
    4. Save to DB and return JSON widget
    """
    # If there are image attachments, first use LLM to analyze the image and extract food info
    has_images = any(
        str(a.get("type") or a.get("content_type") or "").startswith("image/")
        or str(a.get("url", "")).startswith("/uploads/")
        or str(a.get("url", "")).startswith("data:image/")
        for a in (attachments or [])
    )

    if has_images:
        image_prompt = f"""Пользователь отправил изображение еды. Проанализируй фото и определи ЧТО это за еда.
        
Текст пользователя: "{message}"

Если на фото еда — опиши её. Если пользователь написал что-то вроде "съел это" — запиши продукт.
Если на фото НЕТ еды — просто опиши что на фото.

ВАЖНО: Если на фото тарелка с едой — определи название блюда/продуктов и примерный вес порции.
Не выдумывай, если не видишь содержимое чётко — так и напиши.

Верни краткое описание того, что видно на фото (1-2 предложения)."""

        # Use shared image_utils to build content with images
        vision_parts = build_vision_message_parts(image_prompt, attachments)
        
        try:
            vision_response = await client.chat.completions.create(
                model="google/gemini-3.1-flash-lite",
                messages=[{"role": "user", "content": vision_parts}],
                temperature=0.3,
                max_tokens=300,
                timeout=30.0
            )
            vision_text = vision_response.choices[0].message.content or ""
            # Use vision description as the message for food extraction
            enriched_message = f"{message}\n\n(На фото: {vision_text})"
            print(f"DEBUG: Vision analysis result: {vision_text}")
            return await _handle_food_log_text(enriched_message, db, user_id, profile)
        except Exception as e:
            print(f"Error in vision analysis: {e}")
            # Fall back to text-only extraction
            return await _handle_food_log_text(message, db, user_id, profile)
    
    # No images - use text only
    return await _handle_food_log_text(message, db, user_id, profile)


async def _handle_food_log_text(message: str, db: AsyncSession, user_id: int, profile: UserDietProfile | None) -> tuple[str, int]:
    """Handle food log from text message only (extract, lookup KBJU, save)."""
    # Step 1: Extract food items from message
    items = await _extract_food_items(message)

    if not items:
        return "Не удалось распознать продукты в сообщении. Пожалуйста, укажите, что именно вы съели, например: «съел овсянку на молоке, 250 грамм».", 0

    # Step 2: For each item, find KBJU
    items_with_kbju = []
    missing_grams = []

    for item in items:
        product = item["product"]
        grams = item.get("grams")
        meal_type = item.get("meal_type", "other")

        # Search KBJU per 100g
        kbju = await _search_kbju(product)

        if kbju is None:
            missing_grams.append({"product": product, "reason": "не удалось найти КБЖУ"})
            continue

        # If user didn't provide grams, try to estimate from product name
        if grams is None:
            grams = await _estimate_portion(product)

        if grams is None or grams == 0:
            missing_grams.append({"product": product, "reason": "не указаны граммы"})
            continue

        # Calculate KBJU for the consumed amount
        cal_per_100 = kbju["calories_per_100g"]
        prot_per_100 = kbju["protein_per_100g"]
        fats_per_100 = kbju["fats_per_100g"]
        carbs_per_100 = kbju["carbs_per_100g"]

        factor = grams / 100.0
        total_cal = round(cal_per_100 * factor)
        total_prot = round(prot_per_100 * factor)
        total_fats = round(fats_per_100 * factor)
        total_carbs = round(carbs_per_100 * factor)

        # Save to DB
        consumption = FoodConsumption(
            user_id=user_id,
            product_name=product,
            grams=grams,
            calories=total_cal,
            protein=total_prot,
            fats=total_fats,
            carbs=total_carbs,
            meal_type=meal_type,
            consumed_at=datetime.now(timezone.utc)
        )
        db.add(consumption)

        items_with_kbju.append({
            "product": product,
            "grams": grams,
            "calories": total_cal,
            "protein": total_prot,
            "fats": total_fats,
            "carbs": total_carbs,
            "meal_type": meal_type,
        })

    # If nothing was saved and there are missing items — return plain text question
    if not items_with_kbju and missing_grams:
        msg = "Не могу добавить продукты:\n"
        for m in missing_grams:
            if "КБЖУ" in m["reason"]:
                msg += f"• {m['product']} — не удалось найти пищевую ценность. Уточните продукт или укажите КБЖУ вручную.\n"
            else:
                msg += f"• {m['product']} — не указан вес в граммах. Укажите, сколько грамм вы съели.\n"
        return msg, 0

    # If some were saved but some missing — show JSON + plain text warning
    if missing_grams and items_with_kbju:
        await db.commit()
        today_totals = await _get_today_totals(db, user_id)

        prof_dict = None
        if profile:
            prof_dict = {
                "calorie_target": profile.calorie_target,
                "protein_target": profile.protein_target,
                "fats_target": profile.fats_target,
                "carbs_target": profile.carbs_target,
                "water_target": profile.water_target,
            }

        totals = {
            "calories": sum(i["calories"] for i in items_with_kbju),
            "protein": sum(i["protein"] for i in items_with_kbju),
            "fats": sum(i["fats"] for i in items_with_kbju),
            "carbs": sum(i["carbs"] for i in items_with_kbju),
        }

        widget = {
            "type": "food_log",
            "items": items_with_kbju,
            "totals": totals,
            "today_totals": today_totals,
            "profile": prof_dict,
        }

        missing_text = "\n\n⚠️ Не добавлены (уточните):\n"
        for m in missing_grams:
            if "КБЖУ" in m["reason"]:
                missing_text += f"• {m['product']} — не удалось найти КБЖУ\n"
            else:
                missing_text += f"• {m['product']} — укажите граммовку\n"

        return json.dumps(widget, ensure_ascii=False) + missing_text, 0

    # All items saved successfully
    await db.commit()
    today_totals = await _get_today_totals(db, user_id)

    prof_dict = None
    if profile:
        prof_dict = {
            "calorie_target": profile.calorie_target,
            "protein_target": profile.protein_target,
            "fats_target": profile.fats_target,
            "carbs_target": profile.carbs_target,
            "water_target": profile.water_target,
        }

    totals = {
        "calories": sum(i["calories"] for i in items_with_kbju),
        "protein": sum(i["protein"] for i in items_with_kbju),
        "fats": sum(i["fats"] for i in items_with_kbju),
        "carbs": sum(i["carbs"] for i in items_with_kbju),
    }

    widget = {
        "type": "food_log",
        "items": items_with_kbju,
        "totals": totals,
        "today_totals": today_totals,
        "profile": prof_dict,
    }

    return json.dumps(widget, ensure_ascii=False), 0


async def _estimate_portion(product_name: str) -> int | None:
    """Try to estimate typical portion size in grams for a product using Gemini."""
    prompt = f"""Оцени ТИПИЧНУЮ порцию продукта "{product_name}" в граммах.

Правила:
- Для напитков ("кола", "сок", "чай", "кефир", "молоко"): стандартная порция — 250 г (стакан), если не указано иное.
- Для фруктов ("яблоко", "банан", "апельсин"): средний вес одного фрукта (яблоко ~180г, банан ~120г, апельсин ~200г).
- Для выпечки ("пончик", "булочка", "круассан"): средний вес одной штуки (пончик ~80г, булочка ~100г, круассан ~70г).
- Для хлеба ("тост", "кусок хлеба"): один кусок ~30г.
- Для конфет/шоколада ("конфета", "шоколадка"): одна конфета ~15г, маленькая шоколадка ~50г.
- Для готовых блюд ("суп", "салат", "каша"): стандартная порция ~250-300г.
- Для перекусов ("орехи", "чипсы"): горсть ~30г, маленький пакетик ~50г.
- Если не можешь определить — верни null.

Верни ТОЛЬКО число (граммы) или null."""
    try:
        response = await client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=20,
            timeout=10.0
        )
        raw = (response.choices[0].message.content or "").strip().lower()
        if raw == "null" or raw == "none" or raw == "":
            return None
        nums = re.findall(r'\d+', raw)
        if nums:
            return int(nums[0])
        return None
    except Exception as e:
        print(f"Error estimating portion for '{product_name}': {e}")
        return None


def _format_meal_summary(items: list[dict], profile: UserDietProfile | None) -> str:
    """Format a human-readable meal summary."""
    if not items:
        return ""

    # Group by meal type
    by_meal = {}
    for item in items:
        mt = item.get("meal_type", "other")
        by_meal.setdefault(mt, []).append(item)

    lines = ["🍽️ *Добавлено в дневник:*"]
    for mt in ["breakfast", "lunch", "dinner", "snack", "other"]:
        if mt in by_meal:
            emoji = MEAL_EMOJIS.get(mt, "🍽️")
            label = MEAL_LABELS.get(mt, "")
            lines.append(f"\n{emoji} {label}:")
            for item in by_meal[mt]:
                lines.append(
                    f"  • {item['product']} — {item['grams']}г "
                    f"({item['calories']} ккал, Б:{item['protein']} Ж:{item['fats']} У:{item['carbs']})"
                )

    # Totals
    total_cal = sum(i["calories"] for i in items)
    total_prot = sum(i["protein"] for i in items)
    total_fats = sum(i["fats"] for i in items)
    total_carbs = sum(i["carbs"] for i in items)

    lines.append(f"\n━━━━━━━━━━━━━━━━")
    lines.append(f"✅ Всего: {total_cal} ккал | Б:{total_prot}г Ж:{total_fats}г У:{total_carbs}г")

    return "\n".join(lines)