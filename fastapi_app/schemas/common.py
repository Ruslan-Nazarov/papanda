from pydantic import BaseModel, ConfigDict
from typing import Optional, Any
from fastapi import Request

class SuccessResponse(BaseModel):
    """Стандартный успешный ответ API."""
    status: str = "success"
    message: Optional[str] = None
    data: Optional[Any] = None

class GenericUpdateSchema(BaseModel):
    """Универсальная схема для inline-обновления любых записей."""
    id: int
    model_config = ConfigDict(extra='allow')

    @classmethod
    async def as_form(cls, request: Request):
        form_data = await request.form()
        return cls(**dict(form_data))

class ConflictResolutionSchema(BaseModel):
    """Схема для разрешения конфликтов синхронизации."""
    model_config = ConfigDict(extra='allow')

    @classmethod
    async def as_form(cls, request: Request):
        form_data = await request.form()
        return cls(**dict(form_data))
