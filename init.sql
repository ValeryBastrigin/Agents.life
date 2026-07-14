-- LifeAgent Database Initialization Script

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255),
    token_balance INTEGER DEFAULT 1000,
    plan VARCHAR(20) DEFAULT 'FREE',             -- FREE, PRO, UNLIMITED
    credits_used INTEGER DEFAULT 0,              -- сколько кредитов потрачено сегодня
    last_credit_reset DATE,                      -- дата последнего дневного сброса credits_used
    theme_preference VARCHAR(10) DEFAULT 'light', -- 'light' or 'dark'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    system_prompt TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
    title VARCHAR(255),
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Token transactions table
CREATE TABLE IF NOT EXISTS token_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- 'debit', 'credit', 'purchase'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Calendar events table
CREATE TABLE IF NOT EXISTS calendar_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reminders table
CREATE TABLE IF NOT EXISTS reminders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    title VARCHAR(255),
    time TIME NOT NULL,
    date DATE,
    completed BOOLEAN DEFAULT FALSE,
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add title column if it doesn't exist (for existing databases)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='reminders' AND column_name='title'
    ) THEN
        ALTER TABLE reminders ADD COLUMN title VARCHAR(255);
    END IF;
END $$;

-- Mood entries table
CREATE TABLE IF NOT EXISTS mood_entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    mood INTEGER NOT NULL,  -- 0-4 (от плохо до отлично)
    emoji VARCHAR(10) NOT NULL,
    label VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Diary entries table (психолог)
CREATE TABLE IF NOT EXISTS diary_entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) DEFAULT '',
    content TEXT NOT NULL,
    mood INTEGER,
    mood_emoji VARCHAR(10),
    tags VARCHAR(500) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notes table
CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT DEFAULT '',
    is_pinned BOOLEAN DEFAULT FALSE,
    color VARCHAR(7) DEFAULT '#8B5CF6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User diet profiles table
CREATE TABLE IF NOT EXISTS user_diet_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    height INTEGER,
    weight INTEGER,
    age INTEGER,
    gender VARCHAR(10),
    goal VARCHAR(20),
    activity_level VARCHAR(20),
    calorie_target INTEGER,
    protein_target INTEGER,
    fats_target INTEGER,
    carbs_target INTEGER,
    water_target INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add last_credit_reset column if missing (migration for existing databases)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='last_credit_reset'
    ) THEN
        ALTER TABLE users ADD COLUMN last_credit_reset DATE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='credits_used'
    ) THEN
        ALTER TABLE users ADD COLUMN credits_used INTEGER DEFAULT 0;
    END IF;
END $$;

-- Insert default user
INSERT INTO users (username, email, password_hash, token_balance, theme_preference) VALUES
('demo_user', 'demo@lifeagent.com', 'hashed_password_placeholder', 1000, 'light');

-- Insert default agents
INSERT INTO agents (name, description, system_prompt) VALUES
('Secretary', 'Personal assistant for scheduling, reminders, and organization', 'You are a helpful secretary assistant. Help users with scheduling, reminders, note-taking, and general organization tasks.'),
('Accountant', 'Financial assistant for budgeting and expense tracking', 'You are a helpful accountant assistant. Help users with budgeting, expense tracking, financial planning, and basic accounting questions.');

-- Therapy sessions table (психолог)
CREATE TABLE IF NOT EXISTS therapy_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
    summary TEXT DEFAULT '',
    status VARCHAR(20) DEFAULT 'active',  -- active, completed, timeout
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bank statements table
CREATE TABLE IF NOT EXISTS bank_statements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    bank_name VARCHAR(100) DEFAULT '',
    period_start DATE,
    period_end DATE,
    total_income FLOAT DEFAULT 0,
    total_expense FLOAT DEFAULT 0,
    categories_data TEXT DEFAULT '{}',
    analysis_text TEXT DEFAULT '',
    raw_content TEXT DEFAULT '',
    status VARCHAR(20) DEFAULT 'processing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    statement_id INTEGER REFERENCES bank_statements(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date DATE,
    description VARCHAR(500) DEFAULT '',
    amount FLOAT NOT NULL,
    type VARCHAR(10) NOT NULL,
    category VARCHAR(100) DEFAULT 'other',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portfolio analyses table
CREATE TABLE IF NOT EXISTS portfolio_analyses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    overall_score INTEGER NOT NULL DEFAULT 5,
    strengths TEXT DEFAULT '[]',
    weaknesses TEXT DEFAULT '[]',
    recommendations TEXT DEFAULT '[]',
    asset_allocation TEXT DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_agent_id ON chats(agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id ON token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(date);
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_id ON mood_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_entries_created_at ON mood_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_bank_statements_user_id ON bank_statements(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_statement_id ON transactions(statement_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_portfolio_analyses_user_id ON portfolio_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_analyses_created_at ON portfolio_analyses(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RAG (Retrieval-Augmented Generation) Tables
-- ============================================================

-- User knowledge facts (векторное хранилище)
CREATE TABLE IF NOT EXISTS user_knowledge_facts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(384),
    source_type VARCHAR(50) NOT NULL DEFAULT 'chat',
    agent_name VARCHAR(50) NOT NULL DEFAULT 'system',
    memory_tier VARCHAR(20) NOT NULL DEFAULT 'episodic',
    importance FLOAT DEFAULT 0.5,
    access_count INTEGER DEFAULT 0,
    graph_links TEXT DEFAULT '[]',
    source_timestamp TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- User context profiles (агрегированный профиль пользователя)
CREATE TABLE IF NOT EXISTS user_context_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_text TEXT NOT NULL DEFAULT '',
    key_goals TEXT DEFAULT '[]',
    health_snapshot TEXT DEFAULT '{}',
    finance_snapshot TEXT DEFAULT '{}',
    schedule_snapshot TEXT DEFAULT '{}',
    personality_traits TEXT DEFAULT '[]',
    profile_embedding vector(384),
    version INTEGER DEFAULT 1,
    last_generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent communications (меж-агентская коммуникация)
CREATE TABLE IF NOT EXISTS agent_communications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requester_agent VARCHAR(50) NOT NULL,
    target_agent VARCHAR(50) NOT NULL,
    query_text TEXT NOT NULL,
    response_text TEXT,
    response_embedding vector(384),
    status VARCHAR(20) DEFAULT 'pending',
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE
);

-- Knowledge events (event log для асинхронного обновления)
CREATE TABLE IF NOT EXISTS knowledge_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    agent_name VARCHAR(50) NOT NULL,
    payload TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'new',
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RAG Indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_user_id ON user_knowledge_facts(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_source ON user_knowledge_facts(source_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_agent ON user_knowledge_facts(agent_name);
CREATE INDEX IF NOT EXISTS idx_knowledge_tier ON user_knowledge_facts(memory_tier);
CREATE INDEX IF NOT EXISTS idx_events_user_status ON knowledge_events(user_id, status);
CREATE INDEX IF NOT EXISTS idx_events_type ON knowledge_events(event_type);
CREATE INDEX IF NOT EXISTS idx_agent_comms_user_id ON agent_communications(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_comms_requester ON agent_communications(requester_agent);
CREATE INDEX IF NOT EXISTS idx_agent_comms_target ON agent_communications(target_agent);
CREATE INDEX IF NOT EXISTS idx_context_profiles_user_id ON user_context_profiles(user_id);

-- IVFFlat index для pgvector (для быстрого ANN-поиска)
-- Создаётся отдельно, так как требует наличия данных для обучения
-- Будет активирован позже через CREATE INDEX CONCURRENTLY

