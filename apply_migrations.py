"""
Скрипт для применения миграций к существующей базе данных.
Запускается из корня проекта:
  python apply_migrations.py

Подключается к БД через переменные окружения из backend/.env или docker-compose.yml
и выполняет миграции, которые уже прописаны в init.sql через DO-блоки IF NOT EXISTS.
"""

import os
import sys
import asyncio
import asyncpg
from pathlib import Path

# Добавляем backend в PYTHON_PATH для импорта config
sys.path.insert(0, str(Path(__file__).parent / 'backend'))

from dotenv import load_dotenv

# Загружаем переменные из .env
load_dotenv(Path(__file__).parent / 'backend' / '.env')

DB_USER = os.getenv('DB_USER', 'lifeagent')
DB_PASS = os.getenv('DB_PASSWORD', 'lifeagent_password')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'lifeagent')

SQL_FILE = Path(__file__).parent / 'init.sql'

# Список миграций, которые нужно применить к существующей БД
# (DO-блоки из init.sql, безопасные для повторного запуска)
MIGRATIONS_SQL = """
-- Добавляем push_enabled в calendar_events если отсутствует
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='calendar_events' AND column_name='push_enabled'
    ) THEN
        ALTER TABLE calendar_events ADD COLUMN push_enabled BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Добавляем push_enabled в reminders если отсутствует
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='reminders' AND column_name='push_enabled'
    ) THEN
        ALTER TABLE reminders ADD COLUMN push_enabled BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Добавляем title в reminders если отсутствует
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='reminders' AND column_name='title'
    ) THEN
        ALTER TABLE reminders ADD COLUMN title VARCHAR(255);
    END IF;
END $$;

-- Обновляем структуру portfolio_analyses
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='portfolio_analyses' AND column_name='client_name'
    ) THEN
        ALTER TABLE portfolio_analyses ADD COLUMN client_name VARCHAR(255);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='portfolio_analyses' AND column_name='portfolio_data'
    ) THEN
        ALTER TABLE portfolio_analyses ADD COLUMN portfolio_data TEXT;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='portfolio_analyses' AND column_name='analysis_text'
    ) THEN
        ALTER TABLE portfolio_analyses ADD COLUMN analysis_text TEXT;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='portfolio_analyses' AND column_name='status'
    ) THEN
        ALTER TABLE portfolio_analyses ADD COLUMN status VARCHAR(50) DEFAULT 'pending';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='portfolio_analyses' AND column_name='total_value'
    ) THEN
        ALTER TABLE portfolio_analyses ADD COLUMN total_value FLOAT DEFAULT 0;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='portfolio_analyses' AND column_name='monthly_savings'
    ) THEN
        ALTER TABLE portfolio_analyses ADD COLUMN monthly_savings FLOAT DEFAULT 0;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='portfolio_analyses' AND column_name='risk_profile'
    ) THEN
        ALTER TABLE portfolio_analyses ADD COLUMN risk_profile VARCHAR(50);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='portfolio_analyses' AND column_name='updated_at'
    ) THEN
        ALTER TABLE portfolio_analyses ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='portfolio_analyses' AND column_name='cost'
    ) THEN
        ALTER TABLE portfolio_analyses ADD COLUMN cost NUMERIC(10,4) DEFAULT 0.0;
    END IF;
END $$;

-- Попытка создать триггер для portfolio_analyses если таблица существует
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name='portfolio_analyses'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.triggers
            WHERE trigger_name='update_portfolio_analyses_updated_at'
        ) THEN
            CREATE TRIGGER update_portfolio_analyses_updated_at BEFORE UPDATE ON portfolio_analyses
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
    END IF;
END $$;

-- Создаём недостающие таблицы (CREATE TABLE IF NOT EXISTS безопасен)
CREATE TABLE IF NOT EXISTS schedule_analyses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    schedule_data TEXT NOT NULL,
    analysis_text TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cost NUMERIC(10,4) DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS diet_plans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    preferences TEXT DEFAULT '{}',
    plan_data TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cost NUMERIC(10,4) DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS active_goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    category VARCHAR(50) DEFAULT 'personal',
    status VARCHAR(20) DEFAULT 'in_progress',
    target_date DATE,
    progress FLOAT DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dream_goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    category VARCHAR(50) DEFAULT 'dream',
    image_url VARCHAR(500),
    target_amount FLOAT DEFAULT 0,
    current_amount FLOAT DEFAULT 0,
    target_date DATE,
    status VARCHAR(20) DEFAULT 'dreaming',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_agent_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    agent_name VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    push_token VARCHAR(500),
    settings_json TEXT DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, agent_name)
);

-- Индексы для новых таблиц
CREATE INDEX IF NOT EXISTS idx_schedule_analyses_user_id ON schedule_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_diet_plans_user_id ON diet_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_active_goals_user_id ON active_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_dream_goals_user_id ON dream_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_agent_settings_user_id ON user_agent_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_agent_settings_agent ON user_agent_settings(user_id, agent_name);

-- Триггеры для новых таблиц
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name='update_diet_plans_updated_at'
    ) THEN
        CREATE TRIGGER update_diet_plans_updated_at BEFORE UPDATE ON diet_plans
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name='update_active_goals_updated_at'
    ) THEN
        CREATE TRIGGER update_active_goals_updated_at BEFORE UPDATE ON active_goals
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name='update_dream_goals_updated_at'
    ) THEN
        CREATE TRIGGER update_dream_goals_updated_at BEFORE UPDATE ON dream_goals
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name='update_user_agent_settings_updated_at'
    ) THEN
        CREATE TRIGGER update_user_agent_settings_updated_at BEFORE UPDATE ON user_agent_settings
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Пользовательские миграции: добавляем недостающие колонки в users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='display_name'
    ) THEN
        ALTER TABLE users ADD COLUMN display_name VARCHAR(100);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='birth_date'
    ) THEN
        ALTER TABLE users ADD COLUMN birth_date DATE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='agents_selected'
    ) THEN
        ALTER TABLE users ADD COLUMN agents_selected BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='profile_completed'
    ) THEN
        ALTER TABLE users ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
"""


async def apply_migrations():
    conn = None
    try:
        conn = await asyncpg.connect(
            user=DB_USER,
            password=DB_PASS,
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
        )
        print(f"Connected to {DB_HOST}:{DB_PORT}/{DB_NAME} as {DB_USER}")

        print("Applying migrations...")
        await conn.execute(MIGRATIONS_SQL)
        print("All migrations applied successfully!")

        # Verify calendar_events columns
        columns = await conn.fetch(
            "SELECT column_name, data_type, column_default "
            "FROM information_schema.columns "
            "WHERE table_name='calendar_events' "
            "ORDER BY ordinal_position"
        )
        print("\ncalendar_events columns in DB:")
        for col in columns:
            print(f"  {col['column_name']:20s} {col['data_type']:15s} default={col['column_default']}")

        # Verify portfolio_analyses columns
        columns = await conn.fetch(
            "SELECT column_name, data_type, column_default "
            "FROM information_schema.columns "
            "WHERE table_name='portfolio_analyses' "
            "ORDER BY ordinal_position"
        )
        print("\nportfolio_analyses columns in DB:")
        for col in columns:
            print(f"  {col['column_name']:20s} {col['data_type']:15s} default={col['column_default']}")

        # Check if new tables exist
        tables = await conn.fetch(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema='public' AND table_name IN "
            "('schedule_analyses', 'diet_plans', 'active_goals', 'dream_goals', 'user_agent_settings') "
            "ORDER BY table_name"
        )
        print("\nNew tables existence:")
        for t in tables:
            print(f"  {t['table_name']} ✓")

    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        if conn:
            await conn.close()
            print("\nConnection closed.")


if __name__ == '__main__':
    asyncio.run(apply_migrations())