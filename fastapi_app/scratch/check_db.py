import asyncio
from fastapi_app import models
from fastapi_app.database import Base, engine

async def check():
    print("Tables in metadata:", Base.metadata.tables.keys())
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Creation attempt finished.")

if __name__ == "__main__":
    asyncio.run(check())
