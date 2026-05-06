import asyncio
import os
import sys

# Add project root to sys.path
sys.path.append(os.getcwd())

from fastapi_app.database import get_session_maker
from fastapi_app.models.notes import Notes
from sqlalchemy import select, func

async def count_notes():
    session_maker = get_session_maker("default")
    async with session_maker() as db:
        res = await db.execute(select(func.count(Notes.id)))
        count = res.scalar()
        print(f"TOTAL NOTES IN DB: {count}")
        
        if count > 0:
            res = await db.execute(select(Notes).limit(5))
            notes = res.scalars().all()
            for n in notes:
                print(f"ID: {n.id}, Category: {n.category}, Note: {n.note[:20]}...")

if __name__ == "__main__":
    asyncio.run(count_notes())
