import asyncio
import sys
import os

sys.path.append(os.getcwd())

from fastapi_app.database import get_session_maker
from sqlalchemy import text

async def check():
    session_maker = get_session_maker("default")
    async with session_maker() as db:
        res = await db.execute(text("SELECT key, value FROM settings"))
        for row in res.fetchall():
            print(f"{row[0]}: {row[1]}")

if __name__ == '__main__':
    asyncio.run(check())
