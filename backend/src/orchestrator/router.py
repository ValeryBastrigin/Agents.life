from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File, Form
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from sqlalchemy.orm import selectinload
from src.database import get_db
from src.models import User, Agent, Chat, Message, TokenTransaction, UserDietProfile, FoodConsumption, DietPlan, UserAgentSettings
from datetime import date, datetime, timedelta, timezone
from src.config import client
from pydantic import BaseModel, ValidationError
from typing import Optional, List, Union, Any, AsyncGenerator
from src.agents.streaming import stream_event_to_sse, StreamEvent, stream_llm_response, stream_text_with_delay
from src.billing.calculator import calculate_cost
from src.billing.dependency import check_billing_limit
import importlib
import os
import json
import httpx
import base64
import asyncio
import math
import re
import mimetypes
import traceback
import logging
from pathlib import Path
import random
import shutil
import uuid

logger = logging.getLogger(__name__)

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

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".heic", ".heif"}

# --- Greeting detection ---
GREETING_WORDS = {
    "привет", "здравствуй", "здрасте", "здравствуйте", "добрый день",
    "доброе утро", "добрый вечер", "приветствую", "хай",
    "hello", "hi", "hey", "good morning", "good afternoon", "good evening",
    "ку", "даров", "здарова", "салют", "хеллоу"
}

GREETING_RESPONSES = [
    "Привет! Готов помочь тебе с любыми вопросами, чем займёмся? ☺️",
    "Привет! Я здесь, чтобы помочь. Рассказывай, что случилось?",
    "Привет-привет! Всё готово к работе. С чего начнём? 😊",
]

WHAT_CAN_YOU_DO_QUESTIONS = {
    "что ты умеешь",
    "что ты умеешь делать",
    "что ты умеешь делать расскажи о возможностях агентов",
    "расскажи о возможностях агентов",
    "что вы умеете",
    "что ты можешь",
}

WHAT_CAN_YOU_DO_RESPONSE = """Привет!

Я ixteria — это ваш персональный мультиагентский сервис для жизни и работы.

Наша команда ИИ-агентов поможет вам навести порядок в делах, заботиться о здоровье, эффективно управлять финансами и уверенно двигаться к своим мечтам и ментальному благополучию.

Знакомьтесь с вашими помощниками:

**1. Тайм-менеджер** 📅

Ваш личный эксперт по времени и продуктивности.
*Что умеет:* Помогает составлять индивидуальное расписание, планировать задачи на день и фиксировать важные заметки.
*Как помогает:* Вы можете обсуждать свои планы с агентом для их оптимизации. Он всегда напомнит о запланированных делах, держит под контролем ваш график и помогает высвободить время для главного — ваших целей.

**2. Агент-диетолог** 🥗

Ваш персональный проводник к здоровому телу.
*Что умеет:* Помогает составить индивидуальный рацион, анализирует КБЖУ и предлагает рецепты для совместной готовки.
*Как помогает:* Вы можете обсуждать свое меню, легко сбрасывать вес или набирать мышечную массу. Агент будет рядом на каждом этапе вашего пути к здоровому и сбалансированному питанию.

**3. Финансовый ассистент** 💰

Ваш умный советник по деньгам и инвестициям.
*Что умеет:* Анализирует ваши траты, банковские выписки и инвестиционные портфели.
*Как помогает:* Подскажет, как оптимизировать расходы и накопить на мечту. А благодаря встроенному расчётному календарю вы сможете внести все регулярные платежи — ассистент заранее напомнит, когда и за что нужно заплатить.

**4. Агент-психолог** 🧠

Ваша безопасная и поддерживающая среда.
*Что умеет:* Начинает с вами сеансы психотерапии, внимательно выслушивает то, что для вас важно, и помогает разобраться с внутренними проблемами.
*Как помогает:* После окончания сеанса формирует краткое саммари, как настоящий терапевт, и сохраняет его в специальный раздел. Там вы всегда сможете узнать, как прошёл сеанс, ознакомиться с рекомендациями для продолжения беседы и получить полезные материалы.
*Конфиденциальность:* Все сеансы строго конфиденциальны — никто, кроме вас, не имеет к ним доступа.

**5. Агент-ментор** 🎯

Ваш проводник к главным целям и саморазвитию.
*Что умеет:* Помогает превратить мечту в реальность, разбивая её на понятные и доступные шаги, которые вы проходите вместе.
*Как помогает:* Подбирает обучающие материалы, которые помогут конкретно вам в достижении вашей цели. Помогает избавиться от вредных привычек и привить полезные.

Всё это вы можете сделать вместе с Ixteria уже сейчас!"""


def _is_what_can_you_do(text: str) -> bool:
    """Check if the user is asking 'what can you do'."""
    text_clean = re.sub(r'[^\w\s]', '', text.strip().lower())
    words = text_clean.split()
    # Check full cleaned text against known questions
    return text_clean in WHAT_CAN_YOU_DO_QUESTIONS or any(
        q in text_clean for q in WHAT_CAN_YOU_DO_QUESTIONS
    )


def _is_greeting(text: str) -> bool:
    """Check if the user message is just a greeting (no actual question/task)."""
    text_clean = re.sub(r'[^\w\s]', '', text.strip().lower())
    words = text_clean.split()
    if not words:
        return False
    if len(words) <= 3:
        for w in words:
            if w in GREETING_WORDS:
                return True
    return False


def _is_image_attachment(attachment: dict) -> bool:
    content_type = str(attachment.get("type") or attachment.get("content_type") or "").lower()
    filename = str(attachment.get("filename") or attachment.get("name") or "")
    url = str(attachment.get("url") or "")
    return (
        content_type.startswith("image/")
        or Path(filename).suffix.lower() in IMAGE_EXTENSIONS
        or any(ext in url.lower() for ext in IMAGE_EXTENSIONS)
    )


def _attachment_display_name(attachment: dict) -> str:
    return str(attachment.get("filename") or attachment.get("name") or attachment.get("url") or "файл")


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


def _local_upload_to_data_url(url: str) -> str | None:
    """Convert /uploads/filename.jpg served by this backend into a data URL for vision models."""
    if not url:
        return None

    path_part = url
    if path_part.startswith("http://") or path_part.startswith("https://"):
        path_part = path_part.replace("http://localhost:8001", "").replace("https://localhost:8001", "")
    if not path_part.startswith("/"):
        path_part = "/" + path_part

    if not path_part.startswith("/uploads/"):
        return None

    filename = os.path.basename(path_part)
    upload_dir = Path(os.getcwd()) / "uploads"
    file_path = upload_dir / filename

    if not file_path.exists() or not file_path.is_file():
        return None

    try:
        content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
        data = base64.b64encode(file_path.read_bytes()).decode("utf-8")
        return f"data:{content_type};base64,{data}"
    except Exception as exc:
        print(f"Warning: failed to read uploaded image {file_path}: {exc}")
        return None


def _attachment_to_image_url(attachment: dict) -> str | None:
    data_url = attachment.get("data_url") or attachment.get("dataUrl") or attachment.get("base64")
    if data_url:
        return str(data_url)

    url = str(attachment.get("url") or "")
    return _local_upload_to_data_url(url) or (url or None)


def _build_user_llm_content(text: str, attachments: list[dict] | None = None) -> Union[str, list[dict]]:
    attachments = attachments or []
    parts: list[dict] = []
    image_count = 0

    for attachment in attachments:
        if not isinstance(attachment, dict):
            continue

        if _is_image_attachment(attachment):
            image_url = _attachment_to_image_url(attachment)
            if image_url:
                parts.append({"type": "image_url", "image_url": {"url": image_url}})
                image_count += 1
            else:
                parts.append({
                    "type": "text",
                    "text": f"К сообщению был прикреплён файл «{_attachment_display_name(attachment)}», но его содержимое недоступно модели.",
                })
        else:
            parts.append({
                "type": "text",
                "text": f"К сообщению был прикреплён файл «{_attachment_display_name(attachment)}».",
            })

    if text:
        parts.append({"type": "text", "text": text})

    if image_count:
        parts.append({"type": "text", "text": VISION_HALLUCINATION_GUARD})

    return parts if len(parts) != 1 or any(p.get("type") != "text" for p in parts) else parts[0]["text"]


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
        base = 300
    elif word_count <= 10:
        base = 600
    elif word_count <= 30:
        base = 1200
    elif word_count <= 60:
        base = 2000
    else:
        base = 4000

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

    return min(base, 8192)

# --- Pydantic models ---
class ChatRequest(BaseModel):
    user_id: int
    message: Any
    chat_id: Optional[int] = None
    history: Optional[List[dict]] = None
    agent: Optional[str] = None
    generate_meal_plan: bool = False

class ChatResponse(BaseModel):
    response: str
    tokens_used: int
    remaining_balance: int
    chat_id: Optional[int] = None

class UpdateThemeRequest(BaseModel):
    theme: str

class UpdateUsernameRequest(BaseModel):
    username: str

class UserProfile(BaseModel):
    id: int
    username: str
    email: Optional[str]
    avatar_url: Optional[str]
    token_balance: int
    plan: str = "FREE"
    credits_used: int = 0
    theme_preference: str
    calorie_target: Optional[int] = None
    protein_target: Optional[int] = None
    fats_target: Optional[int] = None
    carbs_target: Optional[int] = None
    water_target: Optional[int] = None
    agents_selected: bool = False
    profile_completed: bool = False
    display_name: Optional[str] = None
    birth_date: Optional[str] = None
    offer_accepted_at: Optional[str] = None
    privacy_accepted_at: Optional[str] = None

# Agent registry
AGENT_REGISTRY = {}
AGENT_MODULES = {}

def load_agents():
    agents_dir = os.path.join(os.path.dirname(__file__), '..', 'agents')
    if os.path.exists(agents_dir):
        for filename in os.listdir(agents_dir):
            if filename.endswith('_agent.py') and not filename.startswith('__'):
                module_name = filename[:-3]
                try:
                    module = importlib.import_module(f'src.agents.{module_name}')
                    if hasattr(module, 'process') or hasattr(module, 'process_stream'):
                        agent_name = module_name.replace('_agent', '')
                        if hasattr(module, 'process'):
                            AGENT_REGISTRY[agent_name] = module.process
                        AGENT_MODULES[agent_name] = module
                except Exception as e:
                    print(f"Failed to load agent {module_name}: {e}")

load_agents()


# Agent display names for user-facing messages
AGENT_DISPLAY_NAMES = {
    "dietitian": "Диетолог",
    "secretary": "Секретарь",
    "psychologist": "Психолог",
    "mentor": "Ментор",
    "accountant": "Бухгалтер",
}


async def is_agent_enabled_for_user(user_id: int, agent_name: str, db: AsyncSession) -> bool:
    """Check if the given agent is enabled for the user.
    If no settings exist, the agent is considered enabled by default."""
    result = await db.execute(
        select(UserAgentSettings).where(
            UserAgentSettings.user_id == user_id,
            UserAgentSettings.agent_name == agent_name,
        )
    )
    setting = result.scalar_one_or_none()
    if setting is None:
        return True  # enabled by default
    return setting.is_enabled


def _make_agent_disabled_response(agent_name: str) -> str:
    """Generate a response suggesting the user enable the disabled agent."""
    display_name = AGENT_DISPLAY_NAMES.get(agent_name, agent_name.capitalize())
    return (
        f"❗ **{display_name}** сейчас отключён в ваших настройках.\n\n"
        f"Хотите включить **{display_name}**, чтобы я мог обработать этот запрос?"
    )


async def route_to_agent_with_check(message: Any, user_id: int, db: AsyncSession) -> tuple[str, bool]:
    """
    Route message to appropriate agent, checking if the agent is enabled for the user.
    Returns (agent_name, is_blocked) where is_blocked=True means the agent is disabled.
    """
    agent_name = await route_to_agent(message)
    
    # Only check for specialist agents (not default)
    if agent_name != "default" and agent_name in AGENT_REGISTRY:
        is_enabled = await is_agent_enabled_for_user(user_id, agent_name, db)
        if not is_enabled:
            return agent_name, True
    
    return agent_name, False

async def route_to_agent(message: Any) -> str:
    """Route message to appropriate agent using LLM with keyword fallback."""
    text, _ = _normalize_user_message_content(message)
    msg_lower = text.lower()

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

    sec_kw = ["встреча", "запланировать", "записать", "назначить", "расписание", "календарь",
              "событие", "напоминание", "напомни"]
    if any(kw in msg_lower for kw in sec_kw):
        print(f"DEBUG: Keyword fallback — routing to secretary")
        return "secretary"

    try:
        response = await client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=[
                {"role": "system", "content": ORCHESTRATOR_SYSTEM_PROMPT},
                {"role": "user", "content": _build_user_llm_content(text, [])}
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
        response = await client.chat.completions.create(
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


# ======================== NON-STREAMING CHAT ========================

@router.post("/chat", response_model=ChatResponse)
async def process_chat(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == request.user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Проверка дневного лимита кредитов перед обработкой запроса
    await check_billing_limit(user, estimated_cost=1, db=db)

    if request.agent:
        agent_name = request.agent
        print(f"DEBUG: Using explicit agent from request: {agent_name}")
    elif request.chat_id:
        chat_result = await db.execute(select(Chat).where(Chat.id == request.chat_id).options(selectinload(Chat.agent)))
        existing_chat = chat_result.scalar_one_or_none()
        if existing_chat and existing_chat.agent:
            agent_name = existing_chat.agent.name
            print(f"DEBUG: Using agent '{agent_name}' from existing chat {request.chat_id}")
        else:
            agent_name, is_blocked = await route_to_agent_with_check(request.message, request.user_id, db)
            if is_blocked:
                return ChatResponse(
                    response=_make_agent_disabled_response(agent_name),
                    chat_id=0
                )
    else:
        agent_name, is_blocked = await route_to_agent_with_check(request.message, request.user_id, db)
        if is_blocked:
            return ChatResponse(
                response=_make_agent_disabled_response(agent_name),
                chat_id=0
            )

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

    user_message = Message(chat_id=chat.id, role="user", content=request.message, tokens_used=0)
    db.add(user_message)

    if agent_name in AGENT_REGISTRY:
        agent_process = AGENT_REGISTRY[agent_name]
        enriched_prompt = await _enrich_system_prompt_with_rag(request.user_id, agent_name, message_text, agent.system_prompt, db)
        response_text, tokens_used = await agent_process(message_text, enriched_prompt, db, request.user_id, message_attachments)

        if (not request.chat_id) and (agent_name == "dietitian") and (response_text is None or "рацион" not in message_text.lower()):
            response_text = (
                "Здравствуйте! 👋\n\n"
                "Я — ваш ИИ-диетолог. Пожалуйста, расскажите о своих пожеланиях по питанию, целях или опишите, "
                "как обычно выглядит ваш рацион. Когда будете готовы, попросите меня «составить рацион»!"
            )
            tokens_used = 0
    else:
        # --- WHAT CAN YOU DO CHECK for default agent ---
        if _is_what_can_you_do(message_text):
            response_text = WHAT_CAN_YOU_DO_RESPONSE
            tokens_used = 0
        # --- GREETING CHECK for default agent ---
        elif _is_greeting(message_text):
            response_text = random.choice(GREETING_RESPONSES)
            tokens_used = 0
        else:
            enriched_prompt = await _enrich_system_prompt_with_rag(request.user_id, agent_name, message_text, agent.system_prompt, db)
            messages = []
            messages.append({"role": "system", "content": enriched_prompt})
            messages.extend(_history_to_llm_messages(request.history))
            _append_user_message(messages, message_text, message_attachments)

            try:
                max_tokens = calculate_max_tokens(message_text)
                response = await client.chat.completions.create(
                    model="google/gemini-3.1-flash-lite",
                    messages=messages,
                    temperature=0.7,
                    max_tokens=max_tokens,
                    timeout=60.0
                )
                response_text = response.choices[0].message.content
                
                # Get real token usage from API response
                usage = getattr(response, 'usage', None)
                if usage:
                    tokens_used = getattr(usage, 'total_tokens', 0)
                else:
                    tokens_used = 0
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"API error: {str(e)}")

    if response_text is None:
        print("ERROR: response_text is None — LLM returned no content. Inserting fallback message.")
        response_text = "Извините, произошла ошибка при обработке вашего запроса. Попробуйте ещё раз."

    assistant_message = Message(chat_id=chat.id, role="assistant", content=response_text, tokens_used=tokens_used)
    db.add(assistant_message)

    # Deduct credits only for LLM-generated responses (tokens_used > 0), not for pre-canned ones
    if tokens_used > 0:
        credits_cost = calculate_cost("gemini_3_1_flash", input_tokens=0, output_tokens=tokens_used)
        if credits_cost == 0:
            credits_cost = 1  # minimum cost for any AI interaction
        user.credits_used = (user.credits_used or 0) + credits_cost
        user.token_balance = max((user.token_balance or 0) - credits_cost, 0)
        user.last_credit_reset = date.today()
    else:
        # Pre-canned responses (greeting, what_can_you_do) — no cost
        user.last_credit_reset = date.today()

    await db.commit()
    await db.refresh(user)

    return ChatResponse(
        response=response_text,
        tokens_used=tokens_used,
        remaining_balance=user.token_balance,
        chat_id=chat.id
    )


# ======================== STREAMING CHAT ========================

@router.post("/chat/stream")
async def process_chat_stream(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    """Streaming chat endpoint. Yields SSE events with tokens and final response."""
    result = await db.execute(select(User).where(User.id == request.user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Проверка дневного лимита кредитов перед обработкой запроса
    await check_billing_limit(user, estimated_cost=1, db=db)

    if request.agent:
        agent_name = request.agent
        print(f"DEBUG: Using explicit agent from request: {agent_name}")
    elif request.chat_id:
        chat_result = await db.execute(select(Chat).where(Chat.id == request.chat_id).options(selectinload(Chat.agent)))
        existing_chat = chat_result.scalar_one_or_none()
        if existing_chat and existing_chat.agent:
            agent_name = existing_chat.agent.name
            print(f"DEBUG: Using agent '{agent_name}' from existing chat {request.chat_id}")
        else:
            agent_name, is_blocked = await route_to_agent_with_check(request.message, request.user_id, db)
            if is_blocked:
                async def stream_blocked():
                    early_meta = {
                        'type': 'chat_created',
                        'chat_id': 0,
                        'is_new_chat': True,
                    }
                    yield f"data: {json.dumps(early_meta)}\n\n"
                    yield f"data: {json.dumps({'type': 'token', 'content': _make_agent_disabled_response(agent_name)})}\n\n"
                    yield f"data: {json.dumps({'type': 'done', 'chat_id': 0, 'is_new_chat': True, 'full_content': _make_agent_disabled_response(agent_name)})}\n\n"
                return StreamingResponse(
                    stream_blocked(),
                    media_type="text/event-stream",
                    headers={
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "X-Accel-Buffering": "no",
                    }
                )
    else:
        agent_name, is_blocked = await route_to_agent_with_check(request.message, request.user_id, db)
        if is_blocked:
            async def stream_blocked():
                early_meta = {
                    'type': 'chat_created',
                    'chat_id': 0,
                    'is_new_chat': True,
                }
                yield f"data: {json.dumps(early_meta)}\n\n"
                yield f"data: {json.dumps({'type': 'token', 'content': _make_agent_disabled_response(agent_name)})}\n\n"
                yield f"data: {json.dumps({'type': 'done', 'chat_id': 0, 'is_new_chat': True, 'full_content': _make_agent_disabled_response(agent_name)})}\n\n"
            return StreamingResponse(
                stream_blocked(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",
                }
            )

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

    is_new_chat = False
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

    if agent_name in AGENT_REGISTRY:
        async def stream_specialized_agent():
            early_meta = {
                'type': 'chat_created',
                'chat_id': chat.id,
                'is_new_chat': is_new_chat,
            }
            yield f"data: {json.dumps(early_meta)}\n\n"

            user_message = Message(chat_id=chat.id, role="user", content=request.message, tokens_used=0)
            db.add(user_message)

            agent_module = AGENT_MODULES.get(agent_name)
            enriched_prompt = await _enrich_system_prompt_with_rag(request.user_id, agent_name, message_text, agent.system_prompt, db)

            if agent_module and hasattr(agent_module, 'process_stream'):
                full_response = ""
                async for event in agent_module.process_stream(message_text, enriched_prompt, db, request.user_id, message_attachments):
                    if event.type == "token":
                        full_response += event.content
                        yield stream_event_to_sse(event)
                    elif event.type == "done":
                        full_response = event.content
                        # Don't yield the agent's done event - we'll send our own with metadata
                    elif event.type == "error":
                        yield stream_event_to_sse(event)
                # Estimate tokens from response length
                tokens_used = len(full_response) // 4
            else:
                # No agent_module with process_stream — use raw LLM streaming as fallback
                full_response = ""
                async for event in _stream_llm_fallback(message_text, enriched_prompt, message_attachments):
                    if event.type == "token":
                        full_response += event.content
                    yield stream_event_to_sse(event)
                # Estimate tokens from response length
                tokens_used = len(full_response) // 4

            # Send final done event with metadata
            metadata = {
                'type': 'done',
                'chat_id': chat.id,
                'is_new_chat': is_new_chat,
                'full_content': full_response,
            }
            yield f"data: {json.dumps(metadata)}\n\n"

            assistant_message = Message(chat_id=chat.id, role="assistant", content=full_response, tokens_used=tokens_used)
            db.add(assistant_message)

            # Deduct credits only for LLM-generated responses (tokens_used > 0), not for pre-canned ones
            if tokens_used > 0:
                input_token_est = len(message_text) // 4
                output_token_est = len(full_response) // 4
                credits_cost = calculate_cost("gemini_3_1_flash", input_tokens=input_token_est, output_tokens=output_token_est)
                if credits_cost == 0:
                    credits_cost = 1  # minimum cost for any AI interaction
                user.credits_used = (user.credits_used or 0) + credits_cost
                user.token_balance = max((user.token_balance or 0) - credits_cost, 0)
                user.last_credit_reset = date.today()
            else:
                user.last_credit_reset = date.today()
            await db.commit()

        return StreamingResponse(
            stream_specialized_agent(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )

    # For default LLM, stream tokens
    async def generate():
        full_response = ""

        # Save user message
        user_message = Message(chat_id=chat.id, role="user", content=request.message, tokens_used=0)
        db.add(user_message)

        # --- WHAT CAN YOU DO CHECK for default agent ---
        if _is_what_can_you_do(message_text):
            full_response = WHAT_CAN_YOU_DO_RESPONSE
            async for chunk in stream_text_with_delay(full_response, chunk_size=5, delay_ms=5):
                yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"
        # --- GREETING CHECK for default agent ---
        elif _is_greeting(message_text):
            greeting = random.choice(GREETING_RESPONSES)
            full_response = greeting
            async for chunk in stream_text_with_delay(greeting, chunk_size=5, delay_ms=5):
                yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"
        else:
            enriched_prompt = await _enrich_system_prompt_with_rag(request.user_id, agent_name, message_text, agent.system_prompt, db)
            messages = []
            messages.append({"role": "system", "content": enriched_prompt})
            messages.extend(_history_to_llm_messages(request.history))
            _append_user_message(messages, message_text, message_attachments)

            try:
                max_tokens = calculate_max_tokens(message_text)
                stream = await client.chat.completions.create(
                    model="google/gemini-3.1-flash-lite",
                    messages=messages,
                    temperature=0.7,
                    max_tokens=max_tokens,
                    timeout=60.0,
                    stream=True,
                )

                async for chunk in stream:
                    if chunk.choices and len(chunk.choices) > 0:
                        delta = chunk.choices[0].delta
                        if delta and delta.content:
                            token = delta.content
                            full_response += token
                            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

                if not full_response.strip():
                    full_response = "Извините, произошла ошибка. Попробуйте ещё раз."
                    async for chunk in stream_text_with_delay(full_response, chunk_size=5, delay_ms=5):
                        yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"

            except Exception as e:
                full_response = f"Извините, произошла ошибка при обработке запроса: {str(e)[:100]}..."
                async for chunk in stream_text_with_delay(full_response, chunk_size=5, delay_ms=5):
                    yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"

        # Save assistant message
        assistant_message = Message(chat_id=chat.id, role="assistant", content=full_response, tokens_used=0)
        db.add(assistant_message)

        # Deduct credits only for LLM-generated responses, not for pre-canned ones
        # For default agent streaming, check if we had a pre-canned response (short messages without LLM call)
        is_pre_canned = _is_what_can_you_do(request.message) or _is_greeting(request.message)
        if not is_pre_canned:
            input_token_est = len(request.message) // 4
            output_token_est = len(full_response) // 4
            credits_cost = calculate_cost("gemini_3_1_flash", input_tokens=input_token_est, output_tokens=output_token_est)
            if credits_cost == 0 and (input_token_est > 0 or output_token_est > 0):
                credits_cost = 1
            elif credits_cost == 0:
                credits_cost = 1
            user.credits_used = (user.credits_used or 0) + credits_cost
            user.token_balance = max((user.token_balance or 0) - credits_cost, 0)
        user.last_credit_reset = date.today()
        await db.commit()

        metadata = {
            'type': 'done',
            'chat_id': chat.id,
            'is_new_chat': is_new_chat,
            'full_content': full_response,
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


async def _stream_llm_fallback(message_text: str, system_prompt: str, attachments: list[dict] | None = None) -> AsyncGenerator[StreamEvent, None]:
    """Fallback: stream directly from LLM when agent has no process_stream. Real streaming, no emulation."""
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": _build_user_llm_content(message_text, attachments)},
    ]
    async for event in stream_llm_response(
        client=client,
        model="google/gemini-3.1-flash-lite",
        messages=messages,
        temperature=0.7,
        max_tokens=3000,
    ):
        yield event


# ======================== CHAT CREATION ENDPOINT ========================

class ChatCreateRequest(BaseModel):
    user_id: int
    title: Optional[str] = None
    agent_type: Optional[str] = None
    welcome_message: Optional[str] = None


@router.post("/chats")
async def create_chat(request: ChatCreateRequest, db: AsyncSession = Depends(get_db)):
    """Create a new chat with optional welcome message."""
    result = await db.execute(select(User).where(User.id == request.user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if request.agent_type:
        agent_name = request.agent_type
    else:
        agent_name = "default"

    if agent_name == "default":
        result = await db.execute(select(Agent).where(Agent.name == "agents"))
        agent = result.scalar_one_or_none()
        if not agent:
            agent = Agent(
                name="agents",
                description="Main AI orchestrator and personal assistant",
                system_prompt="Ты — Ixteria, ИИ-управляющий. Отвечай по существу, без лишних формальностей.",
                is_active=True
            )
            db.add(agent)
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

    chat_title = request.title or "Новый чат"
    chat = Chat(user_id=request.user_id, agent_id=agent.id, title=chat_title)
    db.add(chat)
    await db.flush()

    if request.welcome_message:
        assistant_message = Message(chat_id=chat.id, role="assistant", content=request.welcome_message, tokens_used=0)
        db.add(assistant_message)
        await db.commit()
        await db.refresh(chat)
    else:
        await db.commit()
        await db.refresh(chat)

    return {
        "id": chat.id,
        "chat_id": chat.id,
        "title": chat.title,
        "agent_name": agent.name,
    }


# ======================== OTHER ENDPOINTS ========================

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
        plan=user.plan or "FREE",
        credits_used=user.credits_used or 0,
        theme_preference=user.theme_preference,
        agents_selected=user.agents_selected or False,
        profile_completed=user.profile_completed or False,
        display_name=user.display_name,
        birth_date=user.birth_date.isoformat() if user.birth_date else None,
        offer_accepted_at=user.offer_accepted_at.isoformat() if user.offer_accepted_at else None,
        privacy_accepted_at=user.privacy_accepted_at.isoformat() if user.privacy_accepted_at else None
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


@router.put("/user/{user_id}/username")
async def update_username(user_id: int, request: UpdateUsernameRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not request.username or not request.username.strip():
        raise HTTPException(status_code=400, detail="Username cannot be empty")

    user.username = request.username.strip()
    await db.commit()

    return {"message": "Username updated successfully", "username": user.username}


class ProfileSetupRequest(BaseModel):
    display_name: str
    birth_date: str


@router.put("/user/{user_id}/profile-setup")
async def profile_setup(user_id: int, request: ProfileSetupRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.display_name = request.display_name
    user.profile_completed = True
    
    # Parse birth_date string to Date
    from datetime import datetime
    try:
        birth_date = datetime.strptime(request.birth_date, "%Y-%m-%d").date()
        user.birth_date = birth_date
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid birth_date format. Use YYYY-MM-DD")

    await db.commit()

    return {"message": "Profile setup completed successfully"}


@router.get("/chats/{chat_id}/messages")
async def get_chat_messages(chat_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Message).where(Message.chat_id == chat_id).order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()

    chat_result = await db.execute(
        select(Chat).where(Chat.id == chat_id).options(selectinload(Chat.agent))
    )
    chat = chat_result.scalar_one_or_none()
    agent_name = chat.agent.name if chat and chat.agent else None

    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "tokens_used": m.tokens_used,
            "agent_name": agent_name if m.role == "assistant" else None,
            "created_at": m.created_at.isoformat()
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


# ======================== AVATAR UPLOAD ========================

@router.post("/user/{user_id}/avatar")
async def upload_avatar(user_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """
    Upload a user avatar image. Saves it to the uploads/ directory and
    updates the user's avatar_url in the database.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate file is an image
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    UPLOAD_DIR = "uploads"
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)

    # Preserve original extension
    file_extension = os.path.splitext(file.filename or "avatar.jpg")[1] or ".jpg"
    filename = f"avatar_{user_id}_{uuid.uuid4().hex[:8]}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Update user's avatar_url in database
    avatar_url = f"/uploads/{filename}"
    user.avatar_url = avatar_url
    await db.commit()

    return {"url": avatar_url, "message": "Avatar updated successfully"}


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
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
async def transcribe_audio(
    file: UploadFile = File(...),
    user_id: int = Form(...),
    duration_seconds: float = Form(...),
    db: AsyncSession = Depends(get_db),
):
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="File must be an audio file")

    # Длительность необходима для корректного расчёта стоимости. Нулевое
    # значение раньше позволяло успешно транскрибировать аудио бесплатно.
    if not math.isfinite(duration_seconds) or duration_seconds <= 0:
        raise HTTPException(status_code=400, detail="duration_seconds must be greater than 0")

    # Проверка кредитов перед транскрибацией
    audio_minutes = duration_seconds / 60.0
    credits_cost = calculate_cost("mistral_audio", audio_minutes=audio_minutes)
    credits_cost = max(credits_cost, 1)  # minimum cost for any paid transcription

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await check_billing_limit(user, estimated_cost=credits_cost, db=db)

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
            print(f"Transcription API error: status={response.status_code}, body={response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Transcription API error: {response.text}",
            )

        raw_text = response.text
        print(f"Transcription raw response (first 500 chars): {raw_text[:500]}")

        try:
            result = response.json()
        except Exception as json_err:
            print(f"Transcription JSON parse error: {json_err}\n{traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"Failed to parse transcription response: {raw_text[:300]}")

        print(f"Transcription API response: {json.dumps(result, indent=2, ensure_ascii=False)[:500]}")

        transcribed_text = result.get("text", "") if isinstance(result, dict) else str(result)

        if not transcribed_text:
            raise HTTPException(status_code=400, detail="Transcription result is empty")

        # --- Deduct credits for transcription ---
        # Блокируем строку пользователя только на короткой финальной операции,
        # чтобы параллельные транскрибации не перетёрли изменения баланса.
        user_result = await db.execute(
            select(User).where(User.id == user_id).with_for_update()
        )
        user = user_result.scalar_one_or_none()
        if user:
            # Сбрасываем счётчик при наступлении нового дня
            today = date.today()
            if user.last_credit_reset is None or user.last_credit_reset < today:
                user.credits_used = 0
                user.last_credit_reset = today

            user.credits_used = (user.credits_used or 0) + credits_cost
            user.token_balance = max((user.token_balance or 0) - credits_cost, 0)
            user.last_credit_reset = today
            await db.commit()

        return {"text": transcribed_text}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Transcription error: {e}\n{traceback.format_exc()}")
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

@router.delete("/user/{user_id}/diet-profile")
async def delete_diet_profile(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserDietProfile).where(UserDietProfile.user_id == user_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Diet profile not found")
    await db.delete(profile)
    await db.commit()
    return {"message": "Diet profile deleted"}

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
async def create_chat_v2(data: dict = Body(...), db: AsyncSession = Depends(get_db)):
    """Create a new chat. Used by dietitian for food-query chat creation."""
    user_id = data.get("user_id")
    title = data.get("title", "Новый чат")
    agent_name = data.get("agent_type", "dietitian")
    welcome_message = data.get("welcome_message")

    result = await db.execute(select(Agent).where(Agent.name == agent_name))
    agent = result.scalar_one_or_none()
    if not agent:
        agent = Agent(
            name=agent_name,
            description=f"{agent_name.capitalize()} agent",
            system_prompt=(
                "Ты — диетолог. Твоя задача — составлять персональные рационы питания на основе пожеланий пользователя, "
                "его параметров (рост, вес, возраст, пол, цель) и предпочтений."
            ) if agent_name == "dietitian" else f"Ты — {agent_name}, специализированный ИИ-агент.",
            is_active=True
        )
        db.add(agent)
        await db.flush()

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
        response_text, tokens_used = await agent_process(user_message, agent.system_prompt, db, chat.user_id)
    else:
        try:
            response = await client.chat.completions.create(
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
            
            # Get real token usage from API response
            usage = getattr(response, 'usage', None)
            if usage:
                tokens_used = getattr(usage, 'total_tokens', 0)
            else:
                tokens_used = 0
        except Exception as e:
            response_text = "Привет! Я твой диетолог. Расскажи, что ты съел сегодня — помогу посчитать калории и БЖУ."
            tokens_used = 0

    assistant_msg = Message(chat_id=chat.id, role="assistant", content=response_text, tokens_used=tokens_used)
    db.add(assistant_msg)

    await db.commit()
    return {"response": response_text, "chat_id": chat.id}


# ============================================================
# RAG
# ============================================================

from src.rag.context_builder import ContextBuilder
from src.rag.agent_bridge import AgentBridge
from src.rag.extractor import KnowledgeExtractor


# ---- RAG personalization guard ----
PERSONAL_KEYWORDS = {
    "мой", "моя", "моё", "мои", "моего", "моей", "моему", "моим",
    "моём", "моем", "мои", "моих", "моими",
    "мне", "меня", "у меня", "для меня", "я", "меня",
    "свои", "свой", "своя", "своё", "свое",
    "моему", "моим",
}

# Agent-specific personal keywords (когда вопрос касается профиля этого агента)
AGENT_PROFILE_KEYWORDS = {
    "dietitian": {"рацион", "диета", "питание", "еда", "меню", "вес", "цель", "бжу", "калории", "продукты"},
    "secretary": {"заметк", "напоминани", "событи", "план", "расписани", "задач", "дел"},
    "psychologist": {"настроени", "эмоци", "состоян", "чувств", "тревог", "стресс", "сон", "дневник"},
    "mentor": {"проект", "обучени", "курс", "навык", "карьер", "цел", "развити", "направлени"},
    "accountant": {"финанс", "доход", "расход", "бюджет", "капитал", "портфел", "инвестици", "счет", "трат"},
}


def _needs_rag_personalization(user_id: int, agent_name: str, message: str, db: AsyncSession) -> bool:
    """
    Определяет, нужно ли обогащать системный промпт RAG-контекстом пользователя.
    Возвращает False для общих вопросов, не требующих персонализации.
    """
    message_lower = message.strip().lower()

    # 1. Если сообщение слишком короткое (простое приветствие) — RAG не нужен
    if len(message_lower.split()) <= 3:
        return False

    # 2. Проверка наличия личных/притяжательных местоимений
    words = set(message_lower.split())
    has_personal_ref = bool(words & PERSONAL_KEYWORDS) or any(p in message_lower for p in ["у меня", "для меня", "мне "])

    # 3. Для специализированных агентов — проверяем, касается ли вопрос профиля
    if agent_name in AGENT_PROFILE_KEYWORDS:
        profile_keywords = AGENT_PROFILE_KEYWORDS[agent_name]
        has_profile_relevance = any(kw in message_lower for kw in profile_keywords)
        # Если есть и личная отсылка, и релевантность профилю — нужна персонализация
        if has_personal_ref and has_profile_relevance:
            return True
        # Если вопрос явно про профиль агента ("составь рацион", "запиши заметку") — нужна персонализация
        if has_profile_relevance and (has_personal_ref or len(message_lower.split()) > 5):
            return True
        # Если вопрос общий в рамках агента, но без личной отсылки — не нужно
        return False

    # 4. Для default/общего агента — персонализация нужна только при личных отсылках
    if agent_name == "default":
        return has_personal_ref

    # 5. Для неизвестных агентов — по умолчанию без персонализации
    return False


async def _enrich_system_prompt_with_rag(user_id: int, agent_name: str, message: str, system_prompt: str, db: AsyncSession) -> str:
    """Fetch RAG context for the user and prepend it to the agent's system prompt."""

    # Проверяем, нужна ли персонализация
    if not _needs_rag_personalization(user_id, agent_name, message, db):
        return system_prompt
    try:
        builder = ContextBuilder(db, client)
        rag_context = await builder.build_context(user_id, agent_name, message)
        if rag_context and rag_context.strip():
            enriched = f"[КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ (ИСПОЛЬЗУЙ ЭТИ ДАННЫЕ ПРИ ОТВЕТЕ)]\n{rag_context}\n\n[СИСТЕМНЫЙ ПРОМПТ]\n{system_prompt}"
            return enriched
    except Exception as e:
        logger.error(f"RAG enrichment failed for agent {agent_name}: {e}")
    return system_prompt


class RAGContextRequest(BaseModel):
    user_id: int = 1
    agent: str = "ixteria"
    message: str = ""


class AgentAskRequest(BaseModel):
    user_id: int = 1
    requester_agent: str = "ixteria"
    target_agent: str = ""
    query: str = ""


@router.post("/rag/context")
async def get_rag_context(request: RAGContextRequest, db: AsyncSession = Depends(get_db)):
    try:
        builder = ContextBuilder(db, client)
        ctx = await builder.build_context(request.user_id, request.agent or "ixteria", request.message)
        return {"success": True, "context": ctx}
    except Exception as e:
        logger.error(f"RAG context error: {e}")
        return {"success": False, "error": str(e)}


@router.get("/rag/profile")
async def get_rag_profile(user_id: int = 1, db: AsyncSession = Depends(get_db)):
    try:
        builder = ContextBuilder(db, client)
        profile = await builder.get_profile_json(user_id)
        return {"success": True, "profile": profile}
    except Exception as e:
        logger.error(f"RAG profile error: {e}")
        return {"success": False, "error": str(e)}


@router.post("/rag/agent-ask")
async def agent_ask(request: AgentAskRequest, db: AsyncSession = Depends(get_db)):
    try:
        bridge = AgentBridge(db, client)
        result = await bridge.agent_ask(
            request.user_id, request.requester_agent,
            request.target_agent, request.query,
        )
        return result
    except Exception as e:
        logger.error(f"Agent ask error: {e}")
        return {"success": False, "error": str(e)}


@router.get("/rag/knowledge")
async def get_rag_knowledge(user_id: int = 1, agent_name: str = "ixteria", limit: int = 50, db: AsyncSession = Depends(get_db)):
    try:
        bridge = AgentBridge(db)
        knowledge = await bridge.get_agent_knowledge(user_id, agent_name, limit)
        return {"success": True, "knowledge": knowledge}
    except Exception as e:
        logger.error(f"RAG knowledge error: {e}")
        return {"success": False, "error": str(e)}


@router.post("/rag/extract")
async def trigger_extraction(
    user_id: int = 1,
    agent_name: str = "ixteria",
    message: str = "",
    db: AsyncSession = Depends(get_db),
):
    try:
        extractor = KnowledgeExtractor(db, client)
        facts = await extractor.extract_and_store(
            user_id=user_id,
            agent_name=agent_name,
            content=message,
        )
        return {"success": True, "facts_extracted": len(facts), "facts": facts}
    except Exception as e:
        logger.error(f"Knowledge extraction error: {e}")
        return {"success": False, "error": str(e)}