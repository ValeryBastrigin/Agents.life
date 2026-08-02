import asyncio
import os
import sys
from datetime import datetime, time

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from src.models import Base, CalendarEvent
from src.agents.secretary_agent import process

async def test():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as db:
        today = datetime.now().date()
        db.add(CalendarEvent(user_id=1, title='Встреча с клиентом', start_time=datetime.combine(today, time(10,0)), end_time=datetime.combine(today, time(11,0))))
        db.add(CalendarEvent(user_id=1, title='Релиз проекта', start_time=datetime.combine(today, time(12,0)), end_time=datetime.combine(today, time(14,0))))
        await db.commit()
        
        res, _ = await process("Проанализируй мое расписание на сегодня", "", db, 1)
        print("RESULT:\n", res)

if __name__ == "__main__":
    asyncio.run(test())
