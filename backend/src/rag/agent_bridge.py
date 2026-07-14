"""
Agent Bridge — система меж-агентской коммуникации.

Позволяет агентам запрашивать информацию друг у друга:
- agent_ask() — синхронный запрос к другому агенту
- agent_broadcast() — рассылка всем агентам
- get_agent_knowledge() — получить все знания конкретного агента о пользователе

Формирует «процедурную память» — какие агенты что знают.
"""

import json
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from .models import AgentCommunication, UserKnowledgeFact, EMBEDDING_DIM
from .knowledge_base import KnowledgeBase

logger = logging.getLogger(__name__)


class AgentBridge:
    """
    API для меж-агентского взаимодействия.
    
    Использование:
        bridge = AgentBridge(db, openai_client)
        
        # Ментор запрашивает данные у диетолога:
        answer = await bridge.agent_ask(
            user_id=1,
            requester="mentor",
            target="dietitian",
            query="Какая диета у пользователя?"
        )
    """

    ASK_SYSTEM_PROMPT = """Ты — агент {target_agent} в системе Agents.life.
Твой коллега-агент {requester_agent} задаёт вопрос о пользователе.

У тебя есть доступ к фактам о пользователе (ниже). 
Ответь на вопрос кратко и по существу, только на основе предоставленных фактов.
Если информации недостаточно, скажи об этом честно.

Отвечай на русском языке."""

    def __init__(self, db: AsyncSession, openai_client: Optional[AsyncOpenAI] = None, model: str = "openai/gpt-4o-mini"):
        self.db = db
        self.kb = KnowledgeBase(db)
        self.client = openai_client
        self.model = model

    async def agent_ask(
        self,
        user_id: int,
        requester: str,  # mentor, dietitian, psychologist, secretary, accountant
        target: str,
        query: str,
        use_llm: bool = True,
    ) -> Dict[str, Any]:
        """
        Агент запрашивает информацию у другого агента.
        
        Args:
            user_id: ID пользователя
            requester: Имя агента-запросчика
            target: Имя целевого агента
            query: Текст запроса
            use_llm: Использовать LLM для формирования ответа
        
        Returns:
            Dict с полями: id, query, response, status, tokens_used
        """
        # Создать запись коммуникации
        comm = AgentCommunication(
            user_id=user_id,
            requester_agent=requester,
            target_agent=target,
            query_text=query,
            status="pending",
        )
        self.db.add(comm)
        await self.db.commit()
        await self.db.refresh(comm)

        try:
            # Собрать релевантные факты от целевого агента
            facts = await self.kb.get_recent_facts(
                user_id=user_id,
                limit=30,
                agent_name=target,
            )

            # + semantic-факты с высокой важностью от всех агентов
            stmt = (
                select(UserKnowledgeFact)
                .where(
                    UserKnowledgeFact.user_id == user_id,
                    UserKnowledgeFact.memory_tier == "semantic",
                    UserKnowledgeFact.importance >= 0.5,
                )
                .order_by(UserKnowledgeFact.importance.desc())
                .limit(10)
            )
            result = await self.db.execute(stmt)
            semantic_facts = result.scalars().all()
            all_facts = list(facts) + list(semantic_facts)

            facts_text = "\n".join([
                f"- [{f.agent_name}/{f.source_type}] {f.content}"
                for f in all_facts
            ]) if all_facts else "Нет данных о пользователе."

            response_text = ""
            tokens_used = 0

            if use_llm and self.client:
                # Использовать LLM для формирования ответа
                try:
                    llm_response = await self.client.chat.completions.create(
                        model=self.model,
                        messages=[
                            {
                                "role": "system",
                                "content": self.ASK_SYSTEM_PROMPT.format(
                                    target_agent=target,
                                    requester_agent=requester,
                                )
                            },
                            {
                                "role": "user",
                                "content": f"Факты о пользователе:\n{facts_text[:5000]}\n\nВопрос: {query}"
                            }
                        ],
                        temperature=0.2,
                        max_tokens=500,
                    )
                    response_text = llm_response.choices[0].message.content
                    tokens_used = llm_response.usage.total_tokens if llm_response.usage else 0
                except Exception as e:
                    logger.error(f"LLM agent ask failed: {e}")
                    response_text = f"На основе фактов: {facts_text[:500]}"
            else:
                # Без LLM — отдаём просто факты
                response_text = f"Факты от агента {target}:\n{facts_text[:1000]}"

            # Сохранить ответ
            response_embedding = None
            if self.client:
                try:
                    emb_response = await self.client.embeddings.create(
                        model="text-embedding-3-small",
                        input=response_text[:8000],
                    )
                    emb = emb_response.data[0].embedding
                    if len(emb) > EMBEDDING_DIM:
                        emb = emb[:EMBEDDING_DIM]
                    response_embedding = emb
                except Exception:
                    pass

            comm.response_text = response_text
            comm.response_embedding = response_embedding
            comm.status = "completed"
            comm.tokens_used = tokens_used
            comm.responded_at = datetime.now(timezone.utc)
            await self.db.commit()
            await self.db.refresh(comm)

            logger.info(f"AgentBridge: {requester} -> {target} answered ({len(response_text)} chars)")
            return {
                "id": comm.id,
                "query": query,
                "response": response_text,
                "status": "completed",
                "tokens_used": tokens_used,
            }

        except Exception as e:
            logger.error(f"AgentBridge failed: {e}")
            comm.status = "failed"
            comm.response_text = str(e)
            await self.db.commit()
            return {
                "id": comm.id,
                "query": query,
                "response": str(e),
                "status": "failed",
                "tokens_used": 0,
            }

    async def agent_broadcast(
        self,
        user_id: int,
        requester: str,
        message: str,
        target_agents: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Рассылка сообщения другим агентам.
        
        Args:
            user_id: ID пользователя
            requester: Агент-отправитель
            message: Сообщение для рассылки
            target_agents: Список агентов-получателей (если None — все)
        
        Returns:
            Список ответов от каждого агента
        """
        if target_agents is None:
            target_agents = ["mentor", "dietitian", "psychologist", "secretary", "accountant"]

        target_agents = [a for a in target_agents if a != requester]

        results = []
        for target in target_agents:
            result = await self.agent_ask(
                user_id=user_id,
                requester=requester,
                target=target,
                query=message,
                use_llm=False,  # Для broadcast без LLM — быстрее
            )
            results.append(result)

        return results

    async def get_agent_knowledge(
        self, user_id: int, agent_name: str, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Получить все знания конкретного агента о пользователе.
        """
        facts = await self.kb.get_recent_facts(
            user_id=user_id,
            limit=limit,
            agent_name=agent_name,
        )
        return [
            {
                "id": f.id,
                "content": f.content,
                "source_type": f.source_type,
                "memory_tier": f.memory_tier,
                "importance": f.importance,
                "created_at": f.created_at.isoformat() if f.created_at else None,
            }
            for f in facts
        ]

    async def get_communication_history(
        self, user_id: int, limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Получить историю меж-агентских коммуникаций.
        """
        stmt = (
            select(AgentCommunication)
            .where(AgentCommunication.user_id == user_id)
            .order_by(AgentCommunication.created_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        comms = result.scalars().all()

        return [
            {
                "id": c.id,
                "requester": c.requester_agent,
                "target": c.target_agent,
                "query": c.query_text[:200],
                "response": (c.response_text or "")[:200],
                "status": c.status,
                "tokens_used": c.tokens_used,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in comms
        ]