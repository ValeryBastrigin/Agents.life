"""
Knowledge Extractor — извлечение фактов из сырых данных пользователя.

Задачи:
1. Принимать событие (KnowledgeEvent) и извлекать факты через LLM
2. Генерировать эмбеддинги через OpenAI API (routerai)
3. Сохранять факты в KnowledgeBase
4. Обновлять UserContextProfile при значительных изменениях
"""

import json
import logging
import hashlib
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from .models import (
    UserKnowledgeFact,
    UserContextProfile,
    KnowledgeEvent,
    EMBEDDING_DIM,
)
from .knowledge_base import KnowledgeBase

logger = logging.getLogger(__name__)


class KnowledgeExtractor:
    """
    Извлекает структурированные факты из неструктурированных данных.
    
    Использует LLM для:
    - Извлечения атомарных фактов из текста
    - Оценки важности факта
    - Генерации эмбеддингов
    """

    FACT_EXTRACTION_SYSTEM_PROMPT = """Ты — система извлечения знаний о пользователе.
Твоя задача: извлечь атомарные факты из сообщения/события.

Правила:
1. Каждый факт — одно утверждение о пользователе (на русском, от третьего лица)
2. Факт должен быть самодостаточным (понятным без контекста)
3. Оцени важность факта от 0.0 до 1.0:
   - 0.0-0.3: рутинная информация (например, "пользователь поел")
   - 0.3-0.6: значимая информация (например, "пользователь начал диету")
   - 0.6-0.9: важная информация (например, "пользователь поставил цель похудеть на 10 кг")
   - 0.9-1.0: критическая информация (например, "у пользователя депрессия")
4. Определи memory_tier:
   - "episodic": одноразовое событие (поел, записал напоминание)
   - "semantic": устойчивое знание (цель, предпочтение, черта характера)

Верни JSON-массив объектов с полями:
  "content": "текст факта",
  "importance": 0.0-1.0,
  "memory_tier": "episodic" | "semantic"
"""

    def __init__(self, db: AsyncSession, openai_client: Optional[AsyncOpenAI] = None, model: str = "google/gemini-3.1-flash-lite"):
        self.db = db
        self.kb = KnowledgeBase(db)
        self.client = openai_client
        self.model = model

    async def extract_from_event(self, event: KnowledgeEvent) -> List[UserKnowledgeFact]:
        """
        Обработать событие: извлечь факты, создать эмбеддинги, сохранить в KB.
        
        Args:
            event: Событие из knowledge_events
        
        Returns:
            Список созданных фактов
        """
        event.status = "processing"
        await self.db.commit()

        try:
            payload = json.loads(event.payload)
            text = payload.get("text", payload.get("content", ""))

            if not text:
                logger.warning(f"Event {event.id}: empty payload")
                event.status = "completed"
                await self.db.commit()
                return []

            # 1. Извлечь факты через LLM
            facts_data = await self._extract_facts_llm(text, event.agent_name)
            if not facts_data:
                event.status = "completed"
                await self.db.commit()
                return []

            # 2. Получить эмбеддинг текста для семантического поиска
            text_embedding = await self._get_embedding(text)

            # 3. Сохранить факты в KB
            stored_facts = []
            for fact_data in facts_data:
                # Эмбеддинг для конкретного факта
                fact_embedding = await self._get_embedding(fact_data["content"])

                fact = await self.kb.store_fact(
                    user_id=event.user_id,
                    content=fact_data["content"],
                    embedding=fact_embedding,
                    source_type=event.event_type,
                    agent_name=event.agent_name,
                    memory_tier=fact_data.get("memory_tier", "episodic"),
                    importance=fact_data.get("importance", 0.5),
                    source_timestamp=event.created_at,
                )
                stored_facts.append(fact)

            # 4. Mark event as completed
            event.status = "completed"
            event.processed_at = datetime.now(timezone.utc)
            await self.db.commit()

            logger.info(f"Extracted {len(stored_facts)} facts from event {event.id}")
            return stored_facts

        except Exception as e:
            logger.error(f"Failed to process event {event.id}: {e}")
            event.status = "failed"
            event.error_message = str(e)
            await self.db.commit()
            return []

    async def _extract_facts_llm(self, text: str, agent_name: str) -> List[Dict[str, Any]]:
        """
        Использует LLM для извлечения фактов из текста.
        
        Возвращает список словарей с полями content, importance, memory_tier.
        """
        if not self.client:
            # Fallback: создаём один простой факт без LLM
            logger.warning("No OpenAI client, creating raw fact")
            return [{
                "content": f"Пользователь взаимодействовал с агентом {agent_name}: {text[:200]}",
                "importance": 0.3,
                "memory_tier": "episodic",
            }]

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.FACT_EXTRACTION_SYSTEM_PROMPT},
                    {"role": "user", "content": f"Агент: {agent_name}\nТекст: {text[:3000]}"}
                ],
                temperature=0.1,
                max_tokens=1000,
            )

            raw = response.choices[0].message.content
            # Clean markdown code blocks
            raw = raw.strip()
            if raw.startswith("```"):
                raw = "\n".join(raw.split("\n")[1:-1])

            facts = json.loads(raw)
            if isinstance(facts, dict):
                facts = [facts]
            if not isinstance(facts, list):
                return []

            return facts

        except Exception as e:
            logger.error(f"LLM extraction failed: {e}")
            return [{
                "content": f"Пользователь взаимодействовал с агентом {agent_name}: {text[:200]}",
                "importance": 0.3,
                "memory_tier": "episodic",
            }]

    async def _get_embedding(self, text: str) -> Optional[List[float]]:
        """
        Получить эмбеддинг текста через OpenAI embeddings API.
        Использует text-embedding-3-small (1536 dim) или multilingual-e5 (384 dim).
        """
        if not self.client:
            return None

        try:
            response = await self.client.embeddings.create(
                model="openai/text-embedding-3-small",
                input=text[:8000],  # OpenAI limit
            )
            embedding = response.data[0].embedding
            # Обрезаем до EMBEDDING_DIM если нужно
            if len(embedding) > EMBEDDING_DIM:
                embedding = embedding[:EMBEDDING_DIM]
            elif len(embedding) < EMBEDDING_DIM:
                embedding = embedding + [0.0] * (EMBEDDING_DIM - len(embedding))
            return embedding
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            return None

    async def generate_user_profile(self, user_id: int) -> Optional[UserContextProfile]:
        """
        Сгенерировать или обновить агрегированный профиль пользователя.
        
        Собирает все semantic-факты о пользователе и через LLM
        создаёт единое описание для использования в system prompt агентов.
        """
        # Получить все semantic-факты
        semantic_facts = await self.kb.get_recent_facts(
            user_id=user_id,
            limit=200,
            memory_tier="semantic",
        )
        episodic_facts = await self.kb.get_recent_facts(
            user_id=user_id,
            limit=50,
            memory_tier="episodic",
        )

        all_facts_text = "\n".join([
            f"- [{f.source_type}/{f.agent_name}] {f.content} (важность: {f.importance})"
            for f in semantic_facts + episodic_facts
        ])

        if not all_facts_text:
            all_facts_text = "Нет данных о пользователе."

        if self.client:
            try:
                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {
                            "role": "system",
                            "content": """Ты — Архитектор знаний. Создай профиль пользователя на основе фактов.

Верни JSON с полями:
  "profile_text": "краткое описание пользователя (3-5 предложений на русском)",
  "key_goals": ["цель 1", "цель 2", ...],
  "health_snapshot": {"weight": null, "diet": "", "mood": "", "notes": ""},
  "finance_snapshot": {"income": null, "expenses": "", "portfolio": "", "notes": ""},
  "schedule_snapshot": {"routine": "", "upcoming": "", "notes": ""},
  "personality_traits": ["черта 1", "черта 2", ...]
"""
                        },
                        {"role": "user", "content": f"Факты о пользователе:\n{all_facts_text[:8000]}"}
                    ],
                    temperature=0.2,
                    max_tokens=1000,
                )

                raw = response.choices[0].message.content.strip()
                if raw.startswith("```"):
                    raw = "\n".join(raw.split("\n")[1:-1])
                profile_data = json.loads(raw)

            except Exception as e:
                logger.error(f"Profile generation failed: {e}")
                profile_data = self._default_profile()
        else:
            profile_data = self._default_profile()

        # Сохранить или обновить профиль
        stmt = await self.db.execute(
            __import__("sqlalchemy").select(UserContextProfile).where(
                UserContextProfile.user_id == user_id
            )
        )
        profile = stmt.scalar_one_or_none()

        profile_embedding = await self._get_embedding(profile_data.get("profile_text", ""))

        if profile:
            profile.profile_text = profile_data.get("profile_text", "")
            profile.key_goals = json.dumps(profile_data.get("key_goals", []))
            profile.health_snapshot = json.dumps(profile_data.get("health_snapshot", {}))
            profile.finance_snapshot = json.dumps(profile_data.get("finance_snapshot", {}))
            profile.schedule_snapshot = json.dumps(profile_data.get("schedule_snapshot", {}))
            profile.personality_traits = json.dumps(profile_data.get("personality_traits", []))
            profile.profile_embedding = profile_embedding
            profile.version = (profile.version or 0) + 1
            profile.last_generated_at = datetime.now(timezone.utc)
        else:
            profile = UserContextProfile(
                user_id=user_id,
                profile_text=profile_data.get("profile_text", ""),
                key_goals=json.dumps(profile_data.get("key_goals", [])),
                health_snapshot=json.dumps(profile_data.get("health_snapshot", {})),
                finance_snapshot=json.dumps(profile_data.get("finance_snapshot", {})),
                schedule_snapshot=json.dumps(profile_data.get("schedule_snapshot", {})),
                personality_traits=json.dumps(profile_data.get("personality_traits", [])),
                profile_embedding=profile_embedding,
            )
            self.db.add(profile)

        await self.db.commit()
        await self.db.refresh(profile)
        logger.info(f"Generated profile v{profile.version} for user {user_id}")
        return profile

    def _default_profile(self) -> Dict[str, Any]:
        return {
            "profile_text": "Новый пользователь. Профиль пока не заполнен.",
            "key_goals": [],
            "health_snapshot": {},
            "finance_snapshot": {},
            "schedule_snapshot": {},
            "personality_traits": [],
        }

    async def create_event(
        self,
        user_id: int,
        event_type: str,
        agent_name: str,
        text: str,
        extra_payload: Optional[Dict[str, Any]] = None,
    ) -> KnowledgeEvent:
        """
        Создать событие в knowledge_events для асинхронной обработки.
        
        Args:
            user_id: ID пользователя
            event_type: Тип события (new_message, dream_update, food_log, diary_entry, ...)
            agent_name: Агент-источник (mentor, dietitian, psychologist, ...)
            text: Основной текст события
            extra_payload: Дополнительные данные
        
        Returns:
            Созданный KnowledgeEvent
        """
        payload = {"text": text, **(extra_payload or {})}
        event = KnowledgeEvent(
            user_id=user_id,
            event_type=event_type,
            agent_name=agent_name,
            payload=json.dumps(payload, ensure_ascii=False),
            status="new",
        )
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(event)
        logger.debug(f"Created event {event.id}: {event_type} by {agent_name}")
        return event

    async def process_pending_events(self, user_id: int, limit: int = 10) -> int:
        """
        Обработать все pending события для пользователя.
        Возвращает количество обработанных событий.
        """
        from sqlalchemy import select as sql_select

        stmt = (
            sql_select(KnowledgeEvent)
            .where(
                KnowledgeEvent.user_id == user_id,
                KnowledgeEvent.status == "new",
            )
            .order_by(KnowledgeEvent.created_at.asc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        events = result.scalars().all()

        processed_count = 0
        for event in events:
            facts = await self.extract_from_event(event)
            if facts:
                processed_count += 1

        return processed_count