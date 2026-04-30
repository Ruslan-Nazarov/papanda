import os
import shutil
import sqlite3
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional

from sqlalchemy import text, delete
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings, BASE_DIR, reset_secret_key
from .. import models
from ..logger import logger

class MaintenanceService:
    """
    Сервис для обслуживания базы данных, управления бэкапами и очистки системы.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_backups(self) -> List[Dict[str, Any]]:
        """
        Возвращает список доступных файлов баз данных в директории DB.
        """
        db_files = []
        db_dir = settings.db_dir
        if db_dir.exists():
            for f in os.listdir(db_dir):
                if f.endswith('.db'):
                    path = db_dir / f
                    db_files.append({
                        'name': f,
                        'size': f"{os.path.getsize(path) // 1024} KB",
                        'is_active': f == settings.db_path.name,
                        'modified': datetime.fromtimestamp(os.path.getmtime(path)).strftime('%Y-%m-%d %H:%M:%S')
                    })
        return sorted(db_files, key=lambda x: x['name'], reverse=True)

    async def create_backup(self, prefix: str = "manual_backup") -> str:
        """
        Создает физическую копию текущей базы данных.
        """
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"{prefix}_{ts}.db"
        backup_path = settings.db_dir / backup_name
        
        # Гарантируем, что директория существует
        settings.db_dir.mkdir(parents=True, exist_ok=True)
        
        if settings.db_path.exists():
            shutil.copy2(settings.db_path, backup_path)
            logger.info(f"Backup created: {backup_name}")
            return backup_name
        else:
            raise FileNotFoundError("Current database file not found")

    async def run_vacuum(self) -> bool:
        """
        Выполняет команду VACUUM для оптимизации и сжатия файла БД.
        """
        try:
            await self.db.execute(text("VACUUM"))
            logger.info("Database VACUUM completed successfully.")
            return True
        except Exception as e:
            logger.error(f"VACUUM failed: {e}")
            return False

    async def deep_clean(self) -> None:
        """
        Полная очистка системы (Sharing Preparation).
        Удаляет все пользовательские данные, бэкапы, логи и сбрасывает настройки.
        """
        # 1. Список моделей для очистки
        models_to_clear = [
            models.Event, models.Habit, models.Task, models.Chronology,
            models.Notes, models.HabitsDone, models.Dashboard, models.WordStats,
            models.WordStatsSnapshot, models.LanguageRule, models.NoteCategory,
            models.Wink, models.AppSettings, models.WordShowsDaily,
            models.StickyNote, models.User, models.Observation, models.ObservationLog
        ]
        
        for Model in models_to_clear:
            await self.db.execute(delete(Model))
        
        # 2. Factory Defaults
        from .settings_service import set_settings_batch
        await set_settings_batch(self.db, {
            'max_duration': '360',
            'max_random_minutes': '60'
        })
        
        await self.db.commit()

        # 3. Удаление дополнительных .db файлов
        db_dir = settings.db_dir
        if db_dir.exists():
            for f in os.listdir(db_dir):
                if f.endswith(".db") and f != settings.db_path.name:
                    try:
                        os.remove(db_dir / f)
                    except Exception as e:
                        logger.error(f"[DEEP CLEAN] Failed to delete {f}: {e}")

        # 4. Удаление translate.xlsx
        if settings.excel_path.exists():
            try:
                os.remove(settings.excel_path)
            except Exception as e:
                logger.error(f"[DEEP CLEAN] Failed to delete translate.xlsx: {e}")

        # 5. Удаление логов
        log_dir = BASE_DIR / "logs"
        if log_dir.exists():
            for f in os.listdir(log_dir):
                if f.endswith(".log"):
                    try:
                        os.remove(log_dir / f)
                    except Exception as e:
                        logger.error(f"[DEEP CLEAN] Failed to delete log {f}: {e}")

        # 6. VACUUM
        await self.run_vacuum()

        # 7. Сброс SECRET_KEY
        try:
            reset_secret_key()
        except Exception as e:
            logger.error(f"[DEEP CLEAN] Failed to reset SECRET_KEY: {e}")

        logger.warning("System reset to factory state via Deep Clean.")

    async def sync_data_from_file(self, filename: str) -> None:
        """
        Переносит данные из другого .db файла в текущую базу, сохраняя таблицу пользователей.
        """
        from ..database import get_engine
        await get_engine("default").dispose() # Закрываем соединения
        
        current_db = settings.db_path
        target_db = settings.db_dir / filename
        
        if not target_db.exists():
            raise FileNotFoundError(f"Target database {filename} not found")
            
        # Авто-бэкап перед миграцией
        await self.create_backup(prefix="auto_backup_before_sync")
        
        tables_to_sync = [
            'event', 'habits', 'habits_done', 'task', 'chronology', 
            'notes', 'wink', 'word_stats', 'dashboard', 'app_settings', 
            'language_rule', 'note_category', 'word_stats_snapshot', 
            'word_shows_daily', 'sticky_notes'
        ]
        
        conn = sqlite3.connect(str(current_db))
        cursor = conn.cursor()
        
        try:
            cursor.execute(f"ATTACH DATABASE '{str(target_db)}' AS backup_db")
            for table in tables_to_sync:
                # Проверяем наличие таблицы в обеих базах
                cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
                if not cursor.fetchone(): continue
                cursor.execute(f"SELECT name FROM backup_db.sqlite_master WHERE type='table' AND name='{table}'")
                if not cursor.fetchone(): continue
                
                cursor.execute(f"DELETE FROM main.{table}")
                cursor.execute(f"INSERT INTO main.{table} SELECT * FROM backup_db.{table}")
            
            conn.commit()
            logger.info(f"Data sync from {filename} successful.")
        finally:
            try:
                cursor.execute("DETACH DATABASE backup_db")
            except:
                pass
            conn.close()

    async def delete_backup(self, filename: str) -> None:
        """
        Удаляет файл бэкапа из директории БД.
        """
        if filename == settings.db_path.name:
            raise ValueError("Cannot delete active database")
        
        file_path = settings.db_dir / filename
        if file_path.exists():
            os.remove(file_path)
            logger.info(f"Backup deleted: {filename}")
        else:
            raise FileNotFoundError(f"Backup {filename} not found")
