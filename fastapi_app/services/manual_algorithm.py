"""Тексты алгоритма для РУЧНОГО режима (подсказки блоков).

Источник — `prompts/7_алгоритм_составления_конспекта.json`, структура
`{ "ru": {...}, "en": {...}, "kz": {...} }`. Файл авторский, пользователь
правит `ru` сам; `7.json` НЕ используется для ИИ-генерации (её ведут
1_главный/8/9), только для ручных подсказок.

Читаем файл при каждом вызове (он крохотный, дёргается раз на загрузку
страницы) — чтобы правки в `7.json` были видны без рестарта.
"""
import json

from fastapi_app.config import settings

_FILE = "7_алгоритм_составления_конспекта.json"


def get_manual_algorithm(locale: str) -> dict:
    """Блок текстов для локали (fallback: ru → {})."""
    path = settings.PROMPTS_DIR / _FILE
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    if not isinstance(data, dict):
        return {}
    block = data.get(locale) or data.get("ru") or {}
    return block if isinstance(block, dict) else {}
