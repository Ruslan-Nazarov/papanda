from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, Tuple
from .. import models
from .auth import get_password_hash

class AccountService:
    """Сервис для управления учетными записями пользователей."""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def update_user(
        self, 
        current_username: str, 
        new_username: Optional[str] = None, 
        new_password: Optional[str] = None
    ) -> Tuple[Optional[models.User], Optional[str]]:
        """
        Обновляет данные пользователя.
        Возвращает (обновленный пользователь, новый токен_сабджект) или (None, None).
        """
        res = await self.db.execute(select(models.User).where(models.User.username == current_username))
        user = res.scalar_one_or_none()
        
        if not user:
            return None, None

        new_token_sub = None

        if new_username and new_username != user.username:
            # Проверка на дубликат
            existing_res = await self.db.execute(select(models.User).where(models.User.username == new_username))
            if not existing_res.scalar_one_or_none():
                user.username = new_username
                new_token_sub = new_username

        if new_password and len(new_password) >= 8:
            user.hashed_password = get_password_hash(new_password)

        await self.db.commit()
        return user, new_token_sub
