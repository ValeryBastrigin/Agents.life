"""
Context Builder — построение контекста для агентов.

Собирает релевантную информацию о пользователе из разных источников:
1. UserContextProfile (агрегированный профиль) — всегда подаётся
2. UserKnowledgeFact (векторный поиск) — по семантической близости к запросу
3. Данные из специализированных таблиц (dreams, diet_profiles, finances, ...)

Формирует итоговый контекст, который вставляется в system prompt агента.
"""

import json
import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .models import UserContextProfile, UserKnowledgeFact, EMBEDDING_DIM
from .knowledge_base import KnowledgeBase

logger = logging.getLogger(__name__)


class ContextBuilder:
    """
    Строит контекст для агента на основе всех доступных источников.
    
    Использование:
        builder = ContextBuilder(db, openai_client)
        context = await builder.build_context(user_id, agent_name, user_message)
        # context можно вставить в system prompt агента
    """

    # Максимальное количество токенов для контекста (~2000 слов)
    MAX_CONTEXT_TOKENS = 3000

    def __init__(self, db: AsyncSession, openai_client=None):
        self.db = db
        self.kb = KnowledgeBase(db)
        self.client = openai_client

    async def build_context(
        self,
        user_id: int,
        agent_name: str,
        user_message: str = "",
        include_profile: bool = True,
        include_recent: bool = True,
        include_semantic: bool = True,
    ) -> str:
        """
        Построить полный контекст для агента.
        
        Args:
            user_id: ID пользователя
            agent_name: Имя агента (mentor, dietitian, psychologist, secretary, accountant)
            user_message: Текущее сообщение пользователя (для семантического поиска)
            include_profile: Включить агрегированный профиль
            include_recent: Включить последние факты
            include_semantic: Включить результаты семантического поиска
        
        Returns:
            Строка контекста для вставки в system prompt
        """
        parts = []

        # 1. Агрегированный профиль пользователя (всегда)
        if include_profile:
            profile_text = await self._get_profile_context(user_id)
            if profile_text:
                parts.append(profile_text)

        # 2. Семантически релевантные факты (если есть сообщение и клиент)
        if include_semantic and user_message and self.client:
            semantic_facts = await self._get_semantic_context(user_id, user_message, agent_name)
            if semantic_facts:
                parts.append(semantic_facts)

        # 3. Последние факты от этого агента
        if include_recent:
            recent_facts = await self._get_recent_context(user_id, agent_name)
            if recent_facts:
                parts.append(recent_facts)

        # 4. Cross-agent контекст: что другие агенты знают о пользователе
        if agent_name != "mentor":
            cross_context = await self._get_cross_agent_context(user_id, agent_name)
            if cross_context:
                parts.append(cross_context)

        context = "\n\n".join(parts)
        logger.debug(f"Built context for agent {agent_name}, user {user_id}: {len(context)} chars")
        return context

    async def _get_profile_context(self, user_id: int) -> Optional[str]:
        """Получить агрегированный профиль пользователя."""
        stmt = select(UserContextProfile).where(UserContextProfile.user_id == user_id)
        result = await self.db.execute(stmt)
        profile = result.scalar_one_or_none()

        if not profile or not profile.profile_text:
            return None

        lines = ["[ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ]", profile.profile_text]

        # Ключевые цели
        try:
            goals = json.loads(profile.key_goals) if profile.key_goals else []
            if goals:
                lines.append("\nКлючевые цели:")
                for g in goals:
                    lines.append(f"  • {g}")
        except (json.JSONDecodeError, TypeError):
            pass

        # Черты личности
        try:
            traits = json.loads(profile.personality_traits) if profile.personality_traits else []
            if traits:
                lines.append(f"\nЧерты личности: {', '.join(traits)}")
        except (json.JSONDecodeError, TypeError):
            pass

        return "\n".join(lines)

    async def _get_semantic_context(
        self, user_id: int, query: str, agent_name: str
    ) -> Optional[str]:
        """Получить семантически релевантные факты через эмбеддинг-поиск."""
        try:
            # Получить эмбеддинг запроса
            response = await self.client.embeddings.create(
                model="text-embedding-3-small",
                input=query[:8000],
            )
            query_embedding = response.data[0].embedding
            if len(query_embedding) > EMBEDDING_DIM:
                query_embedding = query_embedding[:EMBEDDING_DIM]

            # Поиск релевантных фактов (semantic tier только)
            facts = await self.kb.search_similar(
                user_id=user_id,
                query_embedding=query_embedding,
                top_k=8,
                memory_tier="semantic",
                min_importance=0.3,
            )

            if not facts:
                # Fallback: поиск среди episodic
                facts = await self.kb.search_similar(
                    user_id=user_id,
                    query_embedding=query_embedding,
                    top_k=5,
                    memory_tier="episodic",
                    min_importance=0.5,
                )

            if not facts:
                return None

            lines = ["[РЕЛЕВАНТНЫЕ ЗНАНИЯ О ПОЛЬЗОВАТЕЛЕ]"]
            for fact in facts:
                lines.append(f"  • {fact.content} (источник: {fact.source_type}, важность: {fact.importance})")

            return "\n".join(lines)

        except Exception as e:
            logger.error(f"Semantic context failed: {e}")
            return None

    async def _get_recent_context(self, user_id: int, agent_name: str) -> Optional[str]:
        """Получить последние факты, сохранённые этим агентом."""
        facts = await self.kb.get_recent_facts(
            user_id=user_id,
            limit=10,
            agent_name=agent_name,
        )

        if not facts:
            return None

        lines = ["[ИСТОРИЯ ВЗАИМОДЕЙСТВИЙ С АГЕНТОМ]"]
        for fact in facts:
            lines.append(f"  • {fact.content}")

        return "\n".join(lines)

    async def _get_cross_agent_context(self, user_id: int, agent_name: str) -> Optional[str]:
        """
        Получить важные факты от других агентов.
        
        Например, диетолог может узнать о финансовых ограничениях от бухгалтера,
        или психолог — о целях от ментора.
        """
        # Получаем semantic-факты от других агентов с высокой важностью
        stmt = (
            select(UserKnowledgeFact)
            .where(
                UserKnowledgeFact.user_id == user_id,
                UserKnowledgeFact.agent_name != agent_name,
                UserKnowledgeFact.memory_tier == "semantic",
                UserKnowledgeFact.importance >= 0.6,
            )
            .order_by(UserKnowledgeFact.importance.desc())
            .limit(5)
        )
        result = await self.db.execute(stmt)
        facts = result.scalars().all()

        if not facts:
            return None

        lines = ["[ЗНАНИЯ ОТ ДРУГИХ АГЕНТОВ]"]
        for fact in facts:
            lines.append(f"  • [{fact.agent_name}] {fact.content}")

        return "\n".join(lines)

    async def get_profile_json(self, user_id: int) -> Optional[Dict[str, Any]]:
        """
        Получить профиль пользователя в виде словаря.
        Используется для отображения на фронтенде или API.
        """
        stmt = select(UserContextProfile).where(UserContextProfile.user_id == user_id)
        result = await self.db.execute(stmt)
        profile = result.scalar_one_or_none()

        if not profile:
            return None

        def safe_json(val, default=None):
            try:
                return json.loads(val) if val else default
            except (json.JSONDecodeError, TypeError):
                return default

        return {
            "id": profile.id,
            "user_id": profile.user_id,
            "profile_text": profile.profile_text,
            "key_goals": safe_json(profile.key_goals, []),
            "health_snapshot": safe_json(profile.health_snapshot, {}),
            "finance_snapshot": safe_json(profile.finance_snapshot, {}),
            "schedule_snapshot": safe_json(profile.schedule_snapshot, {}),
            "personality_traits": safe_json(profile.personality_traits, []),
            "version": profile.version,
            "last_generated_at": profile.last_generated_at.isoformat() if profile.last_generated_at else None,
        }