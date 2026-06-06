from pydantic import BaseModel, Field, ConfigDict
from datetime import date
from typing import Optional

class HabitBase(BaseModel):
    """Базовая схема привычки."""
    title: str = Field(..., max_length=255)
    start_date: date
    end_date: Optional[date] = None

class HabitCreate(HabitBase):
    """Схема для создания привычки."""
    pass

class HabitView(HabitBase):
    """Схема для отображения привычки."""
    id: int
    read: bool
    model_config = ConfigDict(from_attributes=True)
