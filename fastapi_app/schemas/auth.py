from pydantic import BaseModel, Field, model_validator
from typing import Optional
from fastapi import Form

class UserBase(BaseModel):
    """Базовая схема пользователя."""
    username: str = Field(..., min_length=3, max_length=20)

class UserCreate(UserBase):
    """Схема для создания (регистрации) пользователя."""
    password: str = Field(..., min_length=5)
    confirm_password: str

    @model_validator(mode='after')
    def check_passwords_match(self) -> 'UserCreate':
        if self.password != self.confirm_password:
            raise ValueError('Пароли не совпадают')
        return self

class UserLogin(UserBase):
    """Схема для входа пользователя."""
    password: str
    remember_me: bool = False

class AccountUpdateSchema(BaseModel):
    """Схема обновления данных аккаунта."""
    username: Optional[str] = Field(None, min_length=3, max_length=20)
    password: Optional[str] = Field(None, min_length=5)

    @classmethod
    def as_form(cls, username: Optional[str] = Form(None), password: Optional[str] = Form(None)):
        return cls(username=username, password=password)
