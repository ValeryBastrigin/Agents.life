from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from src.database import get_db
from src.models import User, Agent, Chat, Message, TokenTransaction
from src.config import client
from pydantic import BaseModel, ValidationError
from typing import Optional, List
import importlib
import os

router = APIRouter(prefix="/api", tags=["orchestrator"])

# System prompt for the main orchestrator agent "Agents"
ORCHESTRATOR_SYSTEM_PROMPT = """Ты — Agents, ИИ-оркестратор. Твоя задача — определить, к какому специализированному агенту адресован запрос пользователя, и перенаправить его.

Доступные агенты:
- secretary: секретарь (планирование встреч, расписание, напоминания, организация)
- accountant: бухгалтер (бюджетирование, учет расходов, финансовое планирование)

Если запрос относится к секретарю (встречи, расписание, напоминания, календарь, организация) — верни "secretary".
Если запрос относится к бухгалтеру (финансы, бюджет, расходы, деньги) — верни "accountant".
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
            model="google/gemini-3.1-flash-lite",
            messages=[
                {"role": "system", "content": TITLE_GENERATION_PROMPT},
                {"role": "user", "content": first_message}
            ],
            temperature=0.3,
            max_tokens=50,
            timeout=30.0
        )
        title = response.choices[0].message.content.strip()
        return title[:50] if title else "Новый диалог"
    except Exception as e:
        print(f"Error generating chat title: {e}")
        return first_message[:50]

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
    """Route message to appropriate agent using LLM."""
    try:
        response = client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=[
                {"role": "system", "content": ORCHESTRATOR_SYSTEM_PROMPT},
                {"role": "user", "content": message}
            ],
            temperature=0.1,
            max_tokens=20,
            timeout=30.0
        )
        agent_name = response.choices[0].message.content.strip().lower()
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
                system_prompt="Ты — Agents, ИИ-управляющий. МАКСИМАЛЬНАЯ ДЛИНА ОТВЕТА: 20 слов. Никаких «Как проходит твой день?» или «Чем могу быть полезен?». Отвечай ТОЛЬКО на суть вопроса. На приветствие: «Привет! Я Agents, твой ИИ-управляющий. Чем помочь?». Никакой воды. Кратко. По делу.",
                is_active=True
            )
            db.add(agent)
            await db.flush()
        else:
            # Update system prompt if it's different
            correct_prompt = "Ты — Agents, ИИ-управляющий. МАКСИМАЛЬНАЯ ДЛИНА ОТВЕТА: 20 слов. Никаких «Как проходит твой день?» или «Чем могу быть полезен?». Отвечай ТОЛЬКО на суть вопроса. На приветствие: «Привет! Я Agents, твой ИИ-управляющий. Чем помочь?». Никакой воды. Кратко. По делу."
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
    result = await db.execute(select(Chat).where(Chat.user_id == user_id).order_by(Chat.created_at.desc()))
    chats = result.scalars().all()
    return [{"id": chat.id, "title": chat.title, "created_at": chat.created_at, "is_pinned": chat.is_pinned} for chat in chats]

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
        select(Chat).where(Chat.user_id == user_id).order_by(Chat.updated_at.desc())
    )
    chats = result.scalars().all()
    
    return [
        {
            "id": c.id,
            "title": c.title,
            "agent_name": c.agent.name if c.agent else None,
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
