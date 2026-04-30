from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from .. import models
from datetime import datetime
from typing import Optional, List

from ..logger import logger

class NoteService:
    """Сервис для работы с быстрыми заметками."""
    
    def __init__(self, db: AsyncSession):
        """
        Инициализирует сервис.
        
        Args:
            db: Асинхронная сессия SQLAlchemy.
        """
        self.db = db

    async def add_note(self, category: str, note_text: str, sticker_data: Optional[dict] = None, is_pinned: bool = False) -> int:
        """
        Добавляет новую заметку в указанную категорию.
        
        Args:
            category: Название категории.
            note_text: Текст заметки.
            sticker_data: Данные для создания привязанного стикера.
            is_pinned: Флаг закрепления заметки.
            
        Returns:
            int: ID созданной заметки.
        """
        try:
            db_note = models.Notes(category=category, note=note_text, is_pinned=is_pinned)
            self.db.add(db_note)
            await self.db.commit()
            await self.db.refresh(db_note)

            if sticker_data and (sticker_data.get("text") or sticker_data.get("title")):
                from .sticky_note_service import StickyNoteService
                sns = StickyNoteService(self.db)
                s_payload = {
                    **sticker_data,
                    "note_id": db_note.id
                }
                await sns.create_note(s_payload)

            return db_note.id
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error adding note to {category}: {e}", exc_info=True)
            raise

    async def update_note(self, note_id: int, category: str, note_text: str, is_pinned: bool) -> bool:
        """Обновляет существующую заметку."""
        try:
            db_note = await self.db.get(models.Notes, note_id)
            if not db_note:
                return False
            
            db_note.category = category
            db_note.note = note_text
            db_note.is_pinned = is_pinned
            db_note.updated_at = datetime.now()
            
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating note {note_id}: {e}", exc_info=True)
            return False

    async def delete_note(self, note_id: int) -> bool:
        """Удаляет заметку."""
        try:
            db_note = await self.db.get(models.Notes, note_id)
            if not db_note:
                return False
            
            await self.db.delete(db_note)
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting note {note_id}: {e}", exc_info=True)
            return False

    async def get_recent_notes(self, limit: int = 10) -> List[models.Notes]:
        """Возвращает последние добавленные заметки."""
        result = await self.db.execute(
            select(models.Notes)
            .order_by(models.Notes.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def search_notes(self, query: str, limit: int = 50) -> List[models.Notes]:
        """Поиск заметок по тексту или категории."""
        try:
            q = f"%{query.lower()}%"
            result = await self.db.execute(
                select(models.Notes)
                .where(
                    or_(
                        func.lower(models.Notes.note).like(q),
                        func.lower(models.Notes.category).like(q)
                    )
                )
                .order_by(models.Notes.created_at.desc())
                .limit(limit)
            )
            return list(result.scalars().all())
        except Exception as e:
            logger.error(f"Error searching notes: {e}", exc_info=True)
            return []
