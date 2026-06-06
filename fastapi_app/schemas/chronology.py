from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, date
from fastapi import Form

class ChronoCreate(BaseModel):
    """Схема для создания записи в хронологии."""
    text: str = Field(..., min_length=1, max_length=10000)
    date: datetime

    @classmethod
    def as_form(cls, chrono_text: str = Form(...), chrono_date: str = Form(...)):
        from ..utils import parse_date_input
        dt = parse_date_input(chrono_date)
        if isinstance(dt, date) and not isinstance(dt, datetime):
            dt = datetime.combine(dt, datetime.min.time())
        return cls(text=chrono_text, date=dt)

class ChronoView(ChronoCreate):
    """Схема для отображения записи в хронологии."""
    id: int
    model_config = ConfigDict(from_attributes=True)
