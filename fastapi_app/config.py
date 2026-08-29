import secrets
import re
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

class Settings(BaseSettings):
    GROQ_API_KEY: str = ""
    SECRET_KEY: str = ""
    ENABLE_ONLY_NOTES: bool = True
    DEMO_MODE: bool = False
    DATABASE_URL: str = ""
    
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    GROQ_VISION_MODEL: str = "meta-llama/llama-4-scout-17b-16e-instruct"
    
    # Пути
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    DEMO_DIR: Path = DATA_DIR / "demo"
    DB_DIR: Path = DATA_DIR / "db"
    PROMPTS_DIR: Path = BASE_DIR / "prompts"
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

def ensure_secret_key():
    if settings.SECRET_KEY and settings.SECRET_KEY.strip():
        return
    env_path = settings.BASE_DIR / ".env"
    new_key = secrets.token_hex(32)
    settings.SECRET_KEY = new_key
    
    if env_path.exists():
        content = env_path.read_text(encoding="utf-8")
        if re.search(r'^SECRET_KEY\s*=', content, re.MULTILINE):
            content = re.sub(r'^SECRET_KEY\s*=.*$', f'SECRET_KEY={new_key}', content, flags=re.MULTILINE)
            env_path.write_text(content, encoding="utf-8")
        else:
            with open(env_path, "a", encoding="utf-8") as f:
                f.write(f"\nSECRET_KEY={new_key}\n")
    else:
        env_path.write_text(f"SECRET_KEY={new_key}\n", encoding="utf-8")

