
import asyncio
import os
import sys
from sqlalchemy import select, func

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi_app.database import get_session_maker
from fastapi_app import models

async def check():
    session_maker = get_session_maker("default")
    async with session_maker() as db:
        res = await db.execute(select(func.count(models.WordShowsDaily.id)))
        count = res.scalar() or 0
        print(f"Total rows in WordShowsDaily: {count}")
        
        if count > 0:
            last_rows = await db.execute(select(models.WordShowsDaily).order_by(models.WordShowsDaily.date.desc()).limit(5))
            for r in last_rows.scalars().all():
                print(f"Date: {r.date}, Count: {r.shows_count}")

if __name__ == "__main__":
    asyncio.run(check())
