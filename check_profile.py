import asyncio
import sys
sys.path.insert(0, '/app')
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text

async def check():
    engine = create_async_engine('sqlite+aiosqlite:///./data.db')
    async with AsyncSession(engine) as db:
        # Check tables
        result = await db.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
        tables = result.fetchall()
        print(f'Таблицы: {[t[0] for t in tables]}')
        
        # Check any user_diet_profiles
        result = await db.execute(text('SELECT * FROM user_diet_profiles'))
        rows = result.fetchall()
        print(f'Всего профилей: {len(rows)}')
        for row in rows:
            print(dict(row._mapping))
        
        # Check user_id=1 specifically
        result = await db.execute(text('SELECT * FROM user_diet_profiles WHERE user_id = 1'))
        row = result.fetchone()
        if row:
            print('Профиль для user_id=1:', dict(row._mapping))
        else:
            print('Нет профиля для user_id=1')
    await engine.dispose()

asyncio.run(check())