from fastapi import Request
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker, AsyncEngine
from sqlalchemy.orm import DeclarativeBase
from typing import AsyncGenerator, Optional, Dict
from .config import settings

# 1. Справочник "движков" для поддержки песочницы
_engines: Dict[str, AsyncEngine] = {}
_keep_alive_connections: Dict[str, any] = {}
_initialized_sessions = set()

def get_engine(db_label: str = "default") -> AsyncEngine:
    """
    Возвращает SQLAlchemy engine для указанной БД (основная или песочница).
    
    Args:
        db_label: Метка базы данных.
        
    Returns:
        AsyncEngine: Асинхронный движок SQLAlchemy.
    """
    if db_label not in _engines:
        if db_label != "default" and settings.demo_mode:
            db_url = f"sqlite+aiosqlite:///file:memdb_{db_label}?mode=memory&cache=shared&uri=true"
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

from sqlalchemy import MetaData

naming_convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}

# 4. Базовый класс для всех ваших таблиц (моделей)
class Base(DeclarativeBase):
    """Базовый класс для декларативных моделей SQLAlchemy."""
    metadata = MetaData(naming_convention=naming_convention)
    pass

# 5. Функция-зависимость для получения асинхронной сессии базы данных
async def get_db(request: Request) -> AsyncGenerator[AsyncSession, None]:
    """
    Зависимость (Dependency) для получения асинхронной сессии БД.
    Поддерживает демо-песочницу на основе сессий.
    """
    session_id = getattr(request.state, "session_id", "default")
    locale = request.cookies.get("locale", "en")
    await ensure_session_db(session_id, locale)
    
    session_maker = get_session_maker(session_id)
    async with session_maker() as db:
        try:
            yield db
        finally:
            await db.close()

async def ensure_session_db(session_id: str, locale: str = "en") -> None:
    """Гарантирует, что база данных для указанной сессии создана и наполнена демо-данными."""
    if session_id in _initialized_sessions:
        return
        
    engine = get_engine(session_id)
    
    if session_id != "default" and settings.demo_mode:
        if session_id not in _keep_alive_connections:
            # Удерживаем открытым хотя бы одно соединение, чтобы SQLite в памяти не удалялась
            conn = await engine.connect()
            _keep_alive_connections[session_id] = conn
            
            # Загружаем модели для регистрации в Base.metadata
            from . import models
            
            # Создаем таблицы во временной БД
            async with engine.begin() as conn_init:
                await conn_init.run_sync(Base.metadata.create_all)
                
            # Заполняем демо-данными
            session_maker = get_session_maker(session_id)
            async with session_maker() as db:
                try:
                    await seed_demo_data(db, locale)
                except Exception as e:
                    from .logger import logger
                    logger.error(f"Failed to seed demo data for session {session_id}: {e}", exc_info=True)
                    
    _initialized_sessions.add(session_id)

async def seed_demo_data(db: AsyncSession, locale: str = "en") -> None:
    """Наполняет базу данных песочницы демонстрационными данными."""
    from .demo_data import DEMO_DATA
    from .models.tasks import Task, Habit
    from .models.observation import Observation
    from .models.events import Event
    from .models.notes import StickyNote
    from datetime import datetime, timezone

    # 1. Загрузка стандартного примера
    await seed_example_note(db, locale)
    
    data = DEMO_DATA.get(locale, DEMO_DATA["en"])
    
    # 2. Создание демонстрационных задач, привычек и наблюдений
    db.add_all([
        Task(name=data["tasks"][0], done=False, position=0),
        Task(name=data["tasks"][1], done=False, position=1),
        Task(name=data["tasks"][2], done=True, position=2),
    ])
    
    db.add_all([
        Habit(title=data["habits"][0], read=False),
        Habit(title=data["habits"][1], read=False),
    ])
    
    db.add_all([
        Observation(text=data["observations"][0], priority=1, status="periodic"),
        Observation(text=data["observations"][1], priority=2, status="periodic"),
    ])
    
    db.add_all([
        Event(title=data["events"][0], date=datetime.now(timezone.utc)),
        Event(title=data["events"][1], date=datetime.now(timezone.utc)),
    ])

    db.add_all([
        StickyNote(title="Tip", text=data["stickers"][0]),
        StickyNote(title="Hint", text=data["stickers"][1], color="#e8f5e9"),
    ])

    await db.commit()
    
    # 3. Автоматический импорт словаря из translate.xlsx
    from .services.word_service import WordService
    from .services.state_manager import StateManager
    
    word_service = WordService(db)
    metrics = await word_service.get_current_metrics()
    if metrics.get('total_count', 0) == 0:
        state_manager = StateManager(db)
        await state_manager.import_excel_to_db(str(settings.excel_path))

async def seed_example_note(db: AsyncSession, locale: str = "en") -> None:
    """Сеет пример конспекта, если его нет в базе данных."""
    from .models.dialectics import Dialectics
    from .config import INTERNAL_ROOT
    from .logger import logger
    import json
    from sqlalchemy import select
    
    locale_map = {
        "en": ("Example Note", "example_note_content.json"),
        "ru": ("Пример конспекта", "example_note_content_ru.json"),
        "kk": ("Конспект мысалы", "example_note_content_kk.json")
    }
    target_title, json_file = locale_map.get(locale, locale_map["en"])
    
    stmt = select(Dialectics).where(Dialectics.title.in_(["Example Note", "Пример конспекта", "Конспект мысалы"]))
    res = await db.execute(stmt)
    existing = res.scalars().first()
    if not existing:
        json_path = INTERNAL_ROOT / "fastapi_app" / "static" / json_file
        if not json_path.exists():
            json_path = INTERNAL_ROOT / "fastapi_app" / "static" / "example_note_content.json"
        
        if json_path.exists():
            try:
                with open(json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                new_note = Dialectics(
                    title=data.get("title", "Example Note"),
                    content_json=data.get("content_json", []),
                    is_pinned=data.get("is_pinned", False)
                )
                db.add(new_note)
                await db.commit()
                logger.info("Example Note successfully seeded.")
            except Exception as e:
                logger.error(f"Failed to seed Example Note: {e}", exc_info=True)
        else:
            logger.warning(f"Example Note JSON file not found at {json_path}")

async def get_main_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Всегда возвращает сессию ОСНОВНОЙ базы данных.
    """
    session_maker = get_session_maker("default")
    async with session_maker() as db:
        try:
            yield db
        finally:
            await db.close()

async def reseed_demo_data(db: AsyncSession, locale: str) -> None:
    from .models.tasks import Task, Habit
    from .models.observation import Observation
    from .models.events import Event
    from .models.notes import StickyNote
    from sqlalchemy import delete
    
    # 1. Clear existing generic demo records (all in demo mode)
    await db.execute(delete(Task))
    await db.execute(delete(Habit))
    await db.execute(delete(Observation))
    await db.execute(delete(Event))
    await db.execute(delete(StickyNote))
    await db.commit()
    
    # 2. Reseed
    await seed_demo_data(db, locale)

