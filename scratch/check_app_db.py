import asyncio
from sqlalchemy import select
from fastapi_app.database import get_main_db
from fastapi_app import models

async def check():
    async for db in get_main_db():
        tasks = await db.execute(select(models.Task))
        print(f"Tasks in DB: {len(tasks.scalars().all())}")
        
        habits = await db.execute(select(models.Habit))
        print(f"Habits in DB: {len(habits.scalars().all())}")
        
        stickers = await db.execute(select(models.StickyNote))
        print(f"Stickers in DB: {len(stickers.scalars().all())}")
        
        obs = await db.execute(select(models.Observation))
        print(f"Observations in DB: {len(obs.scalars().all())}")

if __name__ == "__main__":
    asyncio.run(check())
