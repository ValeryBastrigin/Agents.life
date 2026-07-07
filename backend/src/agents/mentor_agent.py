import json
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from src.config import client
from src.models import User
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

async def analyze_dream(dream: str, user_id: int, db: AsyncSession) -> dict:
    """
    Analyze user's dream using AI mentor agent.
    Returns structured plan with branches, tasks and resources.
    """
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
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


async def _save_analysis_to_db(dream: str, branches: list, user_id: int, db: AsyncSession):
    """Save dream analysis to database for history."""
    try:
        from src.models import DreamAnalysis
        analysis = DreamAnalysis(
            user_id=user_id,
            dream_text=dream,
            branches_data=json.dumps(branches, ensure_ascii=False),
            created_at=None  # will use default
        )
        db.add(analysis)
        await db.commit()
    except ImportError:
        # DreamAnalysis model might not exist yet, just skip saving
        logger.warning("DreamAnalysis model not found, skipping save")
        pass
    except Exception as e:
        logger.error(f"Failed to save analysis: {e}")
        await db.rollback()


async def add_active_goal(title: str, branch_type: str, resources: list, user_id: int, db: AsyncSession):
    """Add a goal to user's active goals."""
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
    except ImportError:
        # ActiveGoal model might not exist - create inline
        logger.warning("ActiveGoal model not found")
        return {"success": False, "error": "Database model not available"}


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
    except ImportError:
        logger.warning("ActiveGoal model not found")
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
    except ImportError:
        return {"success": False, "error": "Database model not available"}