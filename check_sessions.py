import asyncio
from src.database import SessionLocal
from src.models import TherapySession
from sqlalchemy import select

async def main():
    async with SessionLocal() as db:
        result = await db.execute(select(TherapySession).where(TherapySession.user_id == 1))
        sessions = result.scalars().all()
        for s in sessions:
            summary_part = str(s.summary or "")[:80]
            print(f"ID={s.id} chat_id={s.chat_id} status={s.status} ended_at={s.ended_at} summary={summary_part}")

if __name__ == "__main__":
    asyncio.run(main())