import asyncio
import sys
import os

sys.path.append(os.getcwd())

from fastapi_app.database import get_session_maker
from fastapi_app.services.word_service import WordService

async def check():
    session_maker = get_session_maker("default")
    async with session_maker() as db:
        ws = WordService(db)
        langs = await ws.get_active_languages()
        print(f"Active languages: {langs}")

if __name__ == '__main__':
    asyncio.run(check())
