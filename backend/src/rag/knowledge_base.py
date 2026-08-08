"""
Knowledge Base — векторное хранилище знаний о пользователе.

Операции:
- store_fact() — сохранить факт с эмбеддингом
- search_similar() — семантический поиск по pgvector (cosine distance)
- get_recent_facts() — получить последние N фактов
- delete_expired() — удалить просроченные факты
- update_importance() — пересчитать важность факта
- link_facts() — создать связь в knowledge graph
"""

import json
import logging
from typing import List, Optional, Dict, Any
from sqlalchemy import select, update, delete, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from .models import UserKnowledgeFact, EMBEDDING_DIM

logger = logging.getLogger(__name__)


class KnowledgeBase:
    """
    Низкоуровневое API для работы с векторным хранилищем user_knowledge_facts.
    Не содержит логики извлечения или эмбеддингов — только CRUD + поиск.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def store_fact(
        self,
        user_id: int,
        content: str,
        embedding: Optional[List[float]] = None,
        source_type: str = "chat",
        agent_name: str = "system",
        memory_tier: str = "episodic",
        importance: float = 0.5,
        source_timestamp=None,
        expires_at=None,
        graph_links: Optional[List[int]] = None,
    ) -> UserKnowledgeFact:
        """
        Сохранить факт о пользователе.
        
        Args:
            user_id: ID пользователя
            content: Текст факта (на русском)
            embedding: Вектор эмбеддинга (384-мерный список float)
            source_type: Тип источника (dream, food_log, diary, calendar, finance, chat, profile)
            agent_name: Имя агента-владельца (mentor, dietitian, psychologist, ...)
            memory_tier: Уровень памяти (episodic, semantic, procedural)
            importance: Важность 0..1
            source_timestamp: Время события-источника
            expires_at: Время истечения (для временных фактов)
            graph_links: Список ID связанных фактов
        
        Returns:
            Созданный объект UserKnowledgeFact
        """
        fact = UserKnowledgeFact(
            user_id=user_id,
            content=content,
            embedding=embedding,
            source_type=source_type,
            agent_name=agent_name,
            memory_tier=memory_tier,
            importance=importance,
            source_timestamp=source_timestamp,
            expires_at=expires_at,
            graph_links=json.dumps(graph_links or []),
        )
        self.db.add(fact)
        await self.db.commit()
        await self.db.refresh(fact)
        logger.debug(f"Stored fact {fact.id}: {content[:100]}...")
        return fact

    async def search_similar(
        self,
        user_id: int,
        query_embedding: List[float],
        top_k: int = 10,
        source_type: Optional[str] = None,
        agent_name: Optional[str] = None,
        memory_tier: Optional[str] = None,
        min_importance: float = 0.0,
    ) -> List[UserKnowledgeFact]:
        """
        Семантический поиск фактов по косинусному расстоянию.
        
        Args:
            user_id: ID пользователя
            query_embedding: Вектор запроса
            top_k: Количество результатов
            source_type: Фильтр по типу источника (опционально)
            agent_name: Фильтр по агенту (опционально)
            memory_tier: Фильтр по уровню памяти (опционально)
            min_importance: Минимальная важность факта
        
        Returns:
            Список фактов, отсортированных по релевантности
        """
        # Базовый запрос
        stmt = (
            select(
                UserKnowledgeFact,
                UserKnowledgeFact.embedding.cosine_distance(query_embedding).label("distance")
            )
            .where(
                UserKnowledgeFact.user_id == user_id,
                UserKnowledgeFact.embedding.isnot(None),
                UserKnowledgeFact.importance >= min_importance,
            )
        )

        # Фильтры
        if source_type:
            stmt = stmt.where(UserKnowledgeFact.source_type == source_type)
        if agent_name:
            stmt = stmt.where(UserKnowledgeFact.agent_name == agent_name)
        if memory_tier:
            stmt = stmt.where(UserKnowledgeFact.memory_tier == memory_tier)

        # Сортировка по расстоянию (чем меньше, тем ближе) + бонус за важность
        stmt = stmt.order_by(UserKnowledgeFact.embedding.cosine_distance(query_embedding) - UserKnowledgeFact.importance * 0.2).limit(top_k)

        result = await self.db.execute(stmt)
        rows = result.all()

        # Обновляем access_count для найденных фактов
        facts = []
        for row in rows:
            fact = row[0]
            fact.access_count = (fact.access_count or 0) + 1
            facts.append(fact)

        await self.db.commit()

        logger.debug(f"Search returned {len(facts)} facts (top_k={top_k})")
        return facts

    async def search_keyword(
        self,
        user_id: int,
        keyword: str,
        top_k: int = 10,
        source_type: Optional[str] = None,
        agent_name: Optional[str] = None,
    ) -> List[UserKnowledgeFact]:
        """
        Полнотекстовый поиск по содержимому фактов (ILIKE).
        Используется как fallback, когда нет эмбеддинга.
        """
        stmt = (
            select(UserKnowledgeFact)
            .where(
                UserKnowledgeFact.user_id == user_id,
                UserKnowledgeFact.content.ilike(f"%{keyword}%"),
            )
        )

        if source_type:
            stmt = stmt.where(UserKnowledgeFact.source_type == source_type)
        if agent_name:
            stmt = stmt.where(UserKnowledgeFact.agent_name == agent_name)

        stmt = stmt.order_by(UserKnowledgeFact.importance.desc()).limit(top_k)

        result = await self.db.execute(stmt)
        facts = result.scalars().all()
        logger.debug(f"Keyword search for '{keyword}' returned {len(facts)} facts")
        return facts

    async def get_recent_facts(
        self,
        user_id: int,
        limit: int = 50,
        source_type: Optional[str] = None,
        agent_name: Optional[str] = None,
    ) -> List[UserKnowledgeFact]:
        """Получить последние N фактов."""
        stmt = (
            select(UserKnowledgeFact)
            .where(UserKnowledgeFact.user_id == user_id)
        )
        if source_type:
            stmt = stmt.where(UserKnowledgeFact.source_type == source_type)
        if agent_name:
            stmt = stmt.where(UserKnowledgeFact.agent_name == agent_name)

        stmt = stmt.order_by(UserKnowledgeFact.created_at.desc()).limit(limit)

        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def delete_expired(self, user_id: int) -> int:
        """Удалить просроченные факты. Возвращает количество удалённых."""
        stmt = (
            delete(UserKnowledgeFact)
            .where(
                UserKnowledgeFact.user_id == user_id,
                UserKnowledgeFact.expires_at.isnot(None),
                UserKnowledgeFact.expires_at < func.now(),
            )
        )
        result = await self.db.execute(stmt)
        await self.db.commit()
        logger.debug(f"Deleted {result.rowcount} expired facts for user {user_id}")
        return result.rowcount

    async def update_importance(self, fact_id: int, importance: float):
        """Обновить важность факта."""
        stmt = (
            update(UserKnowledgeFact)
            .where(UserKnowledgeFact.id == fact_id)
            .values(importance=importance)
        )
        await self.db.execute(stmt)
        await self.db.commit()

    async def link_facts(self, fact_id_1: int, fact_id_2: int):
        """Создать двустороннюю связь между двумя фактами в knowledge graph."""
        for fid, link_id in [(fact_id_1, fact_id_2), (fact_id_2, fact_id_1)]:
            stmt = select(UserKnowledgeFact).where(UserKnowledgeFact.id == fid)
            result = await self.db.execute(stmt)
            fact = result.scalar_one_or_none()
            if fact:
                links = json.loads(fact.graph_links)
                if link_id not in links:
                    links.append(link_id)
                    fact.graph_links = json.dumps(links)

        await self.db.commit()
        logger.debug(f"Linked facts {fact_id_1} <-> {fact_id_2}")

    async def get_linked_facts(self, fact_id: int) -> List[UserKnowledgeFact]:
        """Получить все факты, связанные с данным (traverse knowledge graph)."""
        stmt = select(UserKnowledgeFact).where(UserKnowledgeFact.id == fact_id)
        result = await self.db.execute(stmt)
        fact = result.scalar_one_or_none()
        if not fact:
            return []

        link_ids = json.loads(fact.graph_links)
        if not link_ids:
            return []

        stmt = select(UserKnowledgeFact).where(UserKnowledgeFact.id.in_(link_ids))
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_user_fact_count(self, user_id: int) -> Dict[str, int]:
        """Получить статистику по фактам пользователя (по source_type)."""
        stmt = (
            select(
                UserKnowledgeFact.source_type,
                func.count(UserKnowledgeFact.id).label("cnt")
            )
            .where(UserKnowledgeFact.user_id == user_id)
            .group_by(UserKnowledgeFact.source_type)
        )
        result = await self.db.execute(stmt)
        counts = {row[0]: row[1] for row in result.all()}
        counts["total"] = sum(counts.values())
        return counts