from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
from typing import Optional
from fastapi.templating import Jinja2Templates

import secrets
import json

import sys

# Корень проекта (папка papanda v 0.5 experiment)
BASE_DIR = Path(__file__).resolve().parent.parent

# Логика для работы в скомпилированном (.exe) виде через PyInstaller
IS_FROZEN = getattr(sys, 'frozen', False)

if IS_FROZEN:
    # Если запущено как .exe, код и шаблоны лежат во временной папке _MEIPASS
    INTERNAL_ROOT = Path(sys._MEIPASS)
    # Данные (база, логи) лежат РЯДОМ с самим .exe файлом
    USER_DATA_ROOT = Path(sys.executable).parent
else:
    INTERNAL_ROOT = BASE_DIR
    USER_DATA_ROOT = BASE_DIR

# Шаблоны Jinja2
templates = Jinja2Templates(directory=str(INTERNAL_ROOT / "fastapi_app" / "templates"))

def from_json_safe(value):
    """Безопасно преобразует строку JSON в объект."""
    if isinstance(value, str):
        try:
            return json.loads(value)
        except:
            return value
    return value

templates.env.filters['from_json'] = from_json_safe

def ensure_secret_key():
    """Проверяет наличие SECRET_KEY в .env и генерирует его, если файла нет или ключ отсутствует."""
    # .env файл всегда ищем рядом с исполняемым файлом/в корне проекта
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

def reset_secret_key():
    """Принудительно генерирует новый SECRET_KEY и перезаписывает .env файл."""
    env_path = USER_DATA_ROOT / ".env"
    new_key = secrets.token_hex(32)
    
    lines = []
    if env_path.exists():
        lines = env_path.read_text(encoding='utf-8').splitlines()
    
    new_lines = []
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
    Класс настроек приложения. 
    Автоматически загружает переменные из .env или переменных окружения.
    """
    # Секретный ключ (обязательный)
    secret_key: str
    
    # Пути (можно переопределить через .env)
    data_dir: Path = USER_DATA_ROOT / "data"
    database_url: Optional[str] = None
    
    # Настройки логирования
    log_level: str = "INFO"
    
    # Настройки для загрузки из .env
    model_config = SettingsConfigDict(
        env_file=str(USER_DATA_ROOT / ".env"),
        env_file_encoding='utf-8',
        extra='ignore' # Игнорировать лишние переменные в .env
    )

    @property
    def db_dir(self) -> Path:
        return self.data_dir / "db"

    @property
    def resources_dir(self) -> Path:
        return self.data_dir / "resources"

    @property
    def excel_path(self) -> Path:
        return self.resources_dir / "translate.xlsx"



    @property
    def db_path(self) -> Path:
        return self.db_dir / "papanda.db"



    @property
    def final_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return f"sqlite+aiosqlite:///{self.db_path}"

# Создаем глобальный объект настроек
try:
    settings = Settings()
    # Обеспечиваем наличие папок данных
    settings.db_dir.mkdir(parents=True, exist_ok=True)
    settings.resources_dir.mkdir(parents=True, exist_ok=True)
except Exception as e:
    print(f"[CRITICAL] Ошибка конфигурации или создания папок: {e}")
    # Не бросаем ошибку здесь, чтобы logger мог инициализироваться и записать её
    settings = None

# Запускаем проверку секретного ключа (теперь безопасно)
if settings:
    ensure_secret_key()
