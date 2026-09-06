import secrets
import re
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

class Settings(BaseSettings):
    GROQ_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    SAMBANOVA_API_KEY: str = ""
    CEREBRAS_API_KEY: str = ""
    HUGGINGFACE_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""

    SECRET_KEY: str = ""
    ENABLE_ONLY_NOTES: bool = True
    DEMO_MODE: bool = False
    DATABASE_URL: str = ""
    
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    # Резервная модель на том же Groq-ключе, но с ОТДЕЛЬНЫМ лимитом частоты —
    # даёт дополнительный запас бесплатных запросов при rate-limit основной модели.
    GROQ_ALT_MODEL: str = "qwen/qwen3.8-27b"
    # Бесплатный каталог OpenRouter быстро меняется: модели уходят из :free в
    # платные (тогда 404 "unavailable for free"). Если провайдер начал падать —
    # проверить https://openrouter.ai/models?fmt=table&input_modalities=text&max_price=0
    # и обновить строку. Проверено рабочим 2026-09-06.
    OPENROUTER_MODEL: str = "minimax/minimax-m3:free"
    SAMBANOVA_MODEL: str = "Meta-Llama-3.3-70B-Instruct"
    CEREBRAS_MODEL: str = "gpt-oss-120b"
    HUGGINGFACE_MODEL: str = "mistralai/Mistral-7B-Instruct-v0.2"
    # Google AI Studio (OpenAI-совместимый эндпоинт). Щедрый бесплатный лимит.
    # ВНИМАНИЕ: alias-модели (*-latest, *-preview) на compat-эндпоинте зависают —
    # используем закреплённые версии. При устаревании вернётся чистый 404 (провайдер
    # пропускается), тогда обновить строку на актуальный gemini-*-flash.
    GOOGLE_MODEL: str = "gemini-3.5-flash"
    GOOGLE_FAST_MODEL: str = "gemini-3.5-flash-lite"

    # Быстрые (маленькие) модели для лёгких задач: подсказки, «что это?», скелет плана.
    GROQ_FAST_MODEL: str = "openai/gpt-oss-20b"
    CEREBRAS_FAST_MODEL: str = "llama3.1-8b"

    # Таймаут одного запроса к провайдеру, сек (по истечении — переход к следующему).
    LLM_TIMEOUT: float = 15.0
    # Усилие reasoning для gpt-oss моделей: low | medium | high (пусто — не передавать).
    LLM_REASONING_EFFORT: str = "low"
    # ВНИМАНИЕ: на текущем Groq-ключе vision-моделей нет — OCR формул недоступен.
    GROQ_VISION_MODEL: str = "meta-llama/llama-4-scout-17b-16e-instruct"
    GROQ_VISION_FALLBACK_MODEL: str = "meta-llama/llama-4-maverick-17b-128e-instruct"
    GROQ_WHISPER_MODEL: str = "whisper-large-v3-turbo"
    
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

