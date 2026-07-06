from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from sqlalchemy.orm import selectinload
from src.database import get_db
from src.models import User, Agent, Chat, Message, TokenTransaction, UserDietProfile, FoodConsumption, MoodEntry, DiaryEntry
from datetime import datetime, timedelta, timezone
from src.config import client
from pydantic import BaseModel, ValidationError
from typing import Optional, List, Union, Any
import importlib
import os
import json
import httpx
import base64
import asyncio
import re
import mimetypes
from pathlib import Path
from src.image_utils import is_image_attachment, attachment_display_name, attachment_to_image_url, build_llm_user_message, build_vision_message_parts

router = APIRouter(prefix="/api")

# --- Constants for the orchestrator ---
ORCHESTRATOR_SYSTEM_PROMPT = """You are a router AI. Decide which specialist agent to use.
Options: dietitian (food/nutrition), secretary (scheduling/notes/reminders), psychologist (mental), mentor (learning/career), accountant (finance).
For general conversation reply with "default".
Respond ONLY with the agent name. No explanation."""

TITLE_GENERATION_PROMPT = """Generate a short (max 5 words) chat title in Russian based on user's first message.
Title should be clear and concise. Return ONLY the title, no quotes, no explanation."""

VISION_HALLUCINATION_GUARD = """
ВАЖНОЕ ПРАВИЛО ДЛЯ ИЗОБРАЖЕНИЙ И ФАЙЛОВ:
- Отвечай только по тем данным, которые явно есть в тексте пользователя и в прикреплённых изображениях.
- Если изображение не загрузилось, не открылось, размыто, обрезано или по нему невозможно уверенно определить детали — так и пиши: «Я не вижу содержимое изображения достаточно ясно, поэтому не могу это определить».
- Если ты НЕ ВИДИШЬ изображение (оно не было передано или недоступно) — НЕ ВЫДУМЫВАЙ его содержимое. Напиши: «Я не вижу изображение. Пожалуйста, отправьте его ещё раз или опишите текстом».
- Не выдумывай текст на изображении, бренды, людей, эмоции, еду, цвета, количество предметов, действия, диагнозы, суммы, даты или другие детали.
- Если пользователь просит проанализировать изображение, но изображение не было передано модели или его содержимое недоступно, не давай анализ: попроси отправить изображение ещё раз или описать его текстом.
- Для еды по фото можно давать только приблизительную оценку и обязательно предупреждай, что без веса/КБЖУ расчёт примерный.
"""

# ─── Message normalization ────────────────────────────────────────────────────

def _normalize_user_message_content(content: Any) -> tuple[str, list[dict]]:
    """Return (text, attachments). Supports structured content and legacy Markdown image syntax."""
    attachments: list[dict] = []

    if isinstance(content, dict):
        text = str(content.get("text") or content.get("content") or content.get("message") or "")
        raw_attachments = content.get("attachments") or []
        if isinstance(raw_attachments, list):
            attachments = [a for a in raw_attachments if isinstance(a, dict)]
        print(f"DEBUG: Structured content - text: {text[:100]}, attachments: {len(attachments)}")
        return text, attachments

    if isinstance(content, str):
        text = content
        try:
            parsed = json.loads(content)
            if isinstance(parsed, dict) and "attachments" in parsed:
                raw_attachments = parsed.get("attachments") or []
                if isinstance(raw_attachments, list):
                    attachments = [a for a in raw_attachments if isinstance(a, dict)]
                text = str(parsed.get("text") or parsed.get("message") or "")
                print(f"DEBUG: JSON content - text: {text[:100]}, attachments: {len(attachments)}")
                return text, attachments
        except Exception:
            pass

        # Legacy compatibility: messages saved as Markdown images like ![Изображение](/uploads/foo.jpg)
        for url in re.findall(r"!\[[^\]]*\]\(([^)]+)\)", text):
            attachments.append({
                "url": url,
                "filename": os.path.basename(url.split("?")[0]),
                "type": mimetypes.guess_type(url)[0] or "",
                "is_image": True,
            })
        print(f"DEBUG: Markdown content - text: {text[:100]}, extracted attachments: {len(attachments)}")
        if attachments:
            print(f"DEBUG: Extracted attachments: {attachments}")
        return text, attachments

    print(f"DEBUG: Unknown content type: {type(content)}")
    return str(content or ""), attachments


def _build_user_llm_content(text: str, attachments: list[dict] | None = None, force_parts: bool = False) -> Union[str, list[dict]]:
    """Build LLM message content parts. Images from attachments are inlined as data URLs."""
    attachments = attachments or []
    parts: list[dict] = []
    image_count = 0

    for attachment in attachments:
        if not isinstance(attachment, dict):
            continue

        if is_image_attachment(attachment):
            image_url = attachment_to_image_url(attachment)
            if image_url:
                parts.append({"type": "image_url", "image_url": {"url": image_url}})
                image_count += 1
            else:
                parts.append({
                    "type": "text",
                    "text": f"К сообщению был прикреплён файл «{attachment_display_name(attachment)}», но его содержимое недоступно модели.",
                })
        else:
            parts.append({
                "type": "text",
                "text": f"К сообщению был прикреплён файл «{attachment_display_name(attachment)}».",
            })

    if text:
        parts.append({"type": "text", "text": text})

    if image_count:
        parts.append({"type": "text", "text": VISION_HALLUCINATION_GUARD})

    # If there are images or force_parts, return array
    if parts and (image_count > 0 or force_parts):
        return parts

    # Otherwise return as plain text
    return parts[0]["text"] if len(parts) == 1 else text


def _append_user_message(messages: list[dict], text: str, attachments: list[dict] | None = None):
    messages.append({"role": "user", "content": _build_user_llm_content(text, attachments)})


def _history_to_llm_messages(history: list[dict] | None) -> list[dict]:
    messages: list[dict] = []
    for item in history or []:
        if not isinstance(item, dict):
            continue
        role = str(item.get("role") or "user")
        text, attachments = _normalize_user_message_content(item.get("content", ""))
        messages.append({"role": role, "content": _build_user_llm_content(text, attachments)})
    return messages


def calculate_max_tokens(message: str) -> int:
    """Calculate dynamic max_tokens based on question complexity."""
    word_count = len(message.split())

    if word_count <= 3:
        base = 150
    elif word_count <= 10:
        base = 300
    elif word_count <= 30:
        base = 500
    elif word_count <= 60:
        base = 800
    else:
        base = 1200

    complex_keywords = [
        "код", "code", "script", "программа", "функция", "алгоритм",
        "расскажи", "объясни", "explain", "describe", "analyse", "analyze",
        "проанализируй", "подробно", "детально", "in detail",
        "напиши", "write", "create", "создай", "разработай",
        "сравни", "compare", "contrast", "summarize", "резюмируй",
        "инструкция", "guide", "руководство", "tutorial",
    ]

    msg_lower = message.lower()
    if any(kw in msg_lower for kw in complex_keywords):
        base = int(base * 1.5)

    return min(base, 2048)


# ─── Pydantic models ──────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    user_id: int
    message: Any
    chat_id: Optional[int] = None
    history: Optional[List[dict]] = None
    agent: Optional[str] = None

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


# ─── Agent registry ────────────────────────────────────────────────────────────

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

load_agents()


# ─── Routing ───────────────────────────────────────────────────────────────────

async def route_to_agent(message: Any) -> str:
    """Route message to appropriate agent using LLM with keyword fallback."""
    text, attachments = _normalize_user_message_content(message)
    msg_lower = text.lower()

    # --- FAST KEYWORD FALLBACK: detect food consumption ---
    food_kw = ["съел", "съела", "поел", "поела", "скушал", "скушала", "выпил", "выпила",
               "позавтракал", "пообедал", "поужинал", "перекусил", "перекусила",
               "на завтрак", "на обед", "на ужин", "на перекус",
               "завтракал", "обедал", "ужинал", "запил", "запила"]
    food_nouns = ["грамм", "порцию", "порция", "рацион", "калори", "кбжу", "белк", "жир", "углевод"]

    if any(kw in msg_lower for kw in food_kw) or any(kw in msg_lower for kw in food_nouns):
        print(f"DEBUG: Keyword fallback — routing to dietitian")
        return "dietitian"

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
        user_msg = build_llm_user_message(text, attachments)
        messages_for_route = [
            {"role": "system", "content": ORCHESTRATOR_SYSTEM_PROMPT},
            # Use build_llm_user_message which handles both text and images
            user_msg if isinstance(user_msg, dict) else {"role": "user", "content": str(user_msg)},
        ]
        response = client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=messages_for_route,
            temperature=0.1,
            max_tokens=20,
            timeout=15.0
        )
        raw_content = response.choices[0].message.content
        if raw_content is None:
            print("Warning: route_to_agent received None content from LLM, falling back to default")
            return "default"
        agent_name = raw_content.strip().lower()
        print(f"DEBUG: LLM routing '{text[:50]}...' -> agent: {agent_name}")
        return agent_name if agent_name in AGENT_REGISTRY else "default"
    except Exception as e:
        print(f"Error routing message: {e}")
        return "default"


async def generate_chat_title(first_message: Any, client) -> str:
    """Generate a chat title from the first message."""
    text, _ = _normalize_user_message_content(first_message)
    title_text = text or "Новое изображение"
    try:
        response = client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=[
                {"role": "system", "content": TITLE_GENERATION_PROMPT},
                {"role": "user", "content": title_text}
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


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def process_chat(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    # Get user
    result = await db.execute(select(User).where(User.id == request.user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    agent_name = await route_to_agent(request.message)

    # Get or create agent
    if agent_name == "default":
        result = await db.execute(select(Agent).where(Agent.name == "agents"))
        agent = result.scalar_one_or_none()
        if not agent:
            agent = Agent(
                name="agents",
                description="Main AI orchestrator and personal assistant",
                system_prompt="Ты — Ixteria, ИИ-управляющий. Отвечай по существу, без лишних формальностей и пустых фраз. Длина ответа должна соответствовать сложности и объёму вопроса пользователя: на простые вопросы отвечай кратко, на сложные — развёрнуто и детально. Не задавай встречных вопросов вроде «Как проходит день?». Используй приветствие только если пользователь поздоровался. Никакой воды.",
                is_active=True
            )
            db.add(agent)
            await db.flush()
        else:
            correct_prompt = "Ты — Ixteria, ИИ-управляющий. Отвечай по существу, без лишних формальностей и пустых фраз. Длина ответа должна соответствовать сложности и объёму вопроса пользователя: на простые вопросы отвечай кратко, на сложные — развёрнуто и детально. Не задавай встречных вопросов вроде «Как проходит день?». Используй приветствие только если пользователь поздоровался. Никакой воды."
            if agent.system_prompt != correct_prompt:
                agent.system_prompt = correct_prompt
                await db.flush()
    else:
        result = await db.execute(select(Agent).where(Agent.name == agent_name))
        agent = result.scalar_one_or_none()
        if not agent:
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
            chat_title = await generate_chat_title(request.message, client)
            chat = Chat(user_id=request.user_id, agent_id=agent.id, title=chat_title)
            db.add(chat)
            await db.flush()
    else:
        chat_title = await generate_chat_title(request.message, client)
        chat = Chat(user_id=request.user_id, agent_id=agent.id, title=chat_title)
        db.add(chat)
        await db.flush()

    message_text, message_attachments = _normalize_user_message_content(request.message)

    # Save user message
    user_message = Message(chat_id=chat.id, role="user", content=request.message, tokens_used=0)
    db.add(user_message)

    # Process message
    if agent_name in AGENT_REGISTRY:
        agent_process = AGENT_REGISTRY[agent_name]
        # >>> Передаём attachments агентам
        response_text, tokens_used = await agent_process(message_text, agent.system_prompt, db, request.user_id, attachments=message_attachments)
    else:
        messages = []
        messages.append({"role": "system", "content": agent.system_prompt})
        messages.extend(_history_to_llm_messages(request.history))
        _append_user_message(messages, message_text, message_attachments)

        try:
            max_tokens = calculate_max_tokens(message_text)
            response = client.chat.completions.create(
                model="google/gemini-3.1-flash-lite",
                messages=messages,
                temperature=0.7,
                max_tokens=max_tokens,
                timeout=60.0
            )
            response_text = response.choices[0].message.content
            tokens_used = 0
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"API error: {str(e)}")

    if response_text is None:
        response_text = "Извините, произошла ошибка при обработке вашего запроса. Попробуйте ещё раз."

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


# ─── Streaming ─────────────────────────────────────────────────────────────────

@router.post("/chat/stream")
async def process_chat_stream(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    """Streaming chat endpoint. Yields SSE events with tokens and final response."""
    print(f"DEBUG: process_chat_stream - message: {str(request.message)[:200]}")
    # Get user
    result = await db.execute(select(User).where(User.id == request.user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    agent_name = await route_to_agent(request.message)

    # Get or create agent
    if agent_name == "default":
        result = await db.execute(select(Agent).where(Agent.name == "agents"))
        agent = result.scalar_one_or_none()
        if not agent:
            agent = Agent(
                name="agents",
                description="Main AI orchestrator and personal assistant",
                system_prompt="Ты — Ixteria, ИИ-управляющий. Отвечай по существу, без лишних формальностей и пустых фраз. Длина ответа должна соответствовать сложности и объёму вопроса пользователя: на простые вопросы отвечай кратко, на сложные — развёрнуто и детально. Не задавай встречных вопросов вроде «Как проходит день?». Используй приветствие только если пользователь поздоровался. Никакой воды.",
                is_active=True
            )
            db.add(agent)
            await db.flush()
        else:
            correct_prompt = "Ты — Ixteria, ИИ-управляющий. Отвечай по существу, без лишних формальностей и пустых фраз. Длина ответа должна соответствовать сложности и объёму вопроса пользователя: на простые вопросы отвечай кратко, на сложные — развёрнуто и детально. Не задавай встречных вопросов вроде «Как проходит день?». Используй приветствие только если пользователь поздоровался. Никакой воды."
            if agent.system_prompt != correct_prompt:
                agent.system_prompt = correct_prompt
                await db.flush()
    else:
        result = await db.execute(select(Agent).where(Agent.name == agent_name))
        agent = result.scalar_one_or_none()
        if not agent:
            agent = Agent(
                name=agent_name,
                description=f"{agent_name.capitalize()} agent",
                system_prompt=f"Ты — {agent_name}, специализированный ИИ-агент.",
                is_active=True
            )
            db.add(agent)
            await db.flush()

    # Create or get chat
    is_new_chat = False
    stream_agent_name = agent.name if agent else "ixteria"
    if request.chat_id:
        result = await db.execute(select(Chat).where(Chat.id == request.chat_id))
        chat = result.scalar_one_or_none()
        if not chat:
            is_new_chat = True
            chat_title = await generate_chat_title(request.message, client)
            chat = Chat(user_id=request.user_id, agent_id=agent.id, title=chat_title)
            db.add(chat)
            await db.flush()
    else:
        is_new_chat = True
        chat_title = await generate_chat_title(request.message, client)
        chat = Chat(user_id=request.user_id, agent_id=agent.id, title=chat_title)
        db.add(chat)
        await db.flush()

    message_text, message_attachments = _normalize_user_message_content(request.message)

    # Save user message
    user_message = Message(chat_id=chat.id, role="user", content=request.message, tokens_used=0)
    db.add(user_message)
    await db.flush()

    if agent_name in AGENT_REGISTRY:
        agent_process = AGENT_REGISTRY[agent_name]
        # >>> Передаём attachments
        response_text, tokens_used = await agent_process(message_text, agent.system_prompt, db, request.user_id, attachments=message_attachments)

        if response_text is None:
            response_text = "Извините, произошла ошибка при обработке вашего запроса. Попробуйте ещё раз."

        assistant_message = Message(chat_id=chat.id, role="assistant", content=response_text, tokens_used=tokens_used)
        db.add(assistant_message)
        await db.commit()

        return StreamingResponse(
            _stream_final_response(response_text, chat.id, is_new_chat, stream_agent_name),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )

    async def generate():
        full_response = ""
        messages = []
        messages.append({"role": "system", "content": agent.system_prompt})
        messages.extend(_history_to_llm_messages(request.history))
        _append_user_message(messages, message_text, message_attachments)

        try:
            max_tokens = calculate_max_tokens(message_text)
            stream = client.chat.completions.create(
                model="google/gemini-3.1-flash-lite",
                messages=messages,
                temperature=0.7,
                max_tokens=max_tokens,
                timeout=60.0,
                stream=True,
            )

            for chunk in stream:
                if chunk.choices and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta
                    if delta and delta.content:
                        token = delta.content
                        full_response += token
                        yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

            if not full_response.strip():
                full_response = "Извините, произошла ошибка. Попробуйте ещё раз."
                yield f"data: {json.dumps({'type': 'token', 'content': full_response})}\n\n"

        except Exception as e:
            full_response = f"Извините, произошла ошибка при обработке запроса: {str(e)[:100]}..."
            yield f"data: {json.dumps({'type': 'token', 'content': full_response})}\n\n"

        assistant_message = Message(chat_id=chat.id, role="assistant", content=full_response, tokens_used=0)
        db.add(assistant_message)
        await db.commit()

        metadata = {
            'type': 'done',
            'chat_id': chat.id,
            'is_new_chat': is_new_chat,
            'full_content': full_response,
            'agent_name': stream_agent_name,
        }
        yield f"data: {json.dumps(metadata)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


async def _stream_final_response(response_text, chat_id, is_new_chat, agent_name="ixteria"):
    """Stream a pre-computed response as tokens for specialized agents."""
    try:
        parsed = json.loads(response_text)
        if isinstance(parsed, dict) and 'type' in parsed:
            metadata = {
                'type': 'widget',
                'content': response_text,
                'chat_id': chat_id,
                'is_new_chat': is_new_chat,
            }
            yield f"data: {json.dumps(metadata)}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'chat_id': chat_id, 'is_new_chat': is_new_chat, 'full_content': response_text})}\n\n"
            return
    except json.JSONDecodeError:
        pass

    words = response_text.split(' ')
    for i, word in enumerate(words):
        chunk = word + (' ' if i < len(words) - 1 else '')
        yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"
        await asyncio.sleep(0.03)

    metadata = {
        'type': 'done',
        'chat_id': chat_id,
        'is_new_chat': is_new_chat,
        'full_content': response_text,
        'agent_name': agent_name,
    }
    yield f"data: {json.dumps(metadata)}\n\n"


# ─── Other endpoints ───────────────────────────────────────────────────────────

@router.get("/agents")
async def get_agents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Agent).where(Agent.is_active == True))
    agents = result.scalars().all()
    return [{"id": a.id, "name": a.name, "description": a.description} for a in agents]

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

@router.post("/user/{user_id}/avatar")
async def upload_avatar(user_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """Upload a user avatar image. Returns the URL."""
    import shutil
    import uuid

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    UPLOAD_DIR = "uploads"
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)

    file_extension = os.path.splitext(file.filename)[1]
    filename = f"avatar_{user_id}_{uuid.uuid4().hex[:8]}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    avatar_url = f"/uploads/{filename}"
    user.avatar_url = avatar_url
    await db.commit()

    return {"url": avatar_url, "message": "Avatar uploaded successfully"}

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

@router.get("/chats/{chat_id}/messages")
async def get_chat_messages(chat_id: int, db: AsyncSession = Depends(get_db)):
    # Get chat with its agent name
    chat_result = await db.execute(
        select(Chat).where(Chat.id == chat_id).options(selectinload(Chat.agent))
    )
    chat = chat_result.scalar_one_or_none()
    agent_name = chat.agent.name if chat and chat.agent else "ixteria"

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
            "created_at": m.created_at.isoformat(),
            "agent_name": agent_name
        }
        for m in messages
    ]

@router.delete("/chats/{chat_id}")
async def delete_chat(chat_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = result.scalar_one_or_none()

    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

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

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a file and return its URL."""
    import shutil
    import uuid

    UPLOAD_DIR = "uploads"
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)

    file_extension = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"url": f"/uploads/{filename}", "filename": filename}

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="File must be an audio file")

    try:
        content = await file.read()

        mime_to_format = {
            "audio/webm": "webm",
            "audio/mp3": "mp3",
            "audio/mpeg": "mp3",
            "audio/wav": "wav",
            "audio/ogg": "ogg",
        }
        audio_format = mime_to_format.get(file.content_type, "webm")
        audio_base64 = base64.b64encode(content).decode("utf-8")
        api_key = os.getenv("ROUTER_API_KEY")

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
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Transcription API error: {response.text}",
            )

        result = response.json()
        transcribed_text = result.get("text", "") if isinstance(result, dict) else str(result)

        if not transcribed_text:
            raise HTTPException(status_code=400, detail="Transcription result is empty")

        return {"text": transcribed_text}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


# ─── Food / Diet endpoints ─────────────────────────────────────────────────────

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

    totals = {"calories": 0, "protein": 0, "fats": 0, "carbs": 0}
    for item in items:
        totals["calories"] += item.calories or 0
        totals["protein"] += item.protein or 0
        totals["fats"] += item.fats or 0
        totals["carbs"] += item.carbs or 0

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
    user_id = data.get("user_id")
    title = data.get("title", "Новый чат")
    agent_name = data.get("agent_type", "dietitian")
    welcome_message = data.get("welcome_message")

    result = await db.execute(select(Agent).where(Agent.name == agent_name))
    agent = result.scalar_one_or_none()
    if not agent:
        result = await db.execute(select(Agent).where(Agent.name == "agents"))
        agent = result.scalar_one_or_none()

    chat = Chat(user_id=user_id, agent_id=agent.id, title=title)
    db.add(chat)
    await db.flush()

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

# ─── Mood / Emotion endpoints ────────────────────────────────────────────────────

@router.post("/user/{user_id}/mood")
async def save_mood(user_id: int, data: dict = Body(...), db: AsyncSession = Depends(get_db)):
    """Save a mood entry."""
    mood = data.get("mood")
    emoji = data.get("emoji")
    label = data.get("label")
    if mood is None or not emoji or not label:
        raise HTTPException(status_code=400, detail="Missing required fields: mood, emoji, label")
    
    entry = MoodEntry(user_id=user_id, mood=mood, emoji=emoji, label=label)
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return {"id": entry.id, "message": "Mood saved"}

@router.get("/user/{user_id}/mood-week")
async def get_mood_week(user_id: int, db: AsyncSession = Depends(get_db)):
    """Get mood entries for the last 7 days."""
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    result = await db.execute(
        select(MoodEntry)
        .where(MoodEntry.user_id == user_id)
        .where(MoodEntry.created_at >= week_ago)
        .order_by(MoodEntry.created_at.asc())
    )
    entries = result.scalars().all()
    return [
        {
            "id": e.id,
            "mood": e.mood,
            "emoji": e.emoji,
            "label": e.label,
            "created_at": e.created_at.isoformat(),
        }
        for e in entries
    ]


# ─── Diary endpoints ──────────────────────────────────────────────────────

@router.get("/user/{user_id}/diary")
async def get_diary_entries(user_id: int, db: AsyncSession = Depends(get_db)):
    """Get all diary entries for a user."""
    result = await db.execute(
        select(DiaryEntry)
        .where(DiaryEntry.user_id == user_id)
        .order_by(DiaryEntry.created_at.desc())
    )
    entries = result.scalars().all()
    return [
        {
            "id": e.id,
            "title": e.title or "",
            "content": e.content,
            "mood": e.mood,
            "mood_emoji": e.mood_emoji,
            "tags": e.tags.split(",") if e.tags else [],
            "created_at": e.created_at.isoformat(),
        }
        for e in entries
    ]


@router.post("/user/{user_id}/diary")
async def create_diary_entry(user_id: int, data: dict = Body(...), db: AsyncSession = Depends(get_db)):
    """Create a diary entry."""
    title = data.get("title", "")
    content = data.get("content", "")
    mood = data.get("mood")
    mood_emoji = data.get("mood_emoji")
    tags = data.get("tags", [])

    if isinstance(tags, list):
        tags_str = ",".join(tags)
    else:
        tags_str = str(tags)

    entry = DiaryEntry(
        user_id=user_id,
        title=title,
        content=content,
        mood=mood,
        mood_emoji=mood_emoji,
        tags=tags_str,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return {
        "id": entry.id,
        "title": entry.title,
        "content": entry.content,
        "mood": entry.mood,
        "mood_emoji": entry.mood_emoji,
        "tags": entry.tags.split(",") if entry.tags else [],
        "created_at": entry.created_at.isoformat(),
        "message": "Diary entry created",
    }


@router.delete("/diary/{entry_id}")
async def delete_diary_entry(entry_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a diary entry."""
    result = await db.execute(select(DiaryEntry).where(DiaryEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Diary entry not found")
    await db.delete(entry)
    await db.commit()
    return {"message": "Diary entry deleted"}


@router.post("/chats/{chat_id}/food-query")
async def send_food_query(chat_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    result = await db.execute(select(Agent).where(Agent.id == chat.agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    today = datetime.now(timezone.utc).date()
    result = await db.execute(
        select(FoodConsumption)
        .where(FoodConsumption.user_id == chat.user_id)
        .where(func.date(FoodConsumption.consumed_at) == today)
    )
    today_items = result.scalars().all()

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

    agent_name = agent.name if agent.name in AGENT_REGISTRY else None
    if agent_name:
        agent_process = AGENT_REGISTRY[agent_name]
        response_text, tokens_used = await agent_process(user_message, agent.system_prompt, db, chat.user_id, attachments=[])
    else:
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
            response_text = response.choices[0].message.content or "👋 **Привет! Я твой диетолог.**\n\nРасскажи, что ты съел сегодня — я помогу посчитать калории и БЖУ!\n\n🥗 **Как мне помочь тебе с расчетами:**\n\n📸 **Фото блюда:** отправь снимок, и я проанализирую его состав и калорийность.\n\n📝 **Список продуктов:** напиши продукты и их граммовки напрямую, и я внесу их в твой рацион.\n\n📊 **Штрихкод:** воспользуйся сканированием в разделе «Диетолог» для максимально точного отслеживания.\n\nЖду твой рацион!"
            tokens_used = 0
        except Exception as e:
            response_text = "👋 **Привет! Я твой диетолог.**\n\nРасскажи, что ты съел сегодня — я помогу посчитать калории и БЖУ!\n\n🥗 **Как мне помочь тебе с расчетами:**\n\n📸 **Фото блюда:** отправь снимок, и я проанализирую его состав и калорийность.\n\n📝 **Список продуктов:** напиши продукты и их граммовки напрямую, и я внесу их в твой рацион.\n\n📊 **Штрихкод:** воспользуйся сканированием в разделе «Диетолог» для максимально точного отслеживания.\n\nЖду твой рацион!"
            tokens_used = 0

    assistant_msg = Message(chat_id=chat.id, role="assistant", content=response_text, tokens_used=tokens_used)
    db.add(assistant_msg)

    await db.commit()
    return {"response": response_text, "chat_id": chat.id}