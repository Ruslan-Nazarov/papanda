from __future__ import annotations
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from fastapi import Form

if TYPE_CHECKING:
    from .stickers import StickyNoteView

class NoteBase(BaseModel):
    """Базовая схема заметки."""
    category: Optional[str] = Field(None, max_length=50)
    note: str = Field(..., min_length=1, max_length=10000)

class NoteCreate(NoteBase):
    """Схема для создания заметки."""
    pass

class NoteView(NoteBase):
    """Схема для отображения заметки."""
    id: int
    is_pinned: bool = False
    created_at: datetime
    preview: Optional[str] = None
    title: Optional[str] = None
    stickers: List[StickyNoteView] = []
    model_config = ConfigDict(from_attributes=True)

class NoteUpdate(BaseModel):
    """Схема для обновления заметки."""
    category: str
    note: str
    is_pinned: bool = False

class CategoryUpdateSchema(BaseModel):
    """Схема обновления категорий заметок."""
    categories_list: str = Field(..., description="Newline-separated list of categories")

    @classmethod
    def as_form(cls, categories_list: str = Form(...)):
        return cls(categories_list=categories_list)
