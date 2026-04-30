import asyncio
from sqlalchemy import select
from fastapi_app.database import get_engine
from fastapi_app import models

async def check():
    engine = get_engine("default")
    async with engine.connect() as conn:
        # Check anchor note
        res = await conn.execute(select(models.Notes).where(models.Notes.category == "Language Learning System"))
        note = res.first()
        print(f"Anchor Note: {note}")
        
        # Check if any stickers are linked to it
        if note:
            res_s = await conn.execute(select(models.StickyNote).where(models.StickyNote.note_id == note.id))
            stickers = res_s.all()
            print(f"Linked Stickers: {len(stickers)}")
            for s in stickers:
                print(f" - Sticker ID: {s.id}, Text: {s.text[:20]}, NoteID: {s.note_id}")

if __name__ == "__main__":
    asyncio.run(check())
