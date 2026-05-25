import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, Integer, JSON, text, select

Base = declarative_base()

class TestModel(Base):
    __tablename__ = 'test_table'
    id = Column(Integer, primary_key=True)
    data = Column(JSON)

async def main():
    engine = create_async_engine('sqlite+aiosqlite:///:memory:')
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Insert test data
        t1 = TestModel(data={"en": True})
        session.add(t1)
        await session.commit()
        
        # Test JSON_EXTRACT query
        res = await session.execute(text("SELECT JSON_EXTRACT(data, '$.en') = 1 FROM test_table"))
        print("= 1:", res.scalar())
        
        res2 = await session.execute(text("SELECT JSON_EXTRACT(data, '$.en') = 'true' FROM test_table"))
        print("= 'true':", res2.scalar())

        res3 = await session.execute(text("SELECT JSON_EXTRACT(data, '$.en') FROM test_table"))
        val = res3.scalar()
        print("Raw extract:", val, type(val))

asyncio.run(main())
