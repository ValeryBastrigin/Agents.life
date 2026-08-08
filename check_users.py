import asyncio
from sqlalchemy.future import select
from backend.src.database import async_session
from backend.src.models import User

async def find_user():
    async with async_session() as session:
        result = await session.execute(select(User))
        users = result.scalars().all()
        for u in users:
            print(f"ID: {u.id}, Email: {u.email}, Username: {u.username}")

asyncio.run(find_user())
