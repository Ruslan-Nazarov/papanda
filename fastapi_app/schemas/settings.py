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
    theme_reading: Optional[str] = Field(None)
    theme_editor: Optional[str] = Field(None)

    @classmethod
    def as_form(
        cls, 
        max_duration: Optional[int] = Form(None), 
        max_random_minutes: Optional[int] = Form(None),
        theme_reading: Optional[str] = Form(None),
        theme_editor: Optional[str] = Form(None)
    ):
        return cls(
            max_duration=max_duration, 
            max_random_minutes=max_random_minutes,
            theme_reading=theme_reading,
            theme_editor=theme_editor
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
