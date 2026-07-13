import json
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from src.config import client
from src.models import User, DreamGoal, Chat, Message
import logging

logger = logging.getLogger(__name__)

DREAM_ANALYSIS_SYSTEM_PROMPT = """Ты — опытный ментор и стратег. Твоя задача — проанализировать мечту пользователя и разбить её на реальные, достижимые цели.

Правила анализа:
1. Оцени реалистичность мечты (1-10). Если мечта слишком абстрактная или нереалистичная (рейтинг < 3), предложи её конкретизацию.
2. Разбей мечту на 4-7 направлений развития (ветвей дерева).
3. Для каждого направления укажи:
   - title: название направления
   - description: краткое описание
   - type: тип (books, skills, tasks, health, finance, social, spirit)
   - tasks: массив конкретных задач (2-4 задачи на направление)
     - title: название задачи
     - resources: массив рекомендованных материалов (книги, статьи, курсы) — 2-3 на задачу
       - title: название
       - description: описание
       - type: тип (book, article, course, video, practice)

4. Критически оценивай каждую задачу: она должна быть конкретной, измеримой и достижимой в течение 1-3 месяцев.

Ответ верни ТОЛЬКО в формате JSON:
{
  "feasibility_rating": число от 1 до 10,
  "feasibility_comment": "краткий комментарий о реалистичности",
  "suggested_refinement": "если нужно, предложение уточнить мечту (или пустая строка)",
  "branches": [
    {
      "title": "Название направления",
      "description": "Описание",
      "type": "тип",
      "tasks": [
        {
          "title": "Название задачи",
          "resources": [
            {
              "title": "Название материала",
              "description": "Описание",
              "type": "book|article|course|video|practice"
            }
          ]
        }
      ]
    }
  ]
}"""

DREAM_STEPS_SYSTEM_PROMPT = """Ты — опытный ментор и стратег, работающий в режиме «Мультидрим».

Правила:
1. Проанализируй текст пользователя о его мечте.
2. Если в тексте упоминается несколько направлений (например, книга и IT-продукт) — создай для каждого отдельный объект в массиве "goals". Не объединяй разные мечты в один блок.
3. Если цель одна — всё равно оборачивай результат в массив с одним объектом.
4. Каждой цели присвой одну из категорий: [MATERIAL_ASSET], [SKILL_DEVELOPMENT], [CAREER_GROWTH], [LIFE_EXPERIENCE], [EXISTENTIAL_WELLBEING], [ABSTRACT_AMBITION].
5. Для каждой цели сформулируй 4-6 вариативных шагов, привязанных к специфике категории.

Верни ответ ТОЛЬКО в формате JSON:
{
  "goals": [
    {
      "category": "выбранная_категория",
      "goal_summary": "краткое название цели до 5 слов",
      "analysis": "короткий комментарий поддержки",
      "steps": [
        {"id": 1, "text": "название шага", "description": "краткое пояснение"},
        {"id": 2, "text": "название шага", "description": "краткое пояснение"}
      ]
    }
  ]
}"""

MENTOR_SYSTEM_PROMPT_TEMPLATE = """Пользователь хочет достичь цели: {goal_summary}. Категория: {category}. 
Выбранные шаги: {selected_step_ids}. 
Твоя роль - быть ментором, напоминать о выбранных шагах и помогать с реализацией."""


async def analyze_dream(dream: str, user_id: int, db: AsyncSession) -> dict:
    """
    Analyze user's dream using AI mentor agent.
    Returns structured plan with branches, tasks and resources.
    """
    try:
        response = client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=[
                {"role": "system", "content": DREAM_ANALYSIS_SYSTEM_PROMPT},
                {"role": "user", "content": f"Проанализируй эту мечту: {dream}"}
            ],
            temperature=0.7,
            max_tokens=3000,
            response_format={"type": "json_object"}
        )

        result_text = response.choices[0].message.content
        result = json.loads(result_text)
        
        # Clean up response - filter out any branches/tasks with empty content
        clean_branches = []
        for branch in result.get("branches", []):
            if not branch.get("title") or not branch.get("type"):
                continue
            clean_tasks = []
            for task in branch.get("tasks", []):
                if not task.get("title"):
                    continue
                clean_resources = [
                    r for r in task.get("resources", [])
                    if r.get("title")
                ]
                clean_tasks.append({
                    "title": task["title"],
                    "resources": clean_resources
                })
            if len(clean_tasks) > 0:
                clean_branches.append({
                    "title": branch["title"],
                    "description": branch.get("description", ""),
                    "type": branch["type"],
                    "tasks": clean_tasks
                })

        # Save analysis to database
        await _save_analysis_to_db(dream, clean_branches, user_id, db)

        return {
            "success": True,
            "feasibility_rating": result.get("feasibility_rating", 5),
            "feasibility_comment": result.get("feasibility_comment", ""),
            "branches": clean_branches
        }

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response: {e}")
        return {
            "success": False,
            "error": "Не удалось обработать ответ AI. Попробуйте ещё раз.",
            "branches": []
        }
    except Exception as e:
        logger.error(f"Dream analysis failed: {e}")
        return {
            "success": False,
            "error": "Произошла ошибка при анализе. Попробуйте позже.",
            "branches": []
        }


async def analyze_dream_steps(dream: str, user_id: int, db: AsyncSession) -> dict:
    """
    Analyze user's dream and generate categorized steps (Мультидрим-режим).
    Returns goals array with category, goal_summary, analysis, and steps for each goal.
    """
    try:
        response = client.chat.completions.create(
            model="google/gemini-3.1-flash-lite",
            messages=[
                {"role": "system", "content": DREAM_STEPS_SYSTEM_PROMPT},
                {"role": "user", "content": f"Мечта пользователя: {dream}"}
            ],
            temperature=0.7,
            max_tokens=2000,
            response_format={"type": "json_object"}
        )

        result_text = response.choices[0].message.content
        result = json.loads(result_text)

        goals = result.get("goals", [])
        
        # Validate required fields for each goal
        if not goals or not isinstance(goals, list):
            raise ValueError("Invalid response format: missing goals array")

        clean_goals = []
        for goal in goals:
            if not goal.get("category") or not goal.get("steps"):
                continue
            clean_goals.append({
                "category": goal["category"],
                "goal_summary": goal.get("goal_summary", "Мечта"),
                "analysis": goal.get("analysis", ""),
                "steps": goal["steps"]
            })

        if not clean_goals:
            raise ValueError("No valid goals found in response")

        return {
            "success": True,
            "goals": clean_goals
        }

    except (json.JSONDecodeError, ValueError, KeyError) as e:
        logger.error(f"Failed to parse AI response for dream steps: {e}")
        return {
            "success": False,
            "error": "Не удалось обработать ответ AI. Попробуйте ещё раз.",
            "goals": []
        }
    except Exception as e:
        logger.error(f"Dream steps analysis failed: {e}")
        return {
            "success": False,
            "error": "Произошла ошибка при анализе. Попробуйте позже.",
            "goals": []
        }


async def save_dream_goal(dream_text: str, category: str, goal_summary: str, analysis: str, 
                          steps: list, user_id: int, db: AsyncSession) -> dict:
    """Save dream goal with steps to database."""
    try:
        dream_goal = DreamGoal(
            user_id=user_id,
            dream_text=dream_text,
            category=category,
            goal_summary=goal_summary,
            analysis=analysis,
            steps_data=json.dumps(steps, ensure_ascii=False),
            selected_step_ids="[]",
            status="active"
        )
        db.add(dream_goal)
        await db.commit()
        await db.refresh(dream_goal)
        
        return {
            "success": True,
            "goal_id": dream_goal.id,
            "goal_summary": goal_summary,
            "analysis": analysis,
            "steps": steps
        }
    except Exception as e:
        logger.error(f"Failed to save dream goal: {e}")
        await db.rollback()
        return {
            "success": False,
            "error": "Не удалось сохранить цель. Попробуйте позже."
        }


async def select_dream_steps(goal_id: int, selected_ids: list, user_id: int, db: AsyncSession) -> dict:
    """Save selected step ids and create a chat with mentor."""
    try:
        # Fetch the dream goal
        result = await db.execute(
            select(DreamGoal).where(
                DreamGoal.id == goal_id,
                DreamGoal.user_id == user_id
            )
        )
        goal = result.scalar_one_or_none()
        
        if not goal:
            return {"success": False, "error": "Цель не найдена"}

        # Update selected step ids
        goal.selected_step_ids = json.dumps(selected_ids, ensure_ascii=False)
        
        # Find mentor agent
        from src.models import Agent
        agent_result = await db.execute(
            select(Agent).where(Agent.name == "Ментор")
        )
        mentor_agent = agent_result.scalar_one_or_none()
        
        if not mentor_agent:
            return {"success": False, "error": "Агент ментор не найден"}

        # Create chat
        chat = Chat(
            user_id=user_id,
            agent_id=mentor_agent.id,
            title=f"Путь к мечте: {goal.goal_summary}",
            is_pinned=True
        )
        db.add(chat)
        await db.flush()

        # Create system message with context
        system_context = MENTOR_SYSTEM_PROMPT_TEMPLATE.format(
            goal_summary=goal.goal_summary,
            category=goal.category,
            selected_step_ids=", ".join(str(s) for s in selected_ids)
        )
        system_msg = Message(
            chat_id=chat.id,
            role="system",
            content=system_context
        )
        db.add(system_msg)
        
        # Add welcome message
        welcome_msg = Message(
            chat_id=chat.id,
            role="assistant",
            content=f"Привет! Я твой ментор. Ты поставил цель: **{goal.goal_summary}**. "
                    f"Я буду помогать тебе двигаться по выбранным шагам и поддерживать на пути. "
                    f"Расскажи, с чего хочешь начать?"
        )
        db.add(welcome_msg)

        # Link chat to goal
        goal.chat_id = chat.id
        
        await db.commit()

        return {
            "success": True,
            "goal_id": goal.id,
            "chat_id": chat.id,
            "goal_summary": goal.goal_summary,
            "category": goal.category,
            "selected_steps": selected_ids
        }
    except Exception as e:
        logger.error(f"Failed to select dream steps: {e}")
        await db.rollback()
        return {
            "success": False,
            "error": "Не удалось сохранить выбор. Попробуйте позже."
        }


async def select_multi_dream_steps(selections: list, user_id: int, db: AsyncSession) -> dict:
    """Save selected step IDs for multiple goals and create a single chat with mentor."""
    try:
        # Fetch all selected goals
        goal_ids = [s["goal_id"] for s in selections]
        result = await db.execute(
            select(DreamGoal).where(
                DreamGoal.id.in_(goal_ids),
                DreamGoal.user_id == user_id
            )
        )
        goals = result.scalars().all()
        
        if not goals or len(goals) != len(goal_ids):
            return {"success": False, "error": "Некоторые цели не найдены"}

        # Build goal lookup
        goal_map = {g.id: g for g in goals}
        
        # Find mentor agent
        from src.models import Agent
        agent_result = await db.execute(
            select(Agent).where(Agent.name == "Ментор")
        )
        mentor_agent = agent_result.scalar_one_or_none()
        
        if not mentor_agent:
            return {"success": False, "error": "Агент ментор не найден"}

        # Build a combined title from all goals
        summaries = []
        goals_context = ""
        for sel in selections:
            g = goal_map[sel["goal_id"]]
            summaries.append(g.goal_summary)
            g.selected_step_ids = json.dumps(sel["selected_ids"], ensure_ascii=False)
            goals_context += f"- {g.goal_summary} (категория: {g.category}, шаги: {', '.join(str(s) for s in sel['selected_ids'])})\n"

        title_text = "Путь к мечте: " + ", ".join(summaries[:3])
        if len(summaries) > 3:
            title_text += f" и ещё {len(summaries) - 3}"

        # Create a single chat
        chat = Chat(
            user_id=user_id,
            agent_id=mentor_agent.id,
            title=title_text,
            is_pinned=True
        )
        db.add(chat)
        await db.flush()

        # Create system message with context for all goals
        system_context = f"""Пользователь поставил несколько целей для своей мечты:

{goals_context}

Твоя роль — быть ментором, напоминать о выбранных шагах по всем направлениям и помогать с реализацией. Спрашивай о прогрессе по каждой цели."""
        system_msg = Message(
            chat_id=chat.id,
            role="system",
            content=system_context
        )
        db.add(system_msg)
        
        # Add welcome message
        all_steps = []
        for sel in selections:
            g = goal_map[sel["goal_id"]]
            steps_data = json.loads(g.steps_data) if isinstance(g.steps_data, str) else g.steps_data
            selected_steps_text = []
            for s in steps_data:
                if s["id"] in sel["selected_ids"]:
                    selected_steps_text.append(f"- {s['text']}: {s.get('description', '')}")
            all_steps.append(f"**{g.goal_summary}** ({g.category}):\n" + "\n".join(selected_steps_text))

        welcome_msg = Message(
            chat_id=chat.id,
            role="assistant",
            content=f"Привет! Я твой ментор. Ты поставил несколько целей для своей мечты:\n\n"
                    f"{chr(10).join(all_steps)}\n\n"
                    f"Я буду помогать тебе двигаться по всем выбранным направлениям. "
                    f"Расскажи, с чего хочешь начать?"
        )
        db.add(welcome_msg)

        # Link all goals to the same chat
        for sel in selections:
            g = goal_map[sel["goal_id"]]
            g.chat_id = chat.id
        
        await db.commit()

        return {
            "success": True,
            "chat_id": chat.id,
            "goals": [
                {
                    "goal_id": g.id,
                    "goal_summary": g.goal_summary,
                    "category": g.category,
                    "selected_steps": [s["selected_ids"] for s in selections if s["goal_id"] == g.id][0]
                }
                for g in goals
            ]
        }
    except Exception as e:
        logger.error(f"Failed to select multi dream steps: {e}")
        await db.rollback()
        return {
            "success": False,
            "error": "Не удалось сохранить выбор. Попробуйте позже."
        }


async def _save_analysis_to_db(dream: str, branches: list, user_id: int, db: AsyncSession):
    """Save dream analysis to database for history."""
    try:
        analysis = DreamAnalysis(
            user_id=user_id,
            dream_text=dream,
            branches_data=json.dumps(branches, ensure_ascii=False),
            created_at=None  # will use default
        )
        db.add(analysis)
        await db.commit()
    except Exception as e:
        logger.error(f"Failed to save analysis: {e}")
        await db.rollback()


async def add_active_goal(title: str, branch_type: str, resources: list, user_id: int, db: AsyncSession):
    """Add a goal to user's active goals."""
    try:
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