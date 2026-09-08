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
    # SambaNova / HuggingFace выпилены из кольца (402 / мёртвый эндпоинт),
    # строки оставлены на случай возврата.
    SAMBANOVA_MODEL: str = "Meta-Llama-3.3-70B-Instruct"
    CEREBRAS_MODEL: str = "gpt-oss-120b"          # тот же gpt-oss, что у Groq; $5 кредит
    HUGGINGFACE_MODEL: str = "mistralai/Mistral-7B-Instruct-v0.2"
    # Google AI Studio (OpenAI-совместимый эндпоинт).
    # ВНИМАНИЕ (проверено 2026-09-07): на этом ключе обычный gemini-3.5-flash
    # мгновенно отдаёт 429 "exceeded your current quota" — рабочий только
    # flash-LITE (быстрый, ~0.6с, чистый JSON). Поэтому обе строки = flash-lite.
    # alias-модели (*-latest, *-preview) на compat-эндпоинте зависают.
    GOOGLE_MODEL: str = "gemini-3.5-flash-lite"
    GOOGLE_FAST_MODEL: str = "gemini-3.5-flash-lite"

    # Быстрые (маленькие) модели для лёгких задач: скелет плана, исторические справки.
    GROQ_FAST_MODEL: str = "openai/gpt-oss-20b"
    CEREBRAS_FAST_MODEL: str = "qwen-3.8-27b"   # на аккаунте нет llama; qwen отдаёт чистый JSON

    # --- Защита от злоупотребления генерацией (services/abuse_guard.py) ---
    # Сколько генераций конспекта в сутки с одной сессии (cookie). 0 = без лимита.
    SESSION_DAILY_GENERATION_CAP: int = 40
    # Жёсткий суточный потолок генераций на весь сервис — предохранитель бюджета
    # провайдеров. При достижении — "приходите завтра". 0 = без лимита.
    GLOBAL_DAILY_GENERATION_CAP: int = 3000
    # Сколько доверенных прокси перед приложением (nginx=1). Из X-Forwarded-For
    # берём запись N-ю справа как реальный IP клиента для rate-limit.
    TRUSTED_PROXY_COUNT: int = 1

    # Таймаут одного запроса к провайдеру, сек (по истечении — переход к следующему).
    # Держим коротким: вспомогательные вызовы (скелет, судья, справки) должны
    # быстро уходить на фолбэк, если провайдер завис.
    LLM_TIMEOUT: float = 15.0
    # Отдельный таймаут для основной генерации конспекта: reasoning=medium +
    # длинный вывод — первому чанку нужно больше времени, чем вспом. вызовам.
    LLM_TIMEOUT_GEN: float = 45.0
    # Усилие reasoning для gpt-oss / gemini моделей: low | medium | high (пусто —
    # не передавать). LLM_REASONING_EFFORT — дефолт для всех вызовов (скелет,
    # судья, справки — там важны скорость и чистый JSON).
    LLM_REASONING_EFFORT: str = "low"
    # Отдельное усилие для основной генерации конспекта (стрим шагов) — не-JSON,
    # творческая задача «показать становление»: на low выходит плоско и обрублено.
    # medium — оптимум: high на gpt-oss-120b даёт больше воды и галлюцинаций
    # (выдуманные имена/числа), плюс тяжелее для лимитов Cerebras (проверено
    # 2026-09-07 — high явно хуже).
    LLM_REASONING_EFFORT_GEN: str = "medium"
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

