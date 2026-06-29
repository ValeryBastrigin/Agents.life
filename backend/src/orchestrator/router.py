from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from sqlalchemy.orm import selectinload
from src.database import get_db
from src.models import User, Agent, Chat, Message, TokenTransaction, UserDietProfile, FoodConsumption
from datetime import datetime, timedelta, timezone
from src.config import client
from pydantic import BaseModel, ValidationError
from typing import Optional, List
import importlib
import os
import json
import httpx
import base64

router = APIRouter(prefix="/api", tags=["orchestrator"])

# System prompt for the main orchestrator agent "Ixteria"
ORCHESTRATOR_SYSTEM_PROMPT = """Ты — Ixteria, ИИ-оркестратор. Твоя задача — определить, к какому специализированному агенту адресован запрос пользователя, и перенаправить его.

Доступные агенты:
- secretary: секретарь (планирование встреч, расписание, напоминания, организация)
- accountant: бухгалтер (бюджетирование, учет расходов, финансовое планирование)
- dietitian: диетолог (питание, диета, калории, рацион, здоровое питание, похудение, набор массы, витамины, дневник питания, учёт съеденного)
- psychologist: психолог (эмоции, стресс, тревога, настроение, депрессия, отношения, самооценка, поддержка)
- mentor: ментор (карьера, цели, развитие, мотивация, тайм-менеджмент, профессиональный рост)

Если запрос содержит ЛЮБОЕ из следующих слов или фраз — ОБЯЗАТЕЛЬНО верни "secretary":
встреча, запланировать, записать, назначить, расписание, календарь, событие, напоминание, дата, время, когда, завтра, послезавтра, на [день], в [время], создать событие, добавить в календарь.

Если запрос касается питания, диеты, калорий, похудения, набора веса, здорового питания, витаминов, рациона, КБЖУ, продуктов — верни "dietitian".
ЕСЛИ пользователь СООБЩАЕТ что ОН СЪЕЛ/ВЫПИЛ (съел, скушал, поел, выпил, на завтрак, на обед, на ужин, перекусил, запил) — ОБЯЗАТЕЛЬНО верни "dietitian".
Если запрос касается эмоций, стресса, тревоги, настроения, депрессии, отношений, психологии, самооценки — верни "psychologist".
Если запрос касается карьеры, целей, развития, мотивации, тайм-менеджмента, профессионального роста — верни "mentor".
Если запрос относится к бухгалтеру (финансы, бюджет, расходы, деньги, трата, доход, saldo) — верни "accountant".
Если запрос не относится ни к одному из агентов или не понятен — верни "default".

Верни ТОЛЬКО имя агента или "default", без дополнительного текста."""

# System prompt for generating chat titles
TITLE_GENERATION_PROMPT = """Сгенерируй короткий и понятный заголовок для диалога на основе первого сообщения пользователя. 
Заголовок должен быть на русском языке, не длиннее 5 слов, и отражать суть диалога. 
Не используй кавычки. Верни ТОЛЬКО заголовок, без дополнительного текста."""

async def generate_chat_title(first_message: str, client) -> str:
    """Generate a chat title based on the first message using AI."""
    try:
        response = client.chat.completions.create(
            model="moonshotai/kimi-k2.7-code",
            messages=[
                {"role": "system", "content": TITLE_GENERATION_PROMPT},
                {"role": "user", "content": first_message}
            ],
            temperature=0.3,
            max_tokens=50,
            timeout=30.0
        )
        raw_content = response.choices[0].message.content
        if raw_content is None:
            print("Warning: generate_chat_title received None content from LLM")
            return first_message[:50] if first_message else "Новый диалог"
        title = raw_content.strip()
        return title[:50] if title else "Новый диалог"
    except Exception as e:
        print(f"Error generating chat title: {e}")
        return first_message[:50] if first_message else "Новый диалог"

# Pydantic models
class ChatRequest(BaseModel):
    user_id: int
    message: str
    chat_id: Optional[int] = None
    history: Optional[List[dict]] = None

class ChatResponse(BaseModel):
    response: str
    tokens_used: int
    remaining_balance: int
    chat_id: Optional[int] = None

class UserProfile(BaseModel):
    id: int
    username: str
    email: str
    avatar_url: Optional[str]
    token_balance: int
    theme_preference: str

class UpdateThemeRequest(BaseModel):
    theme: str

class DietProfileRequest(BaseModel):
    height: int
    weight: int
    age: int
    gender: str
    goal: str
    activity_level: str
    calorie_target: int
    protein_target: int
    fats_target: int
    carbs_target: int
    water_target: int

class DietProfileResponse(BaseModel):
    height: Optional[int] = None
    weight: Optional[int] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    goal: Optional[str] = None
    activity_level: Optional[str] = None
    calorie_target: Optional[int] = None
    protein_target: Optional[int] = None
    fats_target: Optional[int] = None
    carbs_target: Optional[int] = None
    water_target: Optional[int] = None

# Agent registry - dynamically load agents from /src/agents/
AGENT_REGISTRY = {}

def load_agents():
    agents_dir = os.path.join(os.path.dirname(__file__), '..', 'agents')
    if os.path.exists(agents_dir):
        for filename in os.listdir(agents_dir):
            if filename.endswith('_agent.py') and not filename.startswith('__'):
                module_name = filename[:-3]
                try:
                    module = importlib.import_module(f'src.agents.{module_name}')
                    if hasattr(module, 'process'):
                        agent_name = module_name.replace('_agent', '')
                        AGENT_REGISTRY[agent_name] = module.process
                except Exception as e:
                    print(f"Failed to load agent {module_name}: {e}")

# Load agents on startup
load_agents()

async def route_to_agent(message: str) -> str:
    """Route message to appropriate agent using LLM with keyword fallback."""
    msg_lower = message.lower()
    
    # --- FAST KEYWORD FALLBACK: detect food consumption ---
    food_kw = ["съел", "съела", "поел", "поела", "скушал", "скушала", "выпил", "выпила",
               "позавтракал", "пообедал", "поужинал", "перекусил", "перекусила",
               "на завтрак", "на обед", "на ужин", "на перекус",
               "завтракал", "обедал", "ужинал", "запил", "запила"]
    food_nouns = ["грамм", "порцию", "порция", "рацион", "калори", "кбжу", "белк", "жир", "углевод"]
    
    if any(kw in msg_lower for kw in food_kw) or any(kw in msg_lower for kw in food_nouns):
        print(f"DEBUG: Keyword fallback — routing to dietitian")
        return "dietitian"
    
    # Secretary keywords
    sec_kw = ["встреча", "запланировать", "записать", "назначить", "расписание", "календарь",
              "событие", "напоминание", "напомни"]
    if any(kw in msg_lower for kw in sec_kw):
        print(f"DEBUG: Keyword fallback — routing to secretary")
        return "secretary"
    
    try:
        response = client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=[
                {"role": "system", "content": ORCHESTRATOR_SYSTEM_PROMPT},
                {"role": "user", "content": message}
            ],
            temperature=0.1,
            max_tokens=20,
            timeout=15.0
        )
        raw_content = response.choices[0].message.content
        if raw_content is None:
            print("Warning: route_to_agent received None content from LLM, falling back to default")
            return "default"
        agent_name = raw_content.strip().lower()
        print(f"DEBUG: LLM routing '{message[:50]}...' -> agent: {agent_name}")
        return agent_name if agent_name in AGENT_REGISTRY else "default"
    except Exception as e:
        print(f"Error routing message: {e}")
        return "default"

@router.post("/chat", response_model=ChatResponse)
async def process_chat(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    # Get user
    result = await db.execute(select(User).where(User.id == request.user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check token balance (disabled for development)
    # if user.token_balance < 10:
    #     raise HTTPException(status_code=400, detail="Insufficient token balance")

    # Route message to appropriate agent
    agent_name = await route_to_agent(request.message)

    # Get or create agent
    if agent_name == "default":
        result = await db.execute(select(Agent).where(Agent.name == "agents"))
        agent = result.scalar_one_or_none()
        if not agent:
            agent = Agent(
                name="agents",
                description="Main AI orchestrator and personal assistant",
                system_prompt="Ты — Ixteria, ИИ-управляющий. МАКСИМАЛЬНАЯ ДЛИНА ОТВЕТА: 20 слов. Никаких «Как проходит твой день?» или «Чем могу быть полезен?». Отвечай ТОЛЬКО на суть вопроса. На приветствие: «Привет! Я Ixteria, твой ИИ-управляющий. Чем помочь?». Никакой воды. Кратко. По делу.",
                is_active=True
            )
            db.add(agent)
            await db.flush()
        else:
            # Update system prompt if it's different
            correct_prompt = "Ты — Ixteria, ИИ-управляющий. МАКСИМАЛЬНАЯ ДЛИНА ОТВЕТА: 20 слов. Никаких «Как проходит твой день?» или «Чем могу быть полезен?». Отвечай ТОЛЬКО на суть вопроса. На приветствие: «Привет! Я Ixteria, твой ИИ-управляющий. Чем помочь?». Никакой воды. Кратко. По делу."
            if agent.system_prompt != correct_prompt:
                agent.system_prompt = correct_prompt
                await db.flush()
    else:
        result = await db.execute(select(Agent).where(Agent.name == agent_name))
        agent = result.scalar_one_or_none()
        if not agent:
            # Create agent if it doesn't exist
            agent = Agent(
                name=agent_name,
                description=f"{agent_name.capitalize()} agent",
                system_prompt=f"Ты — {agent_name}, специализированный ИИ-агент.",
                is_active=True
            )
            db.add(agent)
            await db.flush()

    # Create or get chat
    if request.chat_id:
        result = await db.execute(select(Chat).where(Chat.id == request.chat_id))
        chat = result.scalar_one_or_none()
        if not chat:
            # Chat not found, create new one
            chat_title = await generate_chat_title(request.message, client)
            chat = Chat(user_id=request.user_id, agent_id=agent.id, title=chat_title)
            db.add(chat)
            await db.flush()
    else:
        # Generate chat title using AI
        chat_title = await generate_chat_title(request.message, client)
        chat = Chat(user_id=request.user_id, agent_id=agent.id, title=chat_title)
        db.add(chat)
        await db.flush()

    # Save user message
    user_message = Message(chat_id=chat.id, role="user", content=request.message, tokens_used=0)
    db.add(user_message)

    # Process message
    if agent_name in AGENT_REGISTRY:
        # Use specialized agent
        agent_process = AGENT_REGISTRY[agent_name]
        response_text, tokens_used = await agent_process(request.message, agent.system_prompt, db, request.user_id)
    else:
        # Use default LLM mode
        messages = []
        messages.append({"role": "system", "content": agent.system_prompt})
        if request.history:
            messages.extend(request.history)
        messages.append({"role": "user", "content": request.message})

        try:
            response = client.chat.completions.create(
                model="moonshotai/kimi-k2.7-code",
                messages=messages,
                temperature=0.7,
                max_tokens=500,
                timeout=60.0
            )
            response_text = response.choices[0].message.content
            tokens_used = 0  # Disabled for development
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"API error: {str(e)}")

    # --- SAFETY: Ensure response_text is never None before inserting into DB ---
    if response_text is None:
        print("ERROR: response_text is None — LLM returned no content. Inserting fallback message.")
        response_text = "Извините, произошла ошибка при обработке вашего запроса. Попробуйте ещё раз."

    # Save assistant message
    assistant_message = Message(chat_id=chat.id, role="assistant", content=response_text, tokens_used=tokens_used)
    db.add(assistant_message)

    # Deduct tokens (disabled for development)
    # user.token_balance -= tokens_used
    #
    # Record transaction (disabled for development)
    # transaction = TokenTransaction(
    #     user_id=user.id,
    #     amount=-tokens_used,
    #     transaction_type="debit",
    #     description=f"Chat with {agent.name}"
    # )
    # db.add(transaction)

    await db.commit()
    await db.refresh(user)

    return ChatResponse(
        response=response_text,
        tokens_used=tokens_used,
        remaining_balance=user.token_balance,
        chat_id=chat.id
    )

@router.get("/agents")
async def get_agents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Agent).where(Agent.is_active == True))
    agents = result.scalars().all()
    return [{"id": a.id, "name": a.name, "description": a.description} for a in agents]

@router.get("/chats/{chat_id}/messages")
async def get_chat_messages(chat_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Message).where(Message.chat_id == chat_id).order_by(Message.created_at))
    messages = result.scalars().all()
    return [{"role": msg.role, "content": msg.content, "tokens_used": msg.tokens_used} for msg in messages]

@router.get("/user-chats")
async def get_user_chats(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Chat).where(Chat.user_id == user_id).options(selectinload(Chat.agent)).order_by(Chat.created_at.desc())
    )
    chats = result.scalars().all()
    return [{"id": chat.id, "title": chat.title, "agent_name": chat.agent.name if chat.agent else "agents", "created_at": chat.created_at, "is_pinned": chat.is_pinned} for chat in chats]

@router.get("/user/{user_id}", response_model=UserProfile)
async def get_user_profile(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserProfile(
        id=user.id,
        username=user.username,
        email=user.email,
        avatar_url=user.avatar_url,
        token_balance=user.token_balance,
        theme_preference=user.theme_preference
    )

@router.put("/user/{user_id}/theme")
async def update_theme(user_id: int, request: UpdateThemeRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if request.theme not in ["light", "dark"]:
        raise HTTPException(status_code=400, detail="Invalid theme")
    
    user.theme_preference = request.theme
    await db.commit()
    
    return {"message": "Theme updated successfully"}

@router.get("/chats/{user_id}")
async def get_user_chats(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Chat).where(Chat.user_id == user_id).options(selectinload(Chat.agent)).order_by(Chat.updated_at.desc())
    )
    chats = result.scalars().all()
    
    return [
        {
            "id": c.id,
            "title": c.title,
            "agent_name": c.agent.name if c.agent else "agents",
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat()
        }
        for c in chats
    ]

@router.get("/chat/{chat_id}/messages")
async def get_chat_messages(chat_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Message).where(Message.chat_id == chat_id).order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()
    
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "tokens_used": m.tokens_used,
            "created_at": m.created_at.isoformat()
        }
        for m in messages
    ]

@router.delete("/chats/{chat_id}")
async def delete_chat(chat_id: int, db: AsyncSession = Depends(get_db)):
    # Get chat to verify it exists
    result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = result.scalar_one_or_none()

    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Delete chat (cascade will delete messages)
    await db.delete(chat)
    await db.commit()

    return {"message": "Chat deleted successfully"}


@router.put("/chats/{chat_id}/rename")
async def rename_chat(chat_id: int, new_title: str = Body(..., embed=True), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = result.scalar_one_or_none()

    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    chat.title = new_title
    chat.updated_at = func.now()
    await db.commit()
    await db.refresh(chat)

    return {"message": "Chat renamed successfully", "chat": chat}


@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe audio to text using Voxtral via RouterAI."""
    # Validate file type
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="File must be an audio file")

    try:
        content = await file.read()

        # Determine audio format from MIME type
        mime_to_format = {
            "audio/webm": "webm",
            "audio/mp3": "mp3",
            "audio/mpeg": "mp3",
            "audio/wav": "wav",
            "audio/ogg": "ogg",
        }
        audio_format = mime_to_format.get(file.content_type, "webm")

        # Encode audio to base64
        audio_base64 = base64.b64encode(content).decode("utf-8")

        api_key = os.getenv("ROUTER_API_KEY")

        # Voxtral via RouterAI expects JSON with base64-encoded audio
        payload = {
            "model": "mistralai/voxtral-mini-transcribe",
            "input_audio": {
                "data": audio_base64,
                "format": audio_format,
            },
            "language": "ru",
        }

        async with httpx.AsyncClient(timeout=120.0) as http_client:
            response = await http_client.post(
                "https://routerai.ru/api/v1/audio/transcriptions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        if response.status_code != 200:
            print(f"Transcription API error: status={response.status_code}, body={response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Transcription API error: {response.text}",
            )

        result = response.json()
        print(f"Transcription API response: {json.dumps(result, indent=2, ensure_ascii=False)[:500]}")

        # Extract text from Voxtral response
        transcribed_text = result.get("text", "") if isinstance(result, dict) else str(result)
        transcribed_text = transcribed_text.strip()

        if not transcribed_text:
            return JSONResponse(
                content={"text": "", "warning": "No speech detected"},
                status_code=200,
            )

        return {"text": transcribed_text}

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Transcription error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@router.get("/user/{user_id}/diet-profile", response_model=DietProfileResponse)
async def get_diet_profile(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserDietProfile).where(UserDietProfile.user_id == user_id))
    profile = result.scalar_one_or_none()
    
    if not profile:
        return DietProfileResponse()
    
    return DietProfileResponse(
        height=profile.height,
        weight=profile.weight,
        age=profile.age,
        gender=profile.gender,
        goal=profile.goal,
        activity_level=profile.activity_level,
        calorie_target=profile.calorie_target,
        protein_target=profile.protein_target,
        fats_target=profile.fats_target,
        carbs_target=profile.carbs_target,
        water_target=profile.water_target,
    )

@router.put("/user/{user_id}/diet-profile")
async def save_diet_profile(user_id: int, request: DietProfileRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserDietProfile).where(UserDietProfile.user_id == user_id))
    profile = result.scalar_one_or_none()
    
    if profile:
        profile.height = request.height
        profile.weight = request.weight
        profile.age = request.age
        profile.gender = request.gender
        profile.goal = request.goal
        profile.activity_level = request.activity_level
        profile.calorie_target = request.calorie_target
        profile.protein_target = request.protein_target
        profile.fats_target = request.fats_target
        profile.carbs_target = request.carbs_target
        profile.water_target = request.water_target
    else:
        profile = UserDietProfile(
            user_id=user_id,
            height=request.height,
            weight=request.weight,
            age=request.age,
            gender=request.gender,
            goal=request.goal,
            activity_level=request.activity_level,
            calorie_target=request.calorie_target,
            protein_target=request.protein_target,
            fats_target=request.fats_target,
            carbs_target=request.carbs_target,
            water_target=request.water_target,
        )
        db.add(profile)
    
    await db.commit()
    return {"message": "Diet profile saved successfully"}

@router.put("/chats/{chat_id}/pin")
async def toggle_pin_chat(chat_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = result.scalar_one_or_none()

    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    chat.is_pinned = not chat.is_pinned
    chat.updated_at = func.now()
    await db.commit()
    await db.refresh(chat)

    return {"message": "Chat pin status updated", "chat": chat}

# ================== Food Consumption & Diet ==================

@router.get("/user/{user_id}/food-today")
async def get_food_today(user_id: int, db: AsyncSession = Depends(get_db)):
    """Get today's food consumption with totals and profile targets."""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Get today's food items
    result = await db.execute(
        select(FoodConsumption)
        .where(
            FoodConsumption.user_id == user_id,
            FoodConsumption.consumed_at >= today_start
        )
        .order_by(FoodConsumption.consumed_at.desc())
    )
    items = result.scalars().all()
    
    # Get diet profile
    profile_result = await db.execute(
        select(UserDietProfile).where(UserDietProfile.user_id == user_id)
    )
    profile = profile_result.scalar_one_or_none()
    
    items_data = []
    total_cal = 0
    total_protein = 0
    total_fats = 0
    total_carbs = 0
    
    for item in items:
        items_data.append({
            "id": item.id,
            "product_name": item.product_name,
            "grams": item.grams,
            "calories": item.calories,
            "protein": item.protein,
            "fats": item.fats,
            "carbs": item.carbs,
            "meal_type": item.meal_type,
            "consumed_at": item.consumed_at.isoformat() if item.consumed_at else None
        })
        total_cal += item.calories
        total_protein += item.protein
        total_fats += item.fats
        total_carbs += item.carbs
    
    return {
        "items": items_data,
        "totals": {
            "calories": total_cal,
            "protein": total_protein,
            "fats": total_fats,
            "carbs": total_carbs,
            "items_count": len(items_data)
        },
        "profile": {
            "calorie_target": profile.calorie_target if profile else None,
            "protein_target": profile.protein_target if profile else None,
            "fats_target": profile.fats_target if profile else None,
            "carbs_target": profile.carbs_target if profile else None,
            "water_target": profile.water_target if profile else None
        }
    }

@router.get("/user/{user_id}/food-by-date")
async def get_food_by_date(user_id: int, date: str, db: AsyncSession = Depends(get_db)):
    """Get food consumption for a specific date (YYYY-MM-DD)."""
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    day_start = datetime(target_date.year, target_date.month, target_date.day, 0, 0, 0, tzinfo=timezone.utc)
    day_end = datetime(target_date.year, target_date.month, target_date.day, 23, 59, 59, tzinfo=timezone.utc)
    
    result = await db.execute(
        select(FoodConsumption)
        .where(
            FoodConsumption.user_id == user_id,
            FoodConsumption.consumed_at >= day_start,
            FoodConsumption.consumed_at <= day_end
        )
        .order_by(FoodConsumption.consumed_at.asc())
    )
    items = result.scalars().all()
    
    items_data = []
    total_cal = total_protein = total_fats = total_carbs = 0
    
    for item in items:
        items_data.append({
            "id": item.id,
            "product_name": item.product_name,
            "grams": item.grams,
            "calories": item.calories,
            "protein": item.protein,
            "fats": item.fats,
            "carbs": item.carbs,
            "meal_type": item.meal_type,
            "consumed_at": item.consumed_at.isoformat() if item.consumed_at else None
        })
        total_cal += item.calories
        total_protein += item.protein
        total_fats += item.fats
        total_carbs += item.carbs
    
    return {
        "date": date,
        "items": items_data,
        "totals": {
            "calories": total_cal,
            "protein": total_protein,
            "fats": total_fats,
            "carbs": total_carbs,
            "items_count": len(items_data)
        }
    }

@router.get("/user/{user_id}/food-date-range")
async def get_food_date_range(user_id: int, start_date: str, end_date: str, db: AsyncSession = Depends(get_db)):
    """Get food consumption for a date range (YYYY-MM-DD)."""
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    day_start = datetime(start.year, start.month, start.day, 0, 0, 0, tzinfo=timezone.utc)
    day_end = datetime(end.year, end.month, end.day, 23, 59, 59, tzinfo=timezone.utc)
    
    result = await db.execute(
        select(FoodConsumption)
        .where(
            FoodConsumption.user_id == user_id,
            FoodConsumption.consumed_at >= day_start,
            FoodConsumption.consumed_at <= day_end
        )
        .order_by(FoodConsumption.consumed_at.asc())
    )
    items = result.scalars().all()
    
    # Group by date
    by_date = {}
    for item in items:
        dt = item.consumed_at.astimezone(timezone.utc).date().isoformat()
        if dt not in by_date:
            by_date[dt] = {"calories": 0, "protein": 0, "fats": 0, "carbs": 0, "count": 0}
        by_date[dt]["calories"] += item.calories
        by_date[dt]["protein"] += item.protein
        by_date[dt]["fats"] += item.fats
        by_date[dt]["carbs"] += item.carbs
        by_date[dt]["count"] += 1
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "days": {d: by_date[d] for d in sorted(by_date.keys())}
    }

@router.delete("/food/{food_id}")
async def delete_food_item(food_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FoodConsumption).where(FoodConsumption.id == food_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")
    await db.delete(item)
    await db.commit()
    return {"message": "Food item deleted"}
