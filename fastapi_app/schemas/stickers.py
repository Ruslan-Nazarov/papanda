from __future__ import annotations
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .notes import NoteView

class StickyNoteBase(BaseModel):
    """Базовая схема стикера (Sticky Note)."""
    title: Optional[str] = None
    text: str
    color: str = "#fff9c4"
    type: str = "text"

class StickyNoteCreate(StickyNoteBase):
    """Схема для создания стикера."""
    event_id: Optional[int] = None
    recurrence_id: Optional[str] = None
    task_id: Optional[int] = None
    habit_id: Optional[int] = None
    note_id: Optional[int] = None
    dialectics_id: Optional[int] = None

class StickyNoteView(StickyNoteBase):
    """Схема для отображения стикера."""
    id: int
    position: int
    created_at: datetime
    finished_at: Optional[datetime] = None
    event_id: Optional[int] = None
    recurrence_id: Optional[str] = None
    task_id: Optional[int] = None
    habit_id: Optional[int] = None
    note_id: Optional[int] = None
    dialectics_id: Optional[int] = None
    note: Optional[NoteView] = None
    model_config = ConfigDict(from_attributes=True)
