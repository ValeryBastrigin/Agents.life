import asyncio
import os
import sys
from datetime import datetime, time, timedelta

# Add backend to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from src.models import Base, CalendarEvent
from src.agents.secretary_agent import process

DATABASE_URL = "sqlite+aiosqlite:///:memory:"

async def test_schedule_analysis():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with AsyncSessionLocal() as db:
        # Seed test events for today
        today = datetime.now().date()
        ev1 = CalendarEvent(
            user_id=1,
            title="Утренняя планерка",
            start_time=datetime.combine(today, time(9, 0)),
            end_time=datetime.combine(today, time(10, 0)),
            description="Обсудить спринт"
        )
        ev2 = CalendarEvent(
            user_id=1,
            title="Разработка фичи",
            start_time=datetime.combine(today, time(10, 30)),
            end_time=datetime.combine(today, time(15, 0)),
            description="Кодинг без перерыва"
        )
        db.add_all([ev1, ev2])
        await db.commit()

        # Test user query for schedule analysis
        message = "проанализируй мое расписание на сегодня, что можешь сказать?"
        print(f"User message: {message}\n")

        response_text, tokens = await process(message, "", db, user_id=1)
        print("Agent Response:\n")
        print(response_text)
        print(f"\nTokens used: {tokens}")

if __name__ == "__main__":
    asyncio.run(test_schedule_analysis())
