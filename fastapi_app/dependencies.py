from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from .database import get_db
from .services.note_service import NoteService
from .services.word_service import WordService
from .services.dashboard_service import DashboardService
from .services.sticky_note_service import StickyNoteService
from .services.history_service import HistoryService
from .services.state_manager import StateManager
from .services.maintenance_service import MaintenanceService
from .services.admin_service import AdminService
from .services.export_service import ExportService
from .services.account_service import AccountService
from .services.event_service import EventService
from .services.task_service import TaskService
from .services.habit_service import HabitService
from .services.chronology_service import ChronologyService
from .services.dialectics_service import DialecticsService

async def get_note_service(db: AsyncSession = Depends(get_db)) -> NoteService:
    """Возвращает экземпляр NoteService с внедренной сессией БД."""
    return NoteService(db)

async def get_word_service(db: AsyncSession = Depends(get_db)) -> WordService:
    """Возвращает экземпляр WordService с внедренной сессией БД."""
    return WordService(db)

async def get_dashboard_service(db: AsyncSession = Depends(get_db)) -> DashboardService:
    """Возвращает экземпляр DashboardService с внедренной сессией БД."""
    return DashboardService(db)

async def get_sticky_note_service(db: AsyncSession = Depends(get_db)) -> StickyNoteService:
    """Возвращает экземпляр StickyNoteService с внедренной сессией БД."""
    return StickyNoteService(db)

async def get_history_service(db: AsyncSession = Depends(get_db)) -> HistoryService:
    """Возвращает экземпляр HistoryService с внедренной сессией БД."""
    return HistoryService(db)

async def get_state_manager(db: AsyncSession = Depends(get_db)) -> StateManager:
    """Возвращает экземпляр StateManager с внедренной сессией БД."""
    return StateManager(db)

async def get_maintenance_service(db: AsyncSession = Depends(get_db)) -> MaintenanceService:
    """Возвращает экземпляр MaintenanceService с внедренной сессией БД."""
    return MaintenanceService(db)

async def get_admin_service(db: AsyncSession = Depends(get_db)) -> AdminService:
    """Возвращает экземпляр AdminService с внедренной сессией БД."""
    return AdminService(db)

async def get_export_service(db: AsyncSession = Depends(get_db)) -> ExportService:
    """Возвращает экземпляр ExportService с внедренной сессией БД."""
    return ExportService(db)

async def get_account_service(db: AsyncSession = Depends(get_db)) -> AccountService:
    """Возвращает экземпляр AccountService с внедренной сессией БД."""
    return AccountService(db)

async def get_event_service(db: AsyncSession = Depends(get_db)) -> EventService:
    """Возвращает экземпляр EventService с внедренной сессией БД."""
    return EventService(db)

async def get_task_service(db: AsyncSession = Depends(get_db)) -> TaskService:
    """Возвращает экземпляр TaskService с внедренной сессией БД."""
    return TaskService(db)

async def get_habit_service(db: AsyncSession = Depends(get_db)) -> HabitService:
    """Возвращает экземпляр HabitService с внедренной сессией БД."""
    return HabitService(db)

async def get_chronology_service(db: AsyncSession = Depends(get_db)) -> ChronologyService:
    """Возвращает экземпляр ChronologyService с внедренной сессией БД."""
    return ChronologyService(db)

async def get_dialectics_service(db: AsyncSession = Depends(get_db)) -> DialecticsService:
    """Возвращает экземпляр DialecticsService с внедренной сессией БД."""
    return DialecticsService(db)
