import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from .config import settings

# 1. Пути теперь берутся из центрального конфига .config

# 2. Создаем асинхронный "движок"
engine = create_async_engine(
    settings.final_database_url, 
    connect_args={"check_same_thread": False}
)

# 3. Создаем фабрику асинхронных сессий
AsyncSessionLocal = async_sessionmaker(
    autocommit=False, 
    autoflush=False, 
    expire_on_commit=False, # Не сбрасываем объекты после коммита
    bind=engine, 
    class_=AsyncSession
)

# 4. Базовый класс для всех ваших таблиц (моделей)
class Base(DeclarativeBase):
    pass

# 5. Функция-зависимость для получения асинхронной сессии базы данных
async def get_db():
    async with AsyncSessionLocal() as db:
        try:
            yield db
        finally:
            await db.close()
