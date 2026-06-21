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


def _validate_db_filename(filename: str) -> Path:
    """
    Проверяет, что filename является безопасным именем .db-файла
    внутри db_dir (защита от path traversal).
    """
    safe_name = os.path.basename(filename)
    if not safe_name.endswith(".db"):
        raise ValueError("Only .db files are allowed")
    resolved = (settings.db_dir / safe_name).resolve()
    if not str(resolved).startswith(str(settings.db_dir.resolve())):
        raise ValueError(f"Invalid filename: {filename}")
    return resolved

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



    async def sync_data_from_file(self, filename: str) -> None:
        """
        Переносит данные из другого .db файла в текущую базу, сохраняя таблицу пользователей.
        """
        from ..database import get_engine
        await get_engine("default").dispose() # Закрываем соединения
        
        # Защита от path traversal
        target_db = _validate_db_filename(filename)
        current_db = settings.db_path
        
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
        
        # Экранируем одиночные кавычки в пути для ATTACH (target_db уже провалидирован)
        safe_path_str = str(target_db).replace("'", "''")
        
        try:
            cursor.execute(f"ATTACH DATABASE '{safe_path_str}' AS backup_db")
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
        # Защита от path traversal
        file_path = _validate_db_filename(filename)
        
        if str(file_path) == str(settings.db_path.resolve()):
            raise ValueError("Cannot delete active database")
        
        if file_path.exists():
            os.remove(file_path)
            logger.info(f"Backup deleted: {filename}")
        else:
            raise FileNotFoundError(f"Backup {filename} not found")
