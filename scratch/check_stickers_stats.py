import asyncio
import os
import sys

# Add the project root to sys.path
sys.path.append(os.getcwd())

from fastapi_app.database import get_session_maker
from fastapi_app.models.notes import StickyNote
from sqlalchemy import select, func

async def check():
    session_maker = get_session_maker("default")
    async with session_maker() as db:
        # Total
        total_res = await db.execute(select(func.count(StickyNote.id)))
        total = total_res.scalar()
        
        # Finished
        finished_res = await db.execute(select(func.count(StickyNote.id)).where(StickyNote.finished_at.isnot(None)))
        finished = finished_res.scalar()
        
        # Standalone
        standalone_res = await db.execute(select(func.count(StickyNote.id)).where(
            StickyNote.task_id.is_(None),
            StickyNote.habit_id.is_(None),
            StickyNote.note_id.is_(None),
            StickyNote.event_id.is_(None),
            StickyNote.recurrence_id.is_(None)
        ))
        standalone = standalone_res.scalar()
        
        print(f"Total stickers: {total}")
        print(f"Finished stickers: {finished}")
        print(f"Standalone stickers: {standalone}")
        
        # Sample
        res = await db.execute(select(StickyNote).limit(10))
        for s in res.scalars().all():
            print(f"ID: {s.id}, Title: {s.title}, Text: {s.text}")

if __name__ == "__main__":
    asyncio.run(check())
