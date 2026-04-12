from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .. import models

from ..logger import logger

async def get_setting(db: AsyncSession, key: str, default: str = None) -> str:
    """Получает значение настройки из таблицы app_settings."""
    try:
        result = await db.execute(select(models.AppSettings).where(models.AppSettings.key == key))
        s = result.scalar_one_or_none()
        return s.value if s else default
    except Exception as e:
        logger.error(f"Error fetching setting {key}: {e}")
        return default

async def set_setting(db: AsyncSession, key: str, value: str):
    """Обновляет или создает настройку в таблице app_settings."""
    try:
        result = await db.execute(select(models.AppSettings).where(models.AppSettings.key == key))
        s = result.scalar_one_or_none()
        if s:
            s.value = str(value)
        else:
            db.add(models.AppSettings(key=key, value=str(value)))
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to set setting {key}: {e}")
        raise e

async def set_settings_batch(db: AsyncSession, settings_dict: dict):
    """Обновляет несколько настроек за одну транзакцию."""
    try:
        for key, value in settings_dict.items():
            result = await db.execute(select(models.AppSettings).where(models.AppSettings.key == key))
            s = result.scalar_one_or_none()
            if s:
                s.value = str(value)
            else:
                db.add(models.AppSettings(key=key, value=str(value)))
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to save settings batch: {e}")
        raise e
