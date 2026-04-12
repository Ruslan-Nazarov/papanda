from fastapi import Request, HTTPException, status, Depends
from fastapi.responses import RedirectResponse
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt, JWTError

from ..config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"
COOKIE_NAME = "papanda_session"

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    from datetime import timezone
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=30)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user_from_cookie(request: Request):
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        return user_id
    except JWTError:
        return None

from ..database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .. import models

async def check_auth_dependency(request: Request, db: AsyncSession = Depends(get_db)):
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
