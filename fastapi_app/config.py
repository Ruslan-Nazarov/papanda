from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
from typing import Optional, List
from fastapi.templating import Jinja2Templates

import secrets
import json
import sys

# Корень проекта (папка papanda v 0.6 experiment)
BASE_DIR: Path = Path(__file__).resolve().parent.parent

# Логика для работы в скомпилированном (.exe) виде через PyInstaller
IS_FROZEN: bool = getattr(sys, 'frozen', False)

INTERNAL_ROOT: Path
USER_DATA_ROOT: Path

if IS_FROZEN:
    # Если запущено как .exe, код и шаблоны лежат во временной папке _MEIPASS
    INTERNAL_ROOT = Path(sys._MEIPASS)
    # Данные (база, логи) лежат РЯДОМ с самим .exe файлом
    USER_DATA_ROOT = Path(sys.executable).parent
else:
    INTERNAL_ROOT = BASE_DIR
    USER_DATA_ROOT = BASE_DIR

# Шаблоны Jinja2
templates: Jinja2Templates = Jinja2Templates(directory=str(INTERNAL_ROOT / "fastapi_app" / "templates"))
templates.env.filters['from_json'] = json.loads

def ensure_secret_key() -> None:
    """
    Проверяет наличие SECRET_KEY в .env и генерирует его, если файла нет или ключ отсутствует.
    .env файл всегда ищем рядом с исполняемым файлом или в корне проекта.
    """
    env_path = USER_DATA_ROOT / ".env"
    has_key = False
    
    if env_path.exists():
        content = env_path.read_text(encoding='utf-8')
        if "SECRET_KEY=" in content:
            has_key = True
            
    if not has_key:
        new_key = secrets.token_hex(32)
        with open(env_path, "a", encoding='utf-8') as f:
            f.write(f"\nSECRET_KEY={new_key}\n")
        print("[SETUP] Автоматически сгенерирован новый SECRET_KEY и сохранен в .env")

def reset_secret_key() -> None:
    """
    Принудительно генерирует новый SECRET_KEY и перезаписывает .env файл.
    Используется для сброса безопасности сессий.
    """
    env_path = USER_DATA_ROOT / ".env"
    new_key = secrets.token_hex(32)
    
    lines: List[str] = []
    if env_path.exists():
        lines = env_path.read_text(encoding='utf-8').splitlines()
    
    new_lines: List[str] = []
    found = False
    for line in lines:
        if line.startswith("SECRET_KEY="):
            new_lines.append(f"SECRET_KEY={new_key}")
            found = True
        else:
            new_lines.append(line)
            
    if not found:
        new_lines.append(f"SECRET_KEY={new_key}")
        
    env_path.write_text("\n".join(new_lines) + "\n", encoding='utf-8')
    print("[SETUP] SECRET_KEY успешно сброшен и обновлен в .env")

# Запускаем проверку ДО загрузки настроек
ensure_secret_key()

class Settings(BaseSettings):
    """
    Класс настроек приложения, использующий Pydantic Settings.
    Автоматически загружает переменные из .env или переменных окружения.
    """
    
    # Секретный ключ (обязательный для сессий и безопасности)
    secret_key: str
    
    # Путь к папке данных (по умолчанию 'data' в корне или рядом с exe)
    data_dir: Path = USER_DATA_ROOT / "data"
    
    # URL базы данных (если не задан, формируется автоматически из db_path)
    database_url: Optional[str] = None
    
    # Уровень логирования (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    log_level: str = "INFO"
    
    model_config = SettingsConfigDict(
        env_file=str(USER_DATA_ROOT / ".env"),
        env_file_encoding='utf-8',
        extra='ignore' # Игнорировать лишние переменные в .env
    )

    @property
    def db_dir(self) -> Path:
        """Путь к директории с базами данных."""
        return self.data_dir / "db"

    @property
    def resources_dir(self) -> Path:
        """Путь к директории с ресурсами (Excel и т.д.)."""
        return self.data_dir / "resources"

    @property
    def excel_path(self) -> Path:
        """Путь к основному Excel-файлу со словами."""
        return self.resources_dir / "translate.xlsx"

    @property
    def db_path(self) -> Path:
        """Полный путь к файлу основной базы данных SQLite."""
        return self.db_dir / "papanda.db"

    @property
    def final_database_url(self) -> str:
        """
        Возвращает итоговый URL подключения к БД.
        Приоритет: 1) database_url из .env, 2) авто-сгенерированный sqlite+aiosqlite URL.
        """
        if self.database_url:
            return self.database_url
        return f"sqlite+aiosqlite:///{self.db_path}"

# Создаем глобальный объект настроек
try:
    settings = Settings()
except Exception as e:
    print(f"[CRITICAL] Ошибка конфигурации: {e}")
    # В реальном приложении здесь должен быть sys.exit(1)
    raise e

# Обеспечиваем наличие папок
for d in [settings.db_dir, settings.resources_dir]:
    d.mkdir(parents=True, exist_ok=True)
