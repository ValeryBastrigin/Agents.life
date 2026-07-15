import logging
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.database import get_db
from src.models import User, UserAgentSettings
from pydantic import BaseModel
from typing import List

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


class UserAgentSettingsResponse(BaseModel):
    agent_name: str
    is_enabled: bool


class UpdateAgentSettingsRequest(BaseModel):
    enabled_agents: List[str]


@router.get("/user/{user_id}/agent-settings")
async def get_user_agent_settings(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get the list of enabled/disabled agents for a user.
    Returns all known agents with their enabled status.
    If no settings exist for a user, all agents are enabled by default.
    """
    # Проверяем, существует ли пользователь
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Получаем все настройки для пользователя
    result = await db.execute(
        select(UserAgentSettings).where(UserAgentSettings.user_id == user_id)
    )
    settings = result.scalars().all()

    # Известные агенты
    known_agents = ["secretary", "accountant", "dietitian", "psychologist", "mentor"]

    # Строим ответ: если настройки есть — берём их, иначе — enabled=True
    settings_map = {s.agent_name: s.is_enabled for s in settings}
    return [
        UserAgentSettingsResponse(
            agent_name=agent,
            is_enabled=settings_map.get(agent, True),
        )
        for agent in known_agents
    ]


@router.put("/user/{user_id}/agent-settings")
async def update_user_agent_settings(
    user_id: int,
    request: UpdateAgentSettingsRequest = Body(...),
    db: AsyncSession = Depends(get_db),
):
    """Update enabled/disabled agents for a user."""
    # Проверяем, существует ли пользователь
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Валидируем, что все агенты известны
    known_agents = {"secretary", "accountant", "dietitian", "psychologist", "mentor"}
    for agent_name in request.enabled_agents:
        if agent_name not in known_agents:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown agent: {agent_name}. Known agents: {', '.join(sorted(known_agents))}",
            )

    # Получаем существующие настройки
    result = await db.execute(
        select(UserAgentSettings).where(UserAgentSettings.user_id == user_id)
    )
    existing_settings = result.scalars().all()
    existing_map = {s.agent_name: s for s in existing_settings}

    enabled_set = set(request.enabled_agents)

    for agent_name in known_agents:
        is_enabled = agent_name in enabled_set
        if agent_name in existing_map:
            # Обновляем существующую запись
            existing_map[agent_name].is_enabled = is_enabled
        else:
            # Создаём новую запись
            db.add(
                UserAgentSettings(
                    user_id=user_id,
                    agent_name=agent_name,
                    is_enabled=is_enabled,
                )
            )

    await db.commit()

    return {"message": "Agent settings updated successfully", "enabled_agents": list(enabled_set)}