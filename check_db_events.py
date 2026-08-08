import asyncio
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from src.models import User, CalendarEvent, Reminder

async def check():
    DATABASE_URL = "postgresql+asyncpg://lifeagent:lifeagent_password@localhost:5432/lifeagent"
    engine = create_async_engine(DATABASE_URL, echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    out = []
    async with AsyncSessionLocal() as db:
        users = (await db.execute(select(User))).scalars().all()
        out.append(f"Total users found: {len(users)}")
        for u in users:
            out.append(f"User ID: {u.id} | Username: {u.username} | Email: {u.email}")
            events = (await db.execute(select(CalendarEvent).where(CalendarEvent.user_id == u.id))).scalars().all()
            out.append(f"  Events count: {len(events)}")
            for ev in events:
                out.append(f"    - ID: {ev.id} | [{ev.start_time}] {ev.title}")
            reminders = (await db.execute(select(Reminder).where(Reminder.user_id == u.id))).scalars().all()
            out.append(f"  Reminders count: {len(reminders)}")
            for r in reminders:
                out.append(f"    - ID: {r.id} | [{r.date}] {r.title or r.text}")

    with open("db_output.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(out))

if __name__ == "__main__":
    asyncio.run(check())
