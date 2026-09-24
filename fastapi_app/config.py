import secrets
import re
import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from pathlib import Path

class Settings(BaseSettings):
    GROQ_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    CEREBRAS_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""

    SECRET_KEY: str = ""
    DEMO_MODE: bool = False
    DATABASE_URL: str = ""
    GENERATION_TIMEOUT: float = Field(default=300, gt=0, le=1800)
    GENERATION_MAX_CALLS: int = Field(default=60, ge=1, le=200)
    GENERATION_MAX_TOKENS: int = Field(default=1500000, ge=1)
    GENERATION_CONCURRENCY: int = Field(default=2, ge=1, le=16)
    
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    # Резервная модель на том же Groq-ключе, но с ОТДЕЛЬНЫМ лимитом частоты —
    # даёт дополнительный запас бесплатных запросов при rate-limit основной модели.
    GROQ_ALT_MODEL: str = "qwen/qwen3.8-27b"
    # Бесплатный каталог OpenRouter быстро меняется: модели уходят из :free в
    # платные (тогда 404 "unavailable for free"). Если провайдер начал падать —
    # проверить https://openrouter.ai/models?fmt=table&input_modalities=text&max_price=0
    # и обновить строку. minimax-m3:free ушла в платную 2026-09-14 (404) —
    # заменена на nemotron (проверено рабочим 2026-09-14). Компромисс: это
    # reasoning-модель и тратит часть ответа на раздумья даже над коротким
    # запросом — приемлемо, т.к. это последний провайдер в кольце фолбэков.
    OPENROUTER_MODEL: str = "nvidia/nemotron-3-super-120b-a12b:free"
    CEREBRAS_MODEL: str = "gpt-oss-120b"          # тот же gpt-oss, что у Groq; $5 кредит
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

    # --- Сбер GigaChat (services/llm_provider.py::GigaChatProvider) ---
    # Авторизация: НЕ статичный ключ, а OAuth2 — «Authorization Key» из
    # личного кабинета developers.sber.ru меняется на access_token (живёт ~30 мин).
    # Пусто = провайдер выключен (как и у остальных резервных).
    GIGACHAT_AUTH_KEY: str = ""
    # Scope: GIGACHAT_API_PERS (физлицо), _B2B или _CORP (юрлицо).
    GIGACHAT_SCOPE: str = "GIGACHAT_API_PERS"
    # Проверено 2026-09-09: на аккаунте живы GigaChat-2 / -2-Pro / -2-Max
    # (новое поколение). Free-пул (разовый промо): Lite ~250M ток., Pro 40M,
    # Max 25M, Ultra 50M. OAuth-токен живёт 30 мин. JSON приходит в ```-заборе —
    # Sanitizer.extract_json это снимает.
    GIGACHAT_MODEL: str = "GigaChat-2-Pro"     # GigaChat-2 | -2-Pro | -2-Max
    GIGACHAT_FAST_MODEL: str = "GigaChat-2"
    # Сертификат эндпоинта подписан НУЦ Минцифры — его нет в системном хранилище.
    # Проверка обязательна. При необходимости добавить доверенный CA через
    # GIGACHAT_CA_BUNDLE, сохраняя проверку имени хоста.
    GIGACHAT_VERIFY_SSL: bool = True
    GIGACHAT_CA_BUNDLE: str = ""

    # --- Защита от злоупотребления генерацией (services/abuse_guard.py) ---
    # Сколько генераций конспекта в сутки с одной сессии (cookie). 0 = без лимита.
    SESSION_DAILY_GENERATION_CAP: int = 40
    # Жёсткий суточный потолок генераций на весь сервис — предохранитель бюджета
    # провайдеров. При достижении — "приходите завтра". 0 = без лимита.
    GLOBAL_DAILY_GENERATION_CAP: int = 3000
    # Сколько доверенных прокси перед приложением (nginx=1). Из X-Forwarded-For
    # берём запись N-ю справа как реальный IP клиента для rate-limit.
    TRUSTED_PROXY_COUNT: int = Field(default=0, ge=0, le=8)
    TRUSTED_PROXY_IPS: str = ""  # comma-separated exact IPs/CIDRs, never '*'
    IP_DAILY_GENERATION_CAP: int = Field(default=80, ge=0)
    DEMO_SESSION_TTL_SECONDS: int = Field(default=7 * 24 * 3600, ge=60)
    DEMO_MAX_SESSIONS: int = Field(default=1000, ge=1)
    MAX_CACHED_ENGINES: int = Field(default=32, ge=1, le=1024)
    DEMO_MAX_DB_BYTES: int = Field(default=32 * 1024 * 1024, ge=65536)
    MAX_REQUEST_BYTES: int = Field(default=12 * 1024 * 1024, ge=1024)
    MAX_UPLOAD_BYTES: int = Field(default=8 * 1024 * 1024, ge=1024)
    MAX_URL_BYTES: int = Field(default=2 * 1024 * 1024, ge=1024)
    PDF_MAX_PAGES: int = Field(default=50, ge=1)
    PDF_TIMEOUT_SECONDS: float = Field(default=15.0, gt=0)
    PDF_MEMORY_BYTES: int = Field(default=512 * 1024 * 1024, ge=64 * 1024 * 1024)



    # Таймаут одного запроса к провайдеру, сек (по истечении — переход к следующему).
    # Держим коротким: вспомогательные вызовы (скелет, судья, справки) должны
    # быстро уходить на фолбэк, если провайдер завис. 2026-09-15: снижен с 15
    # до 10 — поблочная архитектура шлёт 15-30+ таких вызовов за генерацию,
    # и это прямое время в цепочке. Наблюдаемые успешные вызовы стадий
    # скелета/блоков текста укладываются в 2-6с (см. живые тесты сессии) —
    # 10с оставляет двойной запас, не отрезая честно медленный, но рабочий
    # ответ, и вдвое быстрее уступает место следующему провайдеру, если
    # первый завис.
    LLM_TIMEOUT: float = 10.0
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
    # Скелет — НЕ творческая задача типа GEN выше: это поиск простейшего/
    # противоположного процесса и связей между шагами (логический вывод,
    # компактный JSON). Аргумент "high даёт больше воды" из GEN сюда не
    # переносится — там речь о длинной прозе, здесь о коротком плане. На
    # low/дефолте архитектор регулярно берёт первую попавшуюся абстракцию
    # вместо простейшего процесса (см. аудит 2026-09-12) — поднято до high.
    LLM_REASONING_EFFORT_SKELETON: str = "high"
    # Судья оценивает 5 содержательных критериев (в т.ч. "развитие, а не
    # изменение" — п.5 судья_противоречия.md), не просто валидирует JSON —
    # на low эта проверка формальна. medium: не убыстряет 2× как low, но
    # проверка перестаёт быть штампом "valid: true".
    LLM_REASONING_EFFORT_JUDGE: str = "medium"
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
    
    model_config = SettingsConfigDict(env_file=os.getenv('PAPANDA_ENV_FILE', '.env'), extra="ignore")

settings = Settings()

def ensure_secret_key():
    if settings.SECRET_KEY and settings.SECRET_KEY.strip():
        return
    env_path = Path(os.getenv('PAPANDA_ENV_FILE', str(settings.BASE_DIR / '.env')))
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
