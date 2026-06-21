from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from fastapi import Request, Form

class AppSettingBase(BaseModel):
    """Настройка приложения."""
    key: str
    value: str
    model_config = ConfigDict(from_attributes=True)

class SettingsUpdateSchema(BaseModel):
    """Схема обновления глобальных настроек."""
    max_duration: Optional[int] = Field(None, ge=1, le=1440)
    max_random_minutes: Optional[int] = Field(None, ge=0, le=1440)

    @classmethod
    def as_form(
        cls, 
        max_duration: Optional[int] = Form(None), 
        max_random_minutes: Optional[int] = Form(None)
    ):
        return cls(
            max_duration=max_duration, 
            max_random_minutes=max_random_minutes
        )

class LanguageUpdateSchema(BaseModel):
    """Схема обновления порядков языков (динамические имена обрабатываются отдельно)."""
    active_order: str = Field(..., description="Comma-separated language codes")
    
    # Мы позволяем дополнительные поля для динамических имен языков (name_en, name_ru и т.д.)
    model_config = ConfigDict(extra='allow')

    @classmethod
    async def as_form(cls, request: Request):
        form_data = await request.form()
        return cls(**dict(form_data))
