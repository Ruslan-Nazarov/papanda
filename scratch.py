import asyncio
import os
from fastapi_app.database import get_db
from fastapi_app.models.notes import Note
from sqlalchemy.future import select

async def main():
    async for session in get_db():
        res = await session.execute(select(Note))
        notes = res.scalars().all()
        for n in notes:
            print(f"Title: {n.title}, SyncID: {n.sync_id}, Status: {n.status}, ID: {n.id}")
            
if __name__ == "__main__":
    asyncio.run(main())
