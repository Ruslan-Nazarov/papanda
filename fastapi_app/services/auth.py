from fastapi import Request, HTTPException, status, Depends
from fastapi.responses import RedirectResponse
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..config import settings
from ..database import get_main_db
from .. import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM: str = "HS256"
COOKIE_NAME: str = "papanda_session"

def get_password_hash(password: str) -> str:
    """
    Хеширует пароль с использованием bcrypt.
    
    Args:
        password: Открытый пароль.
        
    Returns:
        str: Хешированный пароль.
    """
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Проверяет соответствие открытого пароля хешу.
    
    Args:
        plain_password: Открытый пароль.
        hashed_password: Хеш из базы данных.
        
    Returns:
        bool: True, если пароли совпадают.
    """
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Создает JWT токен для аутентификации.
    
    Args:
        data: Данные для включения в токен (payload).
        expires_delta: Время жизни токена. По умолчанию 30 дней.
        
    Returns:
        str: Закодированный JWT токен.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=30)
    to_encode.update({"exp": expire})
    encoded_jwt: str = jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user_from_cookie(request: Request) -> Optional[str]:
    """
    Извлекает имя пользователя (sub) из JWT токена в куках.
    
    Args:
        request: Объект запроса.
        
    Returns:
        Optional[str]: Username пользователя или None, если токен невалиден.
    """
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        return user_id
    except JWTError:
        return None

async def check_auth_dependency(request: Request, db: AsyncSession = Depends(get_main_db)) -> models.User:
    """
    Зависимость (Dependency) для проверки авторизации пользователя.
    Если пользователь не авторизован, перенаправляет на страницу /login.
    
    Args:
        request: Объект запроса.
        db: Сессия основной базы данных.
        
    Returns:
        models.User: Объект пользователя из БД.
        
    Raises:
        HTTPException: Редирект на /login, если авторизация не пройдена.
    """
    user_id = get_current_user_from_cookie(request)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_302_FOUND,
            headers={"Location": "/login"},
        )
    
    # Дополнительная проверка: существует ли пользователь в БД?
    result = await db.execute(select(models.User).where(models.User.username == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_302_FOUND,
            headers={"Location": "/login"},
        )
        
    return user
