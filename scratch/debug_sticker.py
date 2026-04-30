import sys
import json
import asyncio
import os

# Ensure paths correctly resolve
sys.path.append(os.path.abspath(os.path.dirname(__file__) + '/..'))
from fastapi_app.database import get_session_maker
from fastapi_app.models import StickyNote
from sqlalchemy import select

async def main():
    session_maker = get_session_maker("default")
    async with session_maker() as db:
        q = select(StickyNote).where(StickyNote.title == 'приостановить')
        r = await db.execute(q)
        note = r.scalars().first()
        if note:
            print("TITLE:", note.title)
            print("TYPE:", note.type)
            print("TEXT:", repr(note.text))
            try:
                data = json.loads(note.text)
                print("JSON DATA TYPE:", type(data))
                if isinstance(data, dict):
                    print("HAS ITEMS:", 'items' in data)
                elif isinstance(data, str):
                    print("STRING DATA:", data)
            except Exception as e:
                print("JSON ERROR:", e)
        else:
            print("NOT FOUND")

if __name__ == '__main__':
    asyncio.run(main())
