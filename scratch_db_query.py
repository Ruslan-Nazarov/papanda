import asyncio
from fastapi_app.database import get_session_maker
from fastapi_app.models import StickyNote, Task, Event
from sqlalchemy import select, func

async def run():
    session_maker = get_session_maker("default")
    async with session_maker() as session:
        res = await session.execute(select(StickyNote.task_id, StickyNote.finished_at))
        print("Sticky notes (task_id, finished_at):", res.all())
        
        # Test attach_stickers_count
        tasks_res = await session.execute(select(Task).where(Task.done == False))
        tasks = list(tasks_res.scalars().all())
        print(f"Tasks: {[t.id for t in tasks]}")
        
        from fastapi_app.utils import attach_stickers_count
        await attach_stickers_count(session, tasks, 'task_id', StickyNote)
        for t in tasks:
            print(f"Task {t.id} stickers_count: {getattr(t, 'stickers_count', 'MISSING')}")
            
if __name__ == "__main__":
    asyncio.run(run())
