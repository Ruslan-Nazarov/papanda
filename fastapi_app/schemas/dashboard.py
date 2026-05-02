from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional
from fastapi import Request

class UniversalFormSchema(BaseModel):
    """Схема для универсальной формы добавления (submit_form)."""
    common_text: str = Field(..., min_length=1)
    common_date: str
    common_category: str
    common_color: Optional[str] = "#ffffff"
    repeat: str = "none"
    repeat_end: Optional[str] = ""
    
    # Sticker data (nested)
    sticker_text: Optional[str] = ""
    sticker_title: Optional[str] = ""
    sticker_color: Optional[str] = "#fff9c4"
    sticker_type: Optional[str] = "text"
    sticker_apply_series: bool = False

    @classmethod
    async def as_form(cls, request: Request):
        form_data = await request.form()
        data = dict(form_data)
        if "sticker_apply_series" in data:
            data["sticker_apply_series"] = str(data["sticker_apply_series"]).lower() in ["true", "on", "1"]
        return cls(**data)

class ToggleDoneResponse(BaseModel):
    """Ответ для переключения статуса выполнения."""
    done: bool
    message: Optional[str] = None

class DashboardItem(BaseModel):
    """Элемент дашборда."""
    key: str
    title: str
    date: datetime
    model_config = ConfigDict(from_attributes=True)
