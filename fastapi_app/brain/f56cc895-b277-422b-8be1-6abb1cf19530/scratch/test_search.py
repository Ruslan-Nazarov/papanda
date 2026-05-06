import asyncio
import os
import sys

# Add project root to sys.path
sys.path.append(os.getcwd())

from fastapi_app.database import get_session_maker
from fastapi_app.models import notes as models
from sqlalchemy import select
from sqlalchemy.orm import selectinload

async def test_search():
    session_maker = get_session_maker("default")
    async with session_maker() as db:
        try:
            stmt = select(models.Notes).limit(5)
            res = await db.execute(stmt)
            records = res.scalars().all()
            print(f"FOUND {len(records)} RECORDS")
            for r in records:
                print(f" - {r.id}: {r.category} | {r.note[:30]}...")
        except Exception as e:
            print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(test_search())
