import secrets
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

class Settings(BaseSettings):
    GROQ_API_KEY: str = ""
    SECRET_KEY: str = ""
    ENABLE_ONLY_NOTES: bool = True
    DEMO_MODE: bool = True
    DATABASE_URL: str = ""
    
    # Пути
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    DEMO_DIR: Path = DATA_DIR / "demo"
    DB_DIR: Path = DATA_DIR / "db"
    PROMPTS_DIR: Path = BASE_DIR / "prompts"
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

def ensure_secret_key():
    if not settings.SECRET_KEY:
        env_path = settings.BASE_DIR / ".env"
        new_key = secrets.token_hex(32)
        settings.SECRET_KEY = new_key
        
        # Записываем или добавляем в .env
        if env_path.exists():
            content = env_path.read_text(encoding="utf-8")
            if "SECRET_KEY=" in content:
                # Если пустой, не будем делать сложную замену, просто добавим в конец, 
                # но лучше просто добавить если вообще нет
                pass
            else:
                with open(env_path, "a", encoding="utf-8") as f:
                    f.write(f"\nSECRET_KEY={new_key}\n")
        else:
            with open(env_path, "w", encoding="utf-8") as f:
                f.write(f"SECRET_KEY={new_key}\n")

ensure_secret_key()
