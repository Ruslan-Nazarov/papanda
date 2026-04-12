from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from .. import models
from datetime import datetime, timezone, date
from typing import List, Optional

class StickyNoteService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_active_notes(self) -> List[models.StickyNote]:
        """Возвращает все активные стикеры (которые еще не завершены)."""
        result = await self.db.execute(
            select(models.StickyNote)
            .where(models.StickyNote.finished_at.is_(None))
            .order_by(models.StickyNote.position.asc(), models.StickyNote.created_at.desc())
        )
        return result.scalars().all()



    async def create_note(self, text: str, title: Optional[str] = None, color: str = "#fff9c4", note_type: str = "text") -> models.StickyNote:
        """Создает новый стикер."""
        # Получаем максимальную позицию
        max_pos_res = await self.db.execute(select(func.max(models.StickyNote.position)))
        max_pos = max_pos_res.scalar() or 0
        
        new_note = models.StickyNote(
            text=text,
            title=title,
            color=color,
            type=note_type,
            position=max_pos + 1
        )
        self.db.add(new_note)
        await self.db.commit()
        await self.db.refresh(new_note)
        return new_note

    async def update_note(self, note_id: int, text: Optional[str] = None, title: Optional[str] = None, color: Optional[str] = None, note_type: Optional[str] = None) -> Optional[models.StickyNote]:
        """Обновляет текст, заголовок, цвет или тип стикера."""
        note = await self.db.get(models.StickyNote, note_id)
        if note:
            if text is not None: note.text = text
            if title is not None: note.title = title
            if color is not None: note.color = color
            if note_type is not None: note.type = note_type
            await self.db.commit()
            await self.db.refresh(note)
        return note

    async def delete_note(self, note_id: int) -> bool:
        """Мягкое удаление стикера (помечаем как завершенный)."""
        note = await self.db.get(models.StickyNote, note_id)
        if note:
            note.finished_at = datetime.now()
            await self.db.commit()
            return True
        return False

    async def get_notes_for_date(self, target_date: date) -> List[models.StickyNote]:
        """
        Возвращает стикеры, которые были активны в указанную дату.
        Активен если: создан до конца дня И (не завершен ИЛИ завершен после начала дня).
        """
        from datetime import datetime, time
        start_of_day = datetime.combine(target_date, time.min)
        end_of_day = datetime.combine(target_date, time.max)
        
        result = await self.db.execute(
            select(models.StickyNote)
            .where(
                models.StickyNote.created_at <= end_of_day,
                (models.StickyNote.finished_at.is_(None)) | (models.StickyNote.finished_at >= start_of_day)
            )
            .order_by(models.StickyNote.created_at.asc())
        )
        return result.scalars().all()

    async def reorder_notes(self, note_ids: List[int]):
        """Обновляет порядок стикеров (для Drag-and-Drop)."""
        for index, n_id in enumerate(note_ids):
            note = await self.db.get(models.StickyNote, n_id)
            if note:
                note.position = index
        await self.db.commit()
