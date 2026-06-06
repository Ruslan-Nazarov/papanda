from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

class EventBase(BaseModel):
    """Базовая схема события."""
    title: str = Field(..., max_length=255)
    date: datetime
    important: bool = False

class EventCreate(EventBase):
    """Схема для создания события."""
    pass

class EventView(EventBase):
    """Схема для отображения события."""
    id: int
    done: bool
    model_config = ConfigDict(from_attributes=True)

class EventColorUpdate(BaseModel):
    """Схема обновления цвета событий."""
    color: str
    label: str = ""
