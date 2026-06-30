from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
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
import asyncio
import re

router = APIRouter(prefix="/api")

# --- Constants for the orchestrator ---
ORCHESTRATOR_SYSTEM_PROMPT = """You are a router AI. Decide which specialist agent to use.
Options: dietitian (food/nutrition), secretary (scheduling/notes/reminders), psychologist (mental), mentor (learning/career), accountant (finance).
For general conversation reply with "default".
Respond ONLY with the agent name. No explanation."""

TITLE_GENERATION_PROMPT = """Generate a short (max 5 words) chat title in Russian based on user's first message.
Title should be clear and concise. Return ONLY the title, no quotes, no explanation."""

# --- Pydantic models ---
class ChatRequest(BaseModel):
    user_id: int
    message: str
    chat_id: Optional[int] = None
    history: Optional[List[dict]] = None
    agent: Optional[str] = None  # 'orchestrator', 'secretary', etc.

class ChatResponse(BaseModel):
    response: str
    tokens_used: int
    remaining_balance: int
    chat_id: Optional[int] = None

class UpdateThemeRequest(BaseModel):
    theme: str

class UserProfile(BaseModel):
    id: int
    username: str
    email: Optional[str]
    avatar_url: Optional[str]
    token_balance: int
    theme_preference: str
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
    
    # --- FAST KEYWORD FALLBACK: detect food deletion ---
    delete_food_kw = ["удали", "убрать", "убери", "удалить", "убери", "вычеркни", "сотри"]
    if any(kw in msg_lower for kw in delete_food_kw) and ("рацион" in msg_lower or "продукт" in msg_lower or "еду" in msg_lower or "съеден" in msg_lower or "блюдо" in msg_lower or "пюре" in msg_lower or "суп" in msg_lower or "каш" in msg_lower or "салат" in msg_lower or "питани" in msg_lower):
        print(f"DEBUG: Keyword fallback — routing food deletion to dietitian")
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

async def generate_chat_title(first_message: str, client) -> str:
    """Generate a chat title from the first message."""
    try:
        response = client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=[
                {"role": "system", "content": TITLE_GENERATION_PROMPT},
                {"role": "user", "content": first_message}
            ],
            temperature=0.3,
            max_tokens=50,
            timeout=30.0
        )
        title = response.choices[0].message.content
        if title:
            return title.strip()[:80]
        return "New Chat"
    except Exception:
        return "New Chat"

# ======================== EXISTING ENDPOINTS ========================

@router.post("/chat", response_model=ChatResponse)
async def process_chat(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    # Get user
    result = await db.execute(select(User).where(User.id == request.user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

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
                model="google/gemini-3.1-flash-lite",
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

    await db.commit()
    await db.refresh(user)

    return ChatResponse(
        response=response_text,
        tokens_used=tokens_used,
        remaining_balance=user.token_balance,
        chat_id=chat.id
    )

# ======================== OTHER ENDPOINTS (unchanged) ========================

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

        if not transcribed_text:
            raise HTTPException(status_code=400, detail="Transcription result is empty")

        return {"text": transcribed_text}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


# ======================== FOOD / DIET ENDPOINTS ========================

@router.get("/user/{user_id}/diet-profile")
async def get_diet_profile(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserDietProfile).where(UserDietProfile.user_id == user_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Diet profile not found")
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "height": profile.height,
        "weight": profile.weight,
        "age": profile.age,
        "gender": profile.gender,
        "goal": profile.goal,
        "activity_level": profile.activity_level,
        "calorie_target": profile.calorie_target,
        "protein_target": profile.protein_target,
        "fats_target": profile.fats_target,
        "carbs_target": profile.carbs_target,
        "water_target": profile.water_target,
    }

@router.put("/user/{user_id}/diet-profile")
async def update_diet_profile(user_id: int, data: dict = Body(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserDietProfile).where(UserDietProfile.user_id == user_id))
    profile = result.scalar_one_or_none()
    if profile:
        for key in ["height", "weight", "age", "gender", "goal", "activity_level",
                     "calorie_target", "protein_target", "fats_target", "carbs_target", "water_target"]:
            if key in data:
                setattr(profile, key, data[key])
    else:
        profile = UserDietProfile(user_id=user_id, **{k: data.get(k) for k in [
            "height", "weight", "age", "gender", "goal", "activity_level",
            "calorie_target", "protein_target", "fats_target", "carbs_target", "water_target"
        ]})
        db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return {"id": profile.id, "message": "Diet profile saved"}

@router.get("/user/{user_id}/food-today")
async def get_food_today(user_id: int, db: AsyncSession = Depends(get_db)):
    today = datetime.now(timezone.utc).date()
    result = await db.execute(
        select(FoodConsumption)
        .where(FoodConsumption.user_id == user_id)
        .where(func.date(FoodConsumption.consumed_at) == today)
        .order_by(FoodConsumption.consumed_at.desc())
    )
    items = result.scalars().all()
    
    # Calculate totals
    totals = {"calories": 0, "protein": 0, "fats": 0, "carbs": 0}
    for item in items:
        totals["calories"] += item.calories or 0
        totals["protein"] += item.protein or 0
        totals["fats"] += item.fats or 0
        totals["carbs"] += item.carbs or 0
    
    # Try to get diet profile for targets
    profile_result = await db.execute(select(UserDietProfile).where(UserDietProfile.user_id == user_id))
    profile = profile_result.scalar_one_or_none()
    profile_data = {
        "calorie_target": profile.calorie_target if profile else 2000,
        "protein_target": profile.protein_target if profile else 120,
        "fats_target": profile.fats_target if profile else 65,
        "carbs_target": profile.carbs_target if profile else 250,
        "water_target": profile.water_target if profile else 8,
    }
    
    return {
        "totals": totals,
        "profile": profile_data,
        "items": [
            {
                "id": item.id,
                "product_name": item.product_name,
                "grams": item.grams,
                "calories": item.calories,
                "protein": item.protein,
                "fats": item.fats,
                "carbs": item.carbs,
                "meal_type": item.meal_type,
                "notes": item.notes,
                "consumed_at": item.consumed_at.isoformat() if item.consumed_at else None,
            }
            for item in items
        ],
    }

@router.get("/user/{user_id}/food-by-date")
async def get_food_by_date(user_id: int, date: str, db: AsyncSession = Depends(get_db)):
    target_date = datetime.strptime(date, "%Y-%m-%d").date()
    result = await db.execute(
        select(FoodConsumption)
        .where(FoodConsumption.user_id == user_id)
        .where(func.date(FoodConsumption.consumed_at) == target_date)
        .order_by(FoodConsumption.consumed_at.desc())
    )
    items = result.scalars().all()
    
    # Calculate totals
    totals = {"calories": 0, "protein": 0, "fats": 0, "carbs": 0}
    for item in items:
        totals["calories"] += item.calories or 0
        totals["protein"] += item.protein or 0
        totals["fats"] += item.fats or 0
        totals["carbs"] += item.carbs or 0
    
    return {
        "totals": totals,
        "items": [
            {
                "id": item.id,
                "product_name": item.product_name,
                "grams": item.grams,
                "calories": item.calories,
                "protein": item.protein,
                "fats": item.fats,
                "carbs": item.carbs,
                "meal_type": item.meal_type,
                "notes": item.notes,
                "consumed_at": item.consumed_at.isoformat() if item.consumed_at else None,
            }
            for item in items
        ],
    }

@router.get("/user/{user_id}/food-date-range")
async def get_food_date_range(user_id: int, start_date: str, end_date: str, db: AsyncSession = Depends(get_db)):
    start = datetime.strptime(start_date, "%Y-%m-%d").date()
    end = datetime.strptime(end_date, "%Y-%m-%d").date()
    result = await db.execute(
        select(FoodConsumption)
        .where(FoodConsumption.user_id == user_id)
        .where(func.date(FoodConsumption.consumed_at) >= start)
        .where(func.date(FoodConsumption.consumed_at) <= end)
        .order_by(FoodConsumption.consumed_at.desc())
    )
    items = result.scalars().all()
    
    # Group by date and compute per-day totals
    days = {}
    for item in items:
        if item.consumed_at:
            date_key = item.consumed_at.strftime("%Y-%m-%d")
        else:
            date_key = "unknown"
        if date_key not in days:
            days[date_key] = {"calories": 0, "protein": 0, "fats": 0, "carbs": 0, "count": 0}
        days[date_key]["calories"] += item.calories or 0
        days[date_key]["protein"] += item.protein or 0
        days[date_key]["fats"] += item.fats or 0
        days[date_key]["carbs"] += item.carbs or 0
        days[date_key]["count"] += 1
    
    return {
        "days": days,
        "items": [
            {
                "id": item.id,
                "product_name": item.product_name,
                "grams": item.grams,
                "calories": item.calories,
                "protein": item.protein,
                "fats": item.fats,
                "carbs": item.carbs,
                "meal_type": item.meal_type,
                "notes": item.notes,
                "consumed_at": item.consumed_at.isoformat() if item.consumed_at else None,
            }
            for item in items
        ],
    }

@router.delete("/food/{food_id}")
async def delete_food(food_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FoodConsumption).where(FoodConsumption.id == food_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Food record not found")
    await db.delete(item)
    await db.commit()
    return {"message": "Food record deleted"}

@router.get("/user/{user_id}/food-query-chat")
async def get_food_query_chat(user_id: int, db: AsyncSession = Depends(get_db)):
    """Return the existing food-query chat for this user, if any."""
    result = await db.execute(
        select(Chat)
        .where(Chat.user_id == user_id)
        .where(Chat.title == "🍽️ Дневник питания")
        .options(selectinload(Chat.agent))
        .order_by(Chat.created_at.desc())
        .limit(1)
    )
    chat = result.scalars().all()
    if chat:
        return {"chat_id": chat[0].id}
    return {"chat_id": None}

@router.post("/chats")
async def create_chat(data: dict = Body(...), db: AsyncSession = Depends(get_db)):
    """Create a new chat. Used by dietitian for food-query chat creation.
    If welcome_message is provided, saves it as an assistant message instantly (no LLM)."""
    user_id = data.get("user_id")
    title = data.get("title", "Новый чат")
    agent_name = data.get("agent_type", "dietitian")
    welcome_message = data.get("welcome_message")

    # Get or create agent (ensure exact name match in DB)
    result = await db.execute(select(Agent).where(Agent.name == agent_name))
    agent = result.scalar_one_or_none()
    if not agent:
        # Fallback to general agent if needed
        result = await db.execute(select(Agent).where(Agent.name == "agents"))
        agent = result.scalar_one_or_none()

    chat = Chat(user_id=user_id, agent_id=agent.id, title=title)
    db.add(chat)
    await db.flush()

    # If welcome_message provided, save it as assistant message immediately (no LLM call)
    if welcome_message:
        assistant_msg = Message(
            chat_id=chat.id,
            role="assistant",
            content=welcome_message,
            tokens_used=0,
        )
        db.add(assistant_msg)

    await db.commit()
    await db.refresh(chat)
    return {"id": chat.id, "chat_id": chat.id, "title": chat.title}

@router.post("/chats/{chat_id}/food-query")
async def send_food_query(chat_id: int, db: AsyncSession = Depends(get_db)):
    """Send the dietitian's introductory message to analyse recent food and offer to add more.
    This creates a pre-filled chat context for the user."""
    # Verify chat exists
    result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Get agent
    result = await db.execute(select(Agent).where(Agent.id == chat.agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Query what user ate today
    today = datetime.now(timezone.utc).date()
    result = await db.execute(
        select(FoodConsumption)
        .where(FoodConsumption.user_id == chat.user_id)
        .where(func.date(FoodConsumption.consumed_at) == today)
    )
    today_items = result.scalars().all()

    # Build context for the agent
    if today_items:
        food_list = "\n".join(
            f"- {item.product_name} ({item.grams}г, {item.calories}ккал, Б:{item.protein} Ж:{item.fats} У:{item.carbs}) [{item.meal_type or 'other'}]"
            for item in today_items
        )
        user_message = (
            f"Пользователь нажал «+» чтобы добавить еду в дневник. "
            f"Вот что он уже съел сегодня:\n{food_list}\n\n"
            f"Поприветствуй его кратко (1-2 предложения), подведи итог съеденного и предложи добавить ещё продуктов. "
            f"Будь дружелюбным и полезным. Говори на русском."
        )
    else:
        user_message = (
            "Пользователь нажал «+» чтобы добавить еду в дневник. "
            "Сегодня он ещё ничего не записал. "
            "Поприветствуй его, расскажи что ты его диетолог, и предложи рассказать что он съел сегодня — "
            "поможешь посчитать калории и БЖУ. Говори на русском."
        )

    # Get agent process function
    agent_name = agent.name if agent.name in AGENT_REGISTRY else None
    if agent_name:
        agent_process = AGENT_REGISTRY[agent_name]
        response_text, tokens_used = await agent_process(user_message, agent.system_prompt, db, chat.user_id)
    else:
        # Fallback: use LLM directly
        try:
            response = client.chat.completions.create(
                model="google/gemini-3.1-flash-lite",
                messages=[
                    {"role": "system", "content": agent.system_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.7,
                max_tokens=400,
                timeout=60.0,
            )
            response_text = response.choices[0].message.content or "Привет! Я твой диетолог. Расскажи, что ты съел сегодня — помогу посчитать калории и БЖУ."
            tokens_used = 0
        except Exception as e:
            response_text = "Привет! Я твой диетолог. Расскажи, что ты съел сегодня — помогу посчитать калории и БЖУ."
            tokens_used = 0

    # Save assistant response
    assistant_msg = Message(chat_id=chat.id, role="assistant", content=response_text, tokens_used=tokens_used)
    db.add(assistant_msg)

    await db.commit()
    return {"response": response_text, "chat_id": chat.id}
