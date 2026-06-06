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

    async def get_note(self, note_id: int) -> Optional[models.Notes]:
        """Возвращает заметку по ID с подгруженными стикерами."""
        try:
            from sqlalchemy.orm import selectinload
            result = await self.db.execute(
                select(models.Notes)
                .options(selectinload(models.Notes.stickers))
                .where(models.Notes.id == note_id)
            )
            note = result.scalar_one_or_none()
            if note:
                self._prepare_note_view(note)
            return note
        except Exception as e:
            logger.error(f"Error getting note {note_id}: {e}", exc_info=True)
            return None

    async def get_recent_notes(self, limit: int = 10) -> List[models.Notes]:
        """Возвращает последние добавленные заметки."""
        from sqlalchemy.orm import selectinload
        result = await self.db.execute(
            select(models.Notes)
            .options(selectinload(models.Notes.stickers))
            .order_by(models.Notes.created_at.desc())
            .limit(limit)
        )
        notes = list(result.scalars().all())
        for n in notes:
            self._prepare_note_view(n)
        return notes

    async def search_notes(self, query: str, limit: int = 500) -> List[models.Notes]:
        """Поиск заметок по тексту или категории."""
        try:
            from sqlalchemy.orm import selectinload
            result = await self.db.execute(
                select(models.Notes)
                .options(selectinload(models.Notes.stickers))
                .where(
                    or_(
                        models.Notes.note.ilike(f"%{query}%"),
                        models.Notes.category.ilike(f"%{query}%")
                    )
                )
                .order_by(models.Notes.created_at.desc())
                .limit(limit)
            )
            notes = list(result.scalars().all())
            for n in notes:
                self._prepare_note_view(n)
            return notes
        except Exception as e:
            logger.error(f"Error searching notes: {e}", exc_info=True)
            return []
    async def get_pinned_notes(self, limit: int = 10) -> List[models.Notes]:
        """Возвращает закрепленные заметки с подгруженными стикерами."""
        try:
            from sqlalchemy.orm import selectinload
            result = await self.db.execute(
                select(models.Notes)
                .options(selectinload(models.Notes.stickers))
                .where(models.Notes.is_pinned == True)
                .order_by(models.Notes.created_at.desc())
                .limit(limit)
            )
            notes = list(result.scalars().all())
            
            # Post-process for UI compatibility
            for n in notes:
                self._prepare_note_view(n)
                
            return notes
        except Exception as e:
            logger.error(f"Error fetching pinned notes: {e}")
            return []

    def _prepare_note_view(self, n: models.Notes):
        """Adds preview and title fields to a note model instance for UI compatibility."""
        n.preview = (n.note[:100] + '...') if len(n.note) > 100 else n.note
        n.title = f"[{n.category}]" if n.category else f"Note #{n.id}"
        if not hasattr(n, 'stickers') or n.stickers is None:
            n.stickers = []


    async def add_category(self, name: str) -> bool:
        """Создает новую категорию для заметок."""
        try:
            # Check if exists
            res = await self.db.execute(select(models.NoteCategory).where(models.NoteCategory.name == name))
            if res.scalar_one_or_none():
                return True # Already exists
                
            new_cat = models.NoteCategory(name=name)
            self.db.add(new_cat)
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error adding category {name}: {e}")
            return False
