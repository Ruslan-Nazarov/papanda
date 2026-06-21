import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select
from fastapi_app.models.vocabulary import WordStatsSnapshot
from fastapi_app.config import settings

async def test():
    engine = create_async_engine(settings.final_database_url)
    maker = async_sessionmaker(engine)
    async with maker() as db:
        res = await db.execute(select(WordStatsSnapshot))
        snaps = res.scalars().all()
        for s in snaps:
            try:
                if s.test_stats_json:
                    total = sum(v.get("total", 0) for v in s.test_stats_json.values())
                    success = sum(v.get("success", 0) for v in s.test_stats_json.values())
            except Exception as e:
                print(f"Error on {s.date}: {e}, JSON: {s.test_stats_json}")

asyncio.run(test())
