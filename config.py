import sys
import os
from pathlib import Path

class Config:
    # --- 1. ОПРЕДЕЛЕНИЕ ПУТЕЙ И РЕЖИМА ---
    
    if getattr(sys, 'frozen', False):
        # ЗАПУЩЕН КАК EXE
        EXTERNAL_DIR = Path(sys.executable).parent
        INTERNAL_DIR = Path(sys._MEIPASS)
        # ВАЖНО: Добавили эту переменную
        DEBUG_MODE = False 
        
    else:
        # ЗАПУЩЕН КАК СКРИПТ
        EXTERNAL_DIR = Path(__file__).resolve().parent
        INTERNAL_DIR = EXTERNAL_DIR
        # ВАЖНО: Добавили эту переменную
        DEBUG_MODE = True

    # --- 2. РЕСУРСЫ ---
    APP_DIR = INTERNAL_DIR / 'app'
    EXCEL_DIR = APP_DIR / 'excel' 
    ICON_PATH = APP_DIR / 'static' / 'logo.ico'

    # --- 3. ДАННЫЕ ---
    INSTANCE_DIR = EXTERNAL_DIR / 'instance'
    
    # Папки настроек
    JSON_DIR = EXTERNAL_DIR / 'json'

    # --- 4. НАСТРОЙКИ FLASK ---
    SECRET_KEY = 'dev-key-change-in-production'
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{INSTANCE_DIR / 'papanda.db'}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # --- 5. ПУТИ К ФАЙЛАМ ---
    SETTINGS_FILE = JSON_DIR / 'settings.json'
    WINK_FILE = JSON_DIR / 'wink_events.json'
    WORDS_FILE = JSON_DIR / 'learning_words.json'
    EXCEL_FILE = EXCEL_DIR / 'translate.xlsx'

    # --- 6. ИНИЦИАЛИЗАЦИЯ ---
    @staticmethod
    def init_app(app):
        Config.INSTANCE_DIR.mkdir(parents=True, exist_ok=True)
        Config.JSON_DIR.mkdir(parents=True, exist_ok=True)