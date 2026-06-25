import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi_app.database import get_session_maker
from fastapi_app.models.dialectics import Dialectics
from sqlalchemy import update

async def migrate_titles():
    session_maker = get_session_maker("default")
    async with session_maker() as session:
        stmt = update(Dialectics).where(Dialectics.title == "Untitled Dialectics").values(title="")
        res = await session.execute(stmt)
        await session.commit()
        print(f"Updated {res.rowcount} dialectics records.")

if __name__ == "__main__":
    asyncio.run(migrate_titles())
