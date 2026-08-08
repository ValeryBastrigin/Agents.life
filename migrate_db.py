import asyncio
import aiosqlite
import os

async def migrate():
    db_paths = ['backend/instance/database.db', 'backend/agents.db', 'agents.db', 'database.db']
    for path in db_paths:
        if os.path.exists(path):
            print(f"Migrating {path}...")
            async with aiosqlite.connect(path) as db:
                try:
                    await db.execute('ALTER TABLE calendar_events ADD COLUMN notification_minutes INTEGER;')
                    await db.commit()
                    print(f"Added notification_minutes to {path}")
                except Exception as e:
                    print(f"Skipped {path}: {e}")
                
                try:
                    await db.execute('ALTER TABLE calendar_events ADD COLUMN push_enabled BOOLEAN DEFAULT 0;')
                    await db.commit()
                    print(f"Added push_enabled to {path}")
                except Exception as e:
                    print(f"Skipped push_enabled in {path}: {e}")

if __name__ == '__main__':
    asyncio.run(migrate())
