from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from .database import get_db
from .services.note_service import NoteService
from .services.word_service import WordService
from .services.dashboard_service import DashboardService
from .services.sticky_note_service import StickyNoteService
from .services.history_service import HistoryService

async def get_note_service(db: AsyncSession = Depends(get_db)) -> NoteService:
    return NoteService(db)

async def get_word_service(db: AsyncSession = Depends(get_db)) -> WordService:
    return WordService(db)

async def get_dashboard_service(db: AsyncSession = Depends(get_db)) -> DashboardService:
    return DashboardService(db)

async def get_sticky_note_service(db: AsyncSession = Depends(get_db)) -> StickyNoteService:
    return StickyNoteService(db)

async def get_history_service(db: AsyncSession = Depends(get_db)) -> HistoryService:
    return HistoryService(db)
