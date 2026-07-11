from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Time, Date, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    avatar_url = Column(String(255))
    token_balance = Column(Integer, default=1000)
    theme_preference = Column(String(10), default="light")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    chats = relationship("Chat", back_populates="user", cascade="all, delete-orphan")
    token_transactions = relationship("TokenTransaction", back_populates="user", cascade="all, delete-orphan")
    calendar_events = relationship("CalendarEvent", back_populates="user", cascade="all, delete-orphan")
    reminders = relationship("Reminder", back_populates="user", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="user", cascade="all, delete-orphan")
    bank_statements = relationship("BankStatement", back_populates="user", cascade="all, delete-orphan")

class Agent(Base):
    __tablename__ = "agents"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)
    system_prompt = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    chats = relationship("Chat", back_populates="agent")

class Chat(Base):
    __tablename__ = "chats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    agent_id = Column(Integer, ForeignKey("agents.id", ondelete="SET NULL"))
    title = Column(String(255))
    is_pinned = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="chats")
    agent = relationship("Agent", back_populates="chats")
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan")
    therapy_sessions = relationship("TherapySession", back_populates="chat", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer, ForeignKey("chats.id", ondelete="CASCADE"))
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    tokens_used = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    chat = relationship("Chat", back_populates="messages")

class TokenTransaction(Base):
    __tablename__ = "token_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    amount = Column(Integer, nullable=False)
    transaction_type = Column(String(20), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="token_transactions")

class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    title = Column(String(255), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    color = Column(String(7), default="#3B82F6")
    description = Column(Text)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="calendar_events")

class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    text = Column(Text, nullable=False)
    title = Column(String(255))
    time = Column(Time, nullable=False)
    date = Column(Date)
    completed = Column(Boolean, default=False)
    color = Column(String(7), default="#3B82F6")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="reminders")

class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    title = Column(String(255), nullable=False)
    content = Column(Text, default="")
    is_pinned = Column(Boolean, default=False)
    color = Column(String(7), default="#8B5CF6")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="notes")

class FinancialObligation(Base):
    __tablename__ = "financial_obligations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Integer, nullable=False)  # день месяца (1-31)
    title = Column(String(255), nullable=False)
    amount = Column(Integer, nullable=False)
    type = Column(String(20), nullable=False)  # 'income' or 'expense'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")


class UserDietProfile(Base):
    __tablename__ = "user_diet_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    height = Column(Integer)
    weight = Column(Integer)
    age = Column(Integer)
    gender = Column(String(10))
    goal = Column(String(20))
    activity_level = Column(String(20))
    calorie_target = Column(Integer)
    protein_target = Column(Integer)
    fats_target = Column(Integer)
    carbs_target = Column(Integer)
    water_target = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User")

class DiaryEntry(Base):
    __tablename__ = "diary_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), default="")
    content = Column(Text, nullable=False)
    mood = Column(Integer)  # optional mood 0-4
    mood_emoji = Column(String(10))
    tags = Column(Text, default="")  # comma-separated
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")


class MoodEntry(Base):
    __tablename__ = "mood_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    mood = Column(Integer, nullable=False)  # 0-4 (от плохо до отлично)
    emoji = Column(String(10), nullable=False)
    label = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")


class FoodConsumption(Base):
    __tablename__ = "food_consumptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_name = Column(String(255), nullable=False)
    grams = Column(Integer, nullable=False)
    calories = Column(Integer, nullable=False)
    protein = Column(Integer, nullable=False)
    fats = Column(Integer, nullable=False)
    carbs = Column(Integer, nullable=False)
    meal_type = Column(String(50), default="other")  # breakfast, lunch, dinner, snack, other
    notes = Column(Text)
    consumed_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")


class TherapySession(Base):
    __tablename__ = "therapy_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    chat_id = Column(Integer, ForeignKey("chats.id", ondelete="CASCADE"), nullable=False)
    summary = Column(Text, default="")
    status = Column(String(20), default="active")  # active, completed, timeout
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    chat = relationship("Chat", back_populates="therapy_sessions")


class DreamAnalysis(Base):
    __tablename__ = "dream_analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    dream_text = Column(Text, nullable=False)
    branches_data = Column(Text, default="[]")  # JSON string of branches
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")


class ActiveGoal(Base):
    __tablename__ = "active_goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    branch_type = Column(String(50), default="")
    resources = Column(Text, default="[]")  # JSON string of resources
    status = Column(String(20), default="active")  # active, completed, cancelled
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User")


class DietPlan(Base):
    """Хранит сгенерированный план питания пользователя (один на пользователя)."""
    __tablename__ = "diet_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    plan_data = Column(Text, nullable=False)  # JSON string с рационом
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User")


class BankStatement(Base):
    """Хранит информацию о загруженной банковской выписке."""
    __tablename__ = "bank_statements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    bank_name = Column(String(100), default="")
    period_start = Column(Date, nullable=True)
    period_end = Column(Date, nullable=True)
    total_income = Column(Float, default=0.0)
    total_expense = Column(Float, default=0.0)
    categories_data = Column(Text, default="{}")  # JSON: category -> {income, expense, count}
    analysis_text = Column(Text, default="")  # Текстовый анализ от LLM
    raw_content = Column(Text, default="")  # Сохраняем исходный текст выписки
    status = Column(String(20), default="processing")  # processing, completed, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="bank_statements")
    transactions = relationship("Transaction", back_populates="statement", cascade="all, delete-orphan")


class Transaction(Base):
    """Хранит отдельные транзакции из выписки."""
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    statement_id = Column(Integer, ForeignKey("bank_statements.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=True)
    description = Column(String(500), default="")
    amount = Column(Float, nullable=False)
    type = Column(String(10), nullable=False)  # 'income' or 'expense'
    category = Column(String(100), default="other")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    statement = relationship("BankStatement", back_populates="transactions")
    user = relationship("User")


class PortfolioAnalysis(Base):
    """Хранит результаты анализа инвестиционного портфеля."""
    __tablename__ = "portfolio_analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    overall_score = Column(Integer, default=0)  # Оценка от 0 до 10
    strengths = Column(Text, default="[]")  # JSON list
    weaknesses = Column(Text, default="[]")  # JSON list
    recommendations = Column(Text, default="[]")  # JSON list
    asset_allocation = Column(Text, default="{}")  # JSON dict
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User")
