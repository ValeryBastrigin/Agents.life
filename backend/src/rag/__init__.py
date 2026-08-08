"""
RAG (Retrieval-Augmented Generation) модуль для Agents.life.

Обеспечивает:
- Векторное хранилище знаний о пользователе (pgvector)
- Многослойную память (профиль, эпизодическая, семантическая)
- Event-driven извлечение фактов
- Построение контекста для агентов
- Меж-агентскую коммуникацию
"""

from .models import (
    UserKnowledgeFact,
    AgentCommunication,
    UserContextProfile,
    KnowledgeEvent,
)
from .knowledge_base import KnowledgeBase
from .extractor import KnowledgeExtractor
from .context_builder import ContextBuilder
from .agent_bridge import AgentBridge

__all__ = [
    "UserKnowledgeFact",
    "AgentCommunication",
    "UserContextProfile",
    "KnowledgeEvent",
    "KnowledgeBase",
    "KnowledgeExtractor",
    "ContextBuilder",
    "AgentBridge",
]