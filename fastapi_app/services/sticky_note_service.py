from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from .. import models
from datetime import datetime, timezone, date
from typing import List, Optional, Dict, Any

class StickyNoteService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_active_notes(self) -> List[models.StickyNote]:
        """Возвращает все активные стикеры (которые еще не завершены и не привязаны ни к чему)."""
        result = await self.db.execute(
            select(models.StickyNote)
            .options(selectinload(models.StickyNote.note))
            .where(
                models.StickyNote.finished_at.is_(None),
                models.StickyNote.event_id.is_(None),
                models.StickyNote.recurrence_id.is_(None),
                models.StickyNote.task_id.is_(None),
                models.StickyNote.habit_id.is_(None),
                models.StickyNote.note_id.is_(None),
                models.StickyNote.dialectics_id.is_(None)
            )
            .order_by(models.StickyNote.position.asc(), models.StickyNote.created_at.desc())
        )
        return result.scalars().all()



    async def create_note(self, data: Optional[Dict[str, Any]] = None, **kwargs) -> models.StickyNote:
        """
        Creates a new sticky note. Supports passing a dict or keyword arguments.
        """
        if data is None:
            data = kwargs
        else:
            data = {**data, **kwargs}

        # Handle position
        max_pos_res = await self.db.execute(select(func.max(models.StickyNote.position)))
        max_pos = max_pos_res.scalar() or 0
        
        note = models.StickyNote(
            text=data.get("text", ""),
            title=data.get("title"),
            color=data.get("color", "#fff9c4"),
            type=data.get("type") or data.get("note_type", "text"),
            position=max_pos + 1,
            event_id=data.get("event_id"),
            recurrence_id=data.get("recurrence_id"),
            task_id=data.get("task_id"),
            habit_id=data.get("habit_id"),
            note_id=data.get("note_id"),
            dialectics_id=data.get("dialectics_id")
        )
        self.db.add(note)
        await self.db.commit()
        return await self.get_note(note.id)

    async def get_note(self, note_id: int) -> Optional[models.StickyNote]:
        """Возвращает стикер по ID с подгруженными связями."""
        result = await self.db.execute(
            select(models.StickyNote)
            .options(selectinload(models.StickyNote.note))
            .where(models.StickyNote.id == note_id)
        )
        return result.scalar_one_or_none()

    async def update_note(self, note_id: int, text: Optional[str] = None, title: Optional[str] = None, color: Optional[str] = None, note_type: Optional[str] = None, note_id_link: Optional[int] = None) -> Optional[models.StickyNote]:
        """Обновляет текст, заголовок, цвет, тип или привязанную заметку стикера."""
        note = await self.db.get(models.StickyNote, note_id)
        if note:
            if text is not None: note.text = text
            if title is not None: note.title = title
            if color is not None: note.color = color
            if note_type is not None: note.type = note_type
            if note_id_link is not None: note.note_id = note_id_link if note_id_link > 0 else None
            await self.db.commit()
            return await self.get_note(note_id)
        return None

    async def archive_note(self, note_id: int) -> bool:
        """Мягкое удаление стикера (помечаем как завершенный)."""
        note = await self.db.get(models.StickyNote, note_id)
        if note:
            note.finished_at = datetime.now()
            await self.db.commit()
            return True
        return False

    async def hard_delete_note(self, note_id: int) -> bool:
        """Полное удаление стикера из базы данных."""
        note = await self.db.get(models.StickyNote, note_id)
        if note:
            await self.db.delete(note)
            await self.db.commit()
            return True
        return False

    async def get_notes_for_event(self, event_id: int, recurrence_id: Optional[str] = None) -> List[models.StickyNote]:
        """Возвращает стикеры, привязанные к конкретному событию или его серии."""
        from sqlalchemy import or_
        filters = [models.StickyNote.event_id == event_id]
        if recurrence_id:
            filters.append(models.StickyNote.recurrence_id == recurrence_id)
        
        result = await self.db.execute(
            select(models.StickyNote)
            .options(selectinload(models.StickyNote.note))
            .where(
                models.StickyNote.finished_at.is_(None),
                or_(*filters)
            )
            .order_by(models.StickyNote.created_at.asc())
        )
        return result.scalars().all()

    async def get_notes_for_task(self, task_id: int) -> List[models.StickyNote]:
        """Возвращает стикеры, привязанные к задаче."""
        result = await self.db.execute(
            select(models.StickyNote)
            .options(selectinload(models.StickyNote.note))
            .where(
                models.StickyNote.finished_at.is_(None),
                models.StickyNote.task_id == task_id
            )
            .order_by(models.StickyNote.created_at.asc())
        )
        return result.scalars().all()

    async def get_notes_for_habit(self, habit_id: int) -> List[models.StickyNote]:
        """Возвращает стикеры, привязанные к привычке."""
        result = await self.db.execute(
            select(models.StickyNote)
            .options(selectinload(models.StickyNote.note))
            .where(
                models.StickyNote.finished_at.is_(None),
                models.StickyNote.habit_id == habit_id
            )
            .order_by(models.StickyNote.created_at.asc())
        )
        return result.scalars().all()

    async def get_notes_for_note(self, note_id: int) -> List[models.StickyNote]:
        """Возвращает стикеры, привязанные к обычной заметке."""
        result = await self.db.execute(
            select(models.StickyNote)
            .options(selectinload(models.StickyNote.note))
            .where(
                models.StickyNote.finished_at.is_(None),
                models.StickyNote.note_id == note_id
            )
            .order_by(models.StickyNote.created_at.asc())
        )
        return result.scalars().all()

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
            .options(selectinload(models.StickyNote.note))
            .where(
                models.StickyNote.created_at <= end_of_day,
                (models.StickyNote.finished_at.is_(None)) | (models.StickyNote.finished_at >= start_of_day),
                models.StickyNote.event_id.is_(None),
                models.StickyNote.recurrence_id.is_(None),
                models.StickyNote.task_id.is_(None),
                models.StickyNote.habit_id.is_(None),
                models.StickyNote.note_id.is_(None),
                models.StickyNote.dialectics_id.is_(None)
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
