from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from fastapi import Request

class WordBase(BaseModel):
    """Базовая схема слова."""
    eng: str
    ru: str
    it: Optional[str] = None
    de: Optional[str] = None
    meaning: Optional[str] = None

class WordView(WordBase):
    """Схема для отображения слова."""
    count: int
    is_known_en: bool
    is_known_it: bool
    is_known_de: bool
    last_shown: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class WordUpdateSchema(BaseModel):
    """Схема для обновления слова."""
    word_eng: str
    new_ru: str
    new_meaning: str = ""
    model_config = ConfigDict(extra='allow')

    @classmethod
    async def as_form(cls, request: Request):
        form_data = await request.form()
        return cls(**dict(form_data))

class MarkKnownRequest(BaseModel):
    """Запрос на пометку слова как известного."""
    eng: str
    lang: str
    is_known: bool = True

class TestResultRequest(BaseModel):
    """Запрос на запись результата теста."""
    eng: str
    is_correct: bool
    lang: str

class TripletLearnedRequest(BaseModel):
    """Запрос на пометку тройки языков как изученной."""
    eng: str
    is_learned: bool = True
