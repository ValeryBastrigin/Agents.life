import asyncio
from datetime import datetime
from src.database import AsyncSessionLocal
from src.models import CalendarEvent

async def add_test_events():
    async with AsyncSessionLocal() as db:
        user_id = 3
        now = datetime.now()
        
        ev1 = CalendarEvent(
            user_id=user_id,
            title="Утренняя планерка",
            start_time=now.replace(hour=9, minute=0, second=0, microsecond=0),
            end_time=now.replace(hour=10, minute=0, second=0, microsecond=0),
            description="Обсуждение спринта с командой"
        )
        ev2 = CalendarEvent(
            user_id=user_id,
            title="Встреча с инвестором",
            start_time=now.replace(hour=10, minute=15, second=0, microsecond=0),
            end_time=now.replace(hour=11, minute=30, second=0, microsecond=0),
            description="Презентация нового функционала"
        )
        ev3 = CalendarEvent(
            user_id=user_id,
            title="Сложная задача по коду",
            start_time=now.replace(hour=12, minute=0, second=0, microsecond=0),
            end_time=now.replace(hour=17, minute=0, second=0, microsecond=0),
            description="Без перерывов и отдыха"
        )
        db.add_all([ev1, ev2, ev3])
        await db.commit()
        print("Successfully added test calendar events for user 3!")

if __name__ == "__main__":
    asyncio.run(add_test_events())
