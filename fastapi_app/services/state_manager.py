from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from .sync_service import SyncService
from .context_service import ContextService

class StateManager:
    """
    Фасад для управления состоянием приложения.
    Делегирует задачи специализированным сервисам SyncService и ContextService.
    Оставлен для обратной совместимости с существующими роутерами.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.sync_service = SyncService(db)
        self.context_service = ContextService(db)

    async def import_excel_to_db(self, excel_path: str) -> Dict[str, Any]:
        """Импортирует слова из Excel в таблицу WordStats."""
        return await self.sync_service.import_excel_to_db(excel_path)

    async def sync_conflicts(self, excel_path: str, resolutions: Dict[str, str]) -> Dict[str, Any]:
        """Применяет разрешения конфликтов синхронизации."""
        return await self.sync_service.sync_conflicts(excel_path, resolutions)

    async def get_runtime_context(self, force_update: bool = False) -> Dict[str, Any]:
        """Получает или генерирует текущий рантайм-контекст."""
        return await self.context_service.get_runtime_context(force_update)

    async def remove_word_from_cache(self, eng: str) -> None:
        """Удаляет слово из кэша текущих слов."""
        await self.context_service.remove_word_from_cache(eng)

    async def replace_word_in_cache(self, eng: str) -> Optional[Dict[str, Any]]:
        """Удаляет слово из кэша и заменяет новым."""
        return await self.context_service.replace_word_in_cache(eng)
