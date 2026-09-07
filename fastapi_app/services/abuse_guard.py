"""Защита от злоупотребления генерацией БЕЗ аккаунтов.

Приложение — демоверсия без регистрации, но каждая генерация конспекта стоит
реальных токенов ($ Cerebras / лимиты провайдеров). Один скрипт может за день
сжечь весь бюджет. Здесь — суточные лимиты:
  - на сессию (cookie session_id): сколько генераций в сутки с одного браузера;
  - глобальный: сколько всего генераций в сутки принимает сервис (жёсткий
    потолок расхода — при достижении отвечаем «приходите завтра», а не сливаем
    кредиты).

Хранилище в памяти процесса. Ок для одного воркера (текущий деплой). Для
нескольких воркеров/инстансов нужен Redis — тогда вынести счётчики туда.
Сессионный ключ слабый (очистил куки — сбросился), поэтому глобальный потолок
и есть настоящий предохранитель.
"""
import time
import logging

from fastapi import Request, HTTPException

from fastapi_app.config import settings

logger = logging.getLogger(__name__)

_session_counts: dict[str, tuple[str, int]] = {}  # sid -> (YYYY-MM-DD, count)
_global: list = ["", 0]                            # [YYYY-MM-DD, count]
_MAX_SESSIONS_TRACKED = 100_000                    # предохранитель от роста словаря


def _today() -> str:
    return time.strftime("%Y-%m-%d", time.gmtime())


def _sid(request: Request) -> str:
    return request.cookies.get("session_id") or (request.client.host if request.client else "anon")


def _roll_global(today: str) -> None:
    if _global[0] != today:
        _global[0], _global[1] = today, 0


def check_generation_quota(request: Request) -> None:
    """Бросает HTTP 429, если превышен суточный лимит (глобальный или на сессию).
    Вызывать в начале обработчика генерации, ДО работы."""
    today = _today()
    _roll_global(today)
    if settings.GLOBAL_DAILY_GENERATION_CAP and _global[1] >= settings.GLOBAL_DAILY_GENERATION_CAP:
        logger.warning("Global daily generation cap hit (%d)", _global[1])
        raise HTTPException(
            status_code=429,
            detail="Сегодня сервис обработал максимум запросов на генерацию. Попробуйте, пожалуйста, завтра.",
        )
    if settings.SESSION_DAILY_GENERATION_CAP:
        day, cnt = _session_counts.get(_sid(request), ("", 0))
        if day == today and cnt >= settings.SESSION_DAILY_GENERATION_CAP:
            raise HTTPException(
                status_code=429,
                detail=(
                    f"Вы собрали {settings.SESSION_DAILY_GENERATION_CAP} конспектов за сегодня — "
                    "это дневной лимит демоверсии. Возвращайтесь завтра."
                ),
            )


def record_generation(request: Request) -> None:
    """Учесть одну генерацию. Вызывать сразу после успешного старта генерации."""
    today = _today()
    _roll_global(today)
    _global[1] += 1
    day, cnt = _session_counts.get(_sid(request), ("", 0))
    _session_counts[_sid(request)] = (today, (cnt + 1) if day == today else 1)
    if len(_session_counts) > _MAX_SESSIONS_TRACKED:
        _session_counts.clear()


def stats() -> dict:
    """Для /health или отладки."""
    _roll_global(_today())
    return {"global_today": _global[1], "sessions_tracked": len(_session_counts)}
