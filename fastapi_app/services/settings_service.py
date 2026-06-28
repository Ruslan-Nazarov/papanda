from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import Request
import json
from datetime import datetime
from .. import models
from typing import Optional, Dict, Any

from ..logger import logger
from ..services.auth import get_current_user_from_cookie

async def get_setting(db: AsyncSession, key: str, default: Optional[str] = None) -> Optional[str]:
    """
    Получает значение настройки из таблицы app_settings.
    
    Args:
        db: Асинхронная сессия SQLAlchemy.
        key: Ключ настройки.
        default: Значение по умолчанию, если настройка не найдена.
        
    Returns:
        Optional[str]: Значение настройки или дефолт.
    """
    try:
        result = await db.execute(select(models.AppSettings).where(models.AppSettings.key == key))
        s = result.scalar_one_or_none()
        return s.value if s else default
    except Exception as e:
        logger.error(f"Error fetching setting {key}: {e}")
        return default

async def set_setting(db: AsyncSession, key: str, value: Any) -> None:
    """
    Обновляет или создает настройку в таблице app_settings.
    
    Args:
        db: Асинхронная сессия SQLAlchemy.
        key: Ключ настройки.
        value: Значение для сохранения (будет приведено к строке).
    """
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

async def set_settings_batch(db: AsyncSession, settings_dict: Dict[str, Any]) -> None:
    """
    Обновляет несколько настроек за одну транзакцию.
    
    Args:
        db: Асинхронная сессия SQLAlchemy.
        settings_dict: Словарь {ключ: значение}.
    """
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

async def initialize_language_settings(db: AsyncSession) -> None:
    """
    Инициализирует настройки языков по умолчанию, если они отсутствуют в системе.
    
    Args:
        db: Асинхронная сессия SQLAlchemy.
    """
    defaults = {
        'active_languages': 'en,it,de',
        'language_names': '{"en": "English", "it": "Italian", "de": "German", "ru": "Russian", "fr": "French", "es": "Spanish", "la": "Latin"}'
    }
    for key, val in defaults.items():
        existing = await get_setting(db, key)
        if existing is None:
            await set_setting(db, key, val)

async def initialize_plugin_settings(db: AsyncSession) -> None:
    """
    Инициализирует настройки плагинов по умолчанию (включены).
    """
    plugins = [
        'plugin_dashboard',
        'plugin_languages',
        'plugin_tasks',
        'plugin_habits',
        'plugin_events',
        'show_widget_tips',
        'show_lang_tips',
        'show_dedications'
    ]
    for p in plugins:
        existing = await get_setting(db, p)
        if existing is None:
            await set_setting(db, p, 'True')

async def get_settings_context(db: AsyncSession, request: Request, import_result: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Собирает контекст для шаблона settings.html.
    Инкапсулирует логику получения логов, статистики и настроек языков.
    """
    from ..dependencies import get_maintenance_service
    ms = await get_maintenance_service(db)
    db_files = await ms.list_backups()

    try:
        max_dur = int(await get_setting(db, 'max_duration', '360'))
    except (ValueError, TypeError):
        max_dur = 360

    try:
        max_rand = int(await get_setting(db, 'max_random_minutes', '60'))
    except (ValueError, TypeError):
        max_rand = 60

    today = datetime.now().date()
    
    chrono_res = await db.execute(select(models.Chronology).order_by(models.Chronology.id.desc()).limit(1))
    last_chrono = chrono_res.scalar_one_or_none()
    
    winks_res = await db.execute(select(models.Wink).order_by(models.Wink.id.desc()).limit(5))
    wink_last = list(winks_res.scalars().all())
    
    notes_last = None
    max_id_res = await db.execute(select(func.max(models.Notes.id)))
    max_id = max_id_res.scalar()
    if max_id:
        note_res = await db.execute(select(models.Notes).where(models.Notes.id == max_id))
        notes_last = note_res.scalar_one_or_none()
    
    await initialize_language_settings(db)
    await initialize_plugin_settings(db)
    
    plugin_dashboard = str(await get_setting(db, 'plugin_dashboard', 'True')).lower() in ('true', '1')
    plugin_languages = str(await get_setting(db, 'plugin_languages', 'True')).lower() in ('true', '1')
    plugin_tasks = str(await get_setting(db, 'plugin_tasks', 'True')).lower() in ('true', '1')
    plugin_habits = str(await get_setting(db, 'plugin_habits', 'True')).lower() in ('true', '1')
    plugin_events = str(await get_setting(db, 'plugin_events', 'True')).lower() in ('true', '1')
    
    show_widget_tips = str(await get_setting(db, 'show_widget_tips', 'True')).lower() in ('true', '1')
    show_lang_tips = str(await get_setting(db, 'show_lang_tips', 'True')).lower() in ('true', '1')
    show_dedications = str(await get_setting(db, 'show_dedications', 'True')).lower() in ('true', '1')
    
    active_langs_raw = await get_setting(db, 'active_languages', 'en,it,de')
    active_languages = [l.strip() for l in (active_langs_raw or 'en,it,de').split(',') if l.strip()]
    
    lang_names_raw = await get_setting(db, 'language_names', '{"en": "English", "it": "Italian", "de": "German", "ru": "Russian"}')
    lang_names = json.loads(lang_names_raw or '{}')
    
    # Плиточный интерфейс для настроек
    settings_layout = await get_setting(db, "settings_layout", "{}")
    
    from ..services.word_service import WordService
    word_service = WordService(db)
    discovered_codes = await word_service.get_all_available_language_codes()
    
    for code in discovered_codes:
        if code not in lang_names:
            lang_names[code] = code.upper()

    ctx = {
        "request": request,
        "max_duration": max_dur,
        "max_random_minutes": max_rand,
        "wink_last": wink_last,
        "notes_last": notes_last,
        "last_chrono": last_chrono,
        "db_files": db_files,
        "current_user_name": get_current_user_from_cookie(request),
        "today_for_calendar": today,
        "active_languages": active_languages,
        "all_languages": lang_names,
        "settings_layout": settings_layout,
        "plugin_dashboard": plugin_dashboard,
        "plugin_languages": plugin_languages,
        "plugin_tasks": plugin_tasks,
        "plugin_habits": plugin_habits,
        "plugin_events": plugin_events,
        "show_widget_tips": show_widget_tips,
        "show_lang_tips": show_lang_tips,
        "show_dedications": show_dedications,
    }
    if import_result is not None:
        ctx["import_result"] = import_result
    return ctx
