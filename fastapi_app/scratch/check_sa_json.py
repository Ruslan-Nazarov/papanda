import asyncio
from sqlalchemy import select, and_, text, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

import sys
sys.path.append('D:\\Библиотека\\Исследования\\Искусственный интеллект\\papanda\\papanda v 0.6 experiment')
from fastapi_app import models

async def main():
    engine = create_async_engine("sqlite+aiosqlite:///../data/db/papanda.db")
    session_maker = async_sessionmaker(engine, class_=AsyncSession)
    
    async with session_maker() as db:
        languages = ['en', 'it', 'de']
        conditions = [text(f"JSON_EXTRACT(knowledge_stats, '$.{lang}') = 1") for lang in languages]
        stmt = select(func.count(models.WordStats.word)).where(and_(*conditions))
        res = await db.execute(stmt)
        print("SQLAlchemy Result:", res.scalar() or 0)

asyncio.run(main())
