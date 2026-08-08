import json
from typing import Optional, AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from src.config import client
from src.models import User, DreamGoal, Chat, Message
from src.image_utils import build_llm_user_message
from src.agents.streaming import stream_llm_response, StreamEvent
import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------
# Material / context helpers
# ---------------------------------------------------------------

async def _build_user_model(user_id: int, db: AsyncSession) -> Optional[User]:
    """Load user row with dream-goals eagerly loaded."""
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.dream_goals))
    )
    return result.scalar_one_or_none()


def _format_goals(user: Optional[User]) -> str:
    """Pretty-print the user's dream goals."""
    if not user or not user.dream_goals:
        return "Нет целей."
    lines = []
    for goal in user.dream_goals:
        lines.append(
            f"- {goal.title} (ветка {goal.branch_type}, статус {goal.status})"
        )
    return "\n".join(lines)


def _chat_history_to_str(history: list[dict] | None) -> str:
    """Convert an existing chat history (list of role/content dicts) into a string."""
    if not history:
        return "История чата пуста."
    lines = []
    for item in history[-20:]:
        role = item.get("role", "user")
        content = item.get("content", "")
        if isinstance(content, list):
            # structured content – extract text parts
            text_parts = [p["text"] for p in content if isinstance(p, dict) and p.get("type") == "text"]
            content = "\n".join(text_parts) or "(вложение)"
        label = "Пользователь" if role == "user" else "Ассистент"
        lines.append(f"{label}: {content}")
    return "\n".join(lines)


# ---------------------------------------------------------------
# Dream / branch logic (pre-existing helpers)
# ---------------------------------------------------------------

async def analyze_dream(user_id: int, dream_text: str, db: AsyncSession) -> dict:
    """Analyze a user's dream and suggest branches of development."""
    user = await _build_user_model(user_id, db)
    goals = _format_goals(user)

    prompt = f"""Ты — ИИ-ментор. Проанализируй мечту пользователя и предложи 3-5 веток развития (карьера, здоровье, финансы, отношения, хобби, творчество, обучение).

Текущие цели пользователя:
{goals}

Мечта: {dream_text}

Для каждой ветки укажи:
- Название ветки (branch_type)
- Заголовок (title) — конкретная цель
- Ресурсы (resources) — список из 2-4 ресурсов (книги, курсы, приложения, практики), каждый с полями: name, type (book/course/app/practice), description, url (пустая строка если нет)

Верни ТОЛЬКО JSON-массив, без markdown-разметки:
[{{"branch_type": "...", "title": "...", "resources": [{{"name": "...", "type": "...", "description": "...", "url": ""}}]}}]"""

    try:
        response = await client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=2000
        )
        content = response.choices[0].message.content or "[]"
        # Strip markdown fences if present
        content = content.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        branches = json.loads(content)
        return {"success": True, "branches": branches}
    except Exception as e:
        logger.error(f"Dream analysis failed: {e}")
        return {"success": False, "error": str(e)}


async def recommend_resources(branch_type: str, goal_title: str, user_id: int, db: AsyncSession) -> dict:
    """Recommend learning resources for a specific development branch."""
    prompt = f"""Ты — ИИ-ментор. Порекомендуй 5-6 ресурсов для ветки развития "{branch_type}".

Цель: {goal_title}

Ресурсы должны быть практическими и актуальными (2023-2026):
- Книги (2-3)
- Курсы / видео (1-2)
- Приложения / инструменты (1)
- Практики / упражнения (1)

Каждый ресурс: name, type (book/course/app/practice), description (краткое), url (реальная ссылка если знаешь, иначе пустая строка).

Верни ТОЛЬКО JSON-массив:
[{{"name": "...", "type": "...", "description": "...", "url": "..."}}]"""

    try:
        response = await client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1500
        )
        content = response.choices[0].message.content or "[]"
        content = content.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        resources = json.loads(content)
        return {"success": True, "resources": resources}
    except Exception as e:
        logger.error(f"Resource recommendation failed: {e}")
        return {"success": False, "error": str(e)}


async def add_active_goal(
    user_id: int,
    title: str,
    branch_type: str,
    resources: list[dict],
    db: AsyncSession,
) -> dict:
    """Persist a new active goal into ActiveGoal table."""
    try:
        from src.models import ActiveGoal
        goal = ActiveGoal(
            user_id=user_id,
            title=title,
            branch_type=branch_type,
            resources=json.dumps(resources, ensure_ascii=False) if resources else "[]",
            status="active",
            created_at=None
        )
        db.add(goal)
        await db.commit()
        return {"success": True, "id": goal.id}
    except Exception as e:
        logger.error(f"Failed to add active goal: {e}")
        await db.rollback()
        return {"success": False, "error": "Database error"}


async def get_active_goals(user_id: int, db: AsyncSession) -> list:
    """Get all active goals for a user."""
    try:
        from src.models import ActiveGoal
        result = await db.execute(
            select(ActiveGoal)
            .where(ActiveGoal.user_id == user_id)
            .order_by(ActiveGoal.created_at.desc())
        )
        goals = result.scalars().all()
        return [
            {
                "id": g.id,
                "title": g.title,
                "branch_type": g.branch_type,
                "resources": json.loads(g.resources) if g.resources else [],
                "status": g.status,
                "created_at": g.created_at.isoformat() if g.created_at else None
            }
            for g in goals
        ]
    except Exception as e:
        logger.warning(f"Failed to get active goals: {e}")
        return []


async def update_goal_status(goal_id: int, status: str, user_id: int, db: AsyncSession) -> dict:
    """Update goal status (active/completed/cancelled)."""
    try:
        from src.models import ActiveGoal
        result = await db.execute(
            select(ActiveGoal).where(
                ActiveGoal.id == goal_id,
                ActiveGoal.user_id == user_id
            )
        )
        goal = result.scalar_one_or_none()
        if not goal:
            return {"success": False, "error": "Goal not found"}
        
        goal.status = status
        await db.commit()
        return {"success": True}
    except Exception as e:
        logger.error(f"Failed to update goal status: {e}")
        await db.rollback()
        return {"success": False, "error": str(e)}


# ---------------------------------------------------------------
# Core chat processing (streaming + legacy)
# ---------------------------------------------------------------

async def process(
    message: str, system_prompt: str, db: AsyncSession, user_id: int, attachments: list[dict] | None = None
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
    message: str, system_prompt: str, db: AsyncSession, user_id: int, attachments: list[dict] | None = None
) -> AsyncGenerator[StreamEvent, None]:
    """Streaming version — yields tokens in real time via SSE."""

    # ---- resolve text ----------
    text_content = message
    if isinstance(message, dict):
        text_content = str(message.get("text", message.get("content", message.get("message", ""))))
    elif isinstance(message, str):
        text_content = message
    else:
        text_content = str(message)

    # ---- build LLM callsite ----------
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