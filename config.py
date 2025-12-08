import sys
from pathlib import Path

class Config:
    # 1. ОПРЕДЕЛЕНИЕ КОРНЯ ПРОЕКТА
    if getattr(sys, 'frozen', False):
        BASE_DIR = Path(sys.executable).parent
    else:
        BASE_DIR = Path(__file__).resolve().parent

    # 2. ПУТИ К ДИРЕКТОРИЯМ
    APP_DIR = BASE_DIR / 'app'
    JSON_DIR = APP_DIR / 'json'
    EXCEL_DIR = APP_DIR / 'excel'
    INSTANCE_DIR = BASE_DIR / 'instance'

    # 3. НАСТРОЙКИ FLASK И SQLALCHEMY
    SECRET_KEY = 'dev-key-change-in-production' # Для безопасности сессий
    # SQLite требует абсолютный путь (используем 3 слэша для относительного пути в Unix/Win)
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{INSTANCE_DIR / 'papanda.db'}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # 4. ПУТИ К ФАЙЛАМ ДАННЫХ
    SETTINGS_FILE = JSON_DIR / 'settings.json'
    WINK_FILE = JSON_DIR / 'wink_events.json'
    WORDS_FILE = JSON_DIR / 'learning_words.json'
    CHRONO_DB_PATH = INSTANCE_DIR / 'chronology.db'
    WINK_DB_PATH = INSTANCE_DIR / 'wink.db'
    EXCEL_FILE = EXCEL_DIR / 'translate.xlsx'

    # 5. ИНИЦИАЛИЗАЦИЯ
    @staticmethod
    def init_app(app):
        Config.JSON_DIR.mkdir(parents=True, exist_ok=True)
        Config.INSTANCE_DIR.mkdir(parents=True, exist_ok=True)