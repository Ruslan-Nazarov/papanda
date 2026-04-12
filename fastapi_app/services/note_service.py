from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .. import models
from datetime import datetime

from ..logger import logger

class NoteService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def add_note(self, category: str, note_text: str):
        """
        Добавляет заметку и проверяет что она сохранилась (перечитывая из БД).
        Возвращает ID созданной заметки.
        """
        try:
            full_note = f"{note_text} (added: {datetime.now().date()})"
            db_note = models.Notes(category=category, note=full_note)
            self.db.add(db_note)
            await self.db.commit()
            await self.db.refresh(db_note)

            # ✅ ПРОВЕРКА: перечитываем из БД для гарантии сохранения
            result = await self.db.execute(
                select(models.Notes)
                .where(models.Notes.id == db_note.id)
            )
            verified = result.scalar_one_or_none()
            if verified:
                return verified.id
            else:
                raise Exception("Заметка не найдена в БД после сохранения")
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error adding note to {category}: {e}")
            raise
