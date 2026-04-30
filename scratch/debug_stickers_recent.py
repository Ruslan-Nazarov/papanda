import asyncio
from sqlalchemy import select
from fastapi_app.database import get_engine
from fastapi_app import models
from datetime import datetime, timedelta, timezone

async def check():
    engine = get_engine("default")
    async with engine.connect() as conn:
        # Check all stickers created in the last 10 minutes
        ten_min_ago = datetime.now(timezone.utc) - timedelta(minutes=10)
        res = await conn.execute(select(models.StickyNote).where(models.StickyNote.created_at >= ten_min_ago))
        stickers = res.all()
        print(f"Recent Stickers: {len(stickers)}")
        for s in stickers:
            print(f" - ID: {s.id}, Text: {s.text[:20]}, note_id: {s.note_id}, task_id: {s.task_id}")

if __name__ == "__main__":
    asyncio.run(check())
