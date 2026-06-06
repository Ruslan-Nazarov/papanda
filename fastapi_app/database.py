from fastapi import Request
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker, AsyncEngine
from sqlalchemy.orm import DeclarativeBase
from typing import AsyncGenerator, Optional, Dict
from .config import settings

# 1. Справочник "движков" для поддержки песочницы
_engines: Dict[str, AsyncEngine] = {}

def get_engine(db_label: str = "default") -> AsyncEngine:
    """
    Возвращает SQLAlchemy engine для указанной БД (основная или песочница).
    
    Args:
        db_label: Метка базы данных ("default" или "sandbox").
        
    Returns:
        AsyncEngine: Асинхронный движок SQLAlchemy.
    """
    if db_label not in _engines:
        if db_label == "sandbox":
            db_path = settings.db_dir / "sandbox_demo.db"
            db_url = f"sqlite+aiosqlite:///{db_path}"
        else:
            db_url = settings.final_database_url
            
        _engines[db_label] = create_async_engine(
            db_url, 
            connect_args={"check_same_thread": False}
        )
    return _engines[db_label]

# Храним фабрики сессий
_session_makers: Dict[str, async_sessionmaker[AsyncSession]] = {}

def get_session_maker(db_label: str = "default") -> async_sessionmaker[AsyncSession]:
    """
    Возвращает фабрику сессий для указанной базы данных.
    
    Args:
        db_label: Метка базы данных.
        
    Returns:
        async_sessionmaker: Асинхронная фабрика сессий.
    """
    if db_label not in _session_makers:
        engine = get_engine(db_label)
        _session_makers[db_label] = async_sessionmaker(
            autocommit=False, 
            autoflush=False, 
            expire_on_commit=False,
            bind=engine, 
            class_=AsyncSession
        )
    return _session_makers[db_label]

# 4. Базовый класс для всех ваших таблиц (моделей)
class Base(DeclarativeBase):
    """Базовый класс для декларативных моделей SQLAlchemy."""
    pass

# 5. Функция-зависимость для получения асинхронной сессии базы данных
async def get_db(request: Request) -> AsyncGenerator[AsyncSession, None]:
    """
    Зависимость (Dependency) для получения асинхронной сессии БД.
    Если в куках есть 'papanda_mode=sandbox', подключается к тестовой базе (песочнице).
    
    Args:
        request: Объект запроса FastAPI для проверки кук.
        
    Yields:
        AsyncSession: Асинхронная сессия базы данных.
    """
    db_label = "default"
    if request and request.cookies.get("papanda_mode") == "sandbox":
        db_label = "sandbox"
        # Гарантируем наличие таблиц в песочнице
        engine = get_engine(db_label)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            
    session_maker = get_session_maker(db_label)
    async with session_maker() as db:
        try:
            yield db
        finally:
            await db.close()

async def get_main_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Всегда возвращает сессию ОСНОВНОЙ базы данных.
    Используется там, где песочница недопустима (например, в сервисах аутентификации).
    
    Yields:
        AsyncSession: Асинхронная сессия основной базы данных.
    """
    session_maker = get_session_maker("default")
    async with session_maker() as db:
        try:
            yield db
        finally:
            await db.close()
