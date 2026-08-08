"""
Модели данных RAG-системы для Agents.life.

Многослойная архитектура памяти:
1. UserContextProfile — агрегированный LLM-профиль пользователя (обновляется периодически)
2. UserKnowledgeFact — эпизодическая + семантическая память (векторный поиск)
3. AgentCommunication — меж-агентские запросы (процедурная память)
4. KnowledgeEvent — event log для асинхронного обновления знаний
"""

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector  # pgvector тип
from src.database import Base


# Размерность эмбеддинга (multilingual-e5-small: 384)
EMBEDDING_DIM = 384


class UserKnowledgeFact(Base):
    """
    Факт о пользователе — атомарная единица знаний.
    
    Хранится как текст + векторный эмбеддинг для семантического поиска.
    Поддерживает иерархию:
    - source_type: откуда факт (dream, food_log, diary, calendar, finance, chat, profile, ...)
    - agent_name: какой агент является «владельцем» факта (mentor, dietitian, psychologist, ...)
    - memory_tier: уровень памяти (episodic, semantic, procedural)
    - importance: важность факта 0..1 (используется для ранжирования)
    - graph_links: JSON-строка с ID связанных фактов (для knowledge graph)
    """
    __tablename__ = "user_knowledge_facts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Контент
    content = Column(Text, nullable=False)  # Текст факта (на русском)
    embedding = Column(Vector(EMBEDDING_DIM), nullable=True)  # Вектор для семантического поиска
    
    # Метаданные
    source_type = Column(String(50), nullable=False, default="chat", index=True)
    agent_name = Column(String(50), nullable=False, default="system", index=True)
    memory_tier = Column(String(20), nullable=False, default="episodic", index=True)  # episodic / semantic / procedural
    
    # Ранжирование
    importance = Column(Float, default=0.5)  # 0.0 .. 1.0
    access_count = Column(Integer, default=0)  # Сколько раз факт был найден в поиске
    
    # Knowledge Graph
    graph_links = Column(Text, default="[]")  # JSON-массив ID связанных фактов
    
    # Временные метки
    source_timestamp = Column(DateTime(timezone=True), nullable=True)  # Когда произошло событие-источник
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)  # Для временных фактов

    user = relationship("User")

    # Индексы
    __table_args__ = (
        Index("idx_knowledge_user_id", "user_id"),
        Index("idx_knowledge_source", "source_type"),
        Index("idx_knowledge_agent", "agent_name"),
        Index("idx_knowledge_tier", "memory_tier"),
        # IVFFlat индекс для pgvector (создаётся отдельно после наполнения данными)
    )


class UserContextProfile(Base):
    """
    Агрегированный профиль пользователя, генерируемый LLM периодически.
    
    Это «рабочая память» (working memory) системы — краткая сводка о пользователе,
    которая всегда подаётся в system prompt любому агенту.
    Обновляется Архитектором при значительных изменениях.
    """
    __tablename__ = "user_context_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    # Сгенерированный LLM профиль
    profile_text = Column(Text, nullable=False, default="")
    
    # Разделы профиля (JSON-строки)
    key_goals = Column(Text, default="[]")           # Ключевые цели (из DreamGoal)
    health_snapshot = Column(Text, default="{}")      # Здоровье: диета, вес, настроение
    finance_snapshot = Column(Text, default="{}")     # Финансы: доходы, расходы, портфель
    schedule_snapshot = Column(Text, default="{}")    # Расписание: события, напоминания
    personality_traits = Column(Text, default="[]")   # Черты личности (из диалогов с психологом)
    
    # Эмбеддинг всего профиля для быстрого сравнения изменений
    profile_embedding = Column(Vector(EMBEDDING_DIM), nullable=True)
    
    # Версионирование
    version = Column(Integer, default=1)
    last_generated_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User")


class AgentCommunication(Base):
    """
    Лог меж-агентской коммуникации.
    
    Когда один агент запрашивает данные у другого — запись сохраняется здесь.
    Формирует «процедурную память» — кто из агентов что знает о пользователе.
    """
    __tablename__ = "agent_communications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    requester_agent = Column(String(50), nullable=False, index=True)  # Кто запросил
    target_agent = Column(String(50), nullable=False, index=True)     # У кого запросил
    query_text = Column(Text, nullable=False)                          # Текст запроса
    response_text = Column(Text, nullable=True)                        # Ответ
    response_embedding = Column(Vector(EMBEDDING_DIM), nullable=True)  # Вектор ответа
    
    status = Column(String(20), default="pending")  # pending, completed, failed
    tokens_used = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    responded_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User")


class KnowledgeEvent(Base):
    """
    Event log для асинхронного обновления knowledge base.
    
    При любом действии пользователя (новое сообщение, запись в дневнике, лог еды и т.д.)
    создаётся событие. Consumer обрабатывает событие и обновляет UserKnowledgeFact.
    """
    __tablename__ = "knowledge_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    event_type = Column(String(50), nullable=False, index=True)  # new_message, food_log, dream_update, ...
    agent_name = Column(String(50), nullable=False, index=True)   # Какой агент сгенерировал событие
    
    # Данные события
    payload = Column(Text, nullable=False)  # JSON с контекстом события
    
    # Обработка
    status = Column(String(20), default="new", index=True)  # new, processing, completed, failed
    processed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")

    __table_args__ = (
        Index("idx_events_user_status", "user_id", "status"),
        Index("idx_events_type", "event_type"),
    )