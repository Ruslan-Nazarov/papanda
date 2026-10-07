"""Переводы интерфейса — ОДИН источник на клиент и сервер.

Все строки живут в `i18n_data.json` ({ru,en,kz}). Сервер читает их отсюда
(get_translator для Jinja), клиент получает готовый словарь текущей локали
инлайном в страницу (см. main.py → templates → static/js/i18n.js). Раньше
таблицы дублировались в i18n.py и i18n.js и расходились.
"""
import json
from pathlib import Path

_DATA_FILE = Path(__file__).parent / "i18n_data.json"
TRANSLATIONS: dict = json.loads(_DATA_FILE.read_text(encoding="utf-8"))

LOCALES = ("ru", "en", "kz")


def request_locale(cookie: str | None, accept_language: str) -> str:
    """Use a supported explicit choice, then the browser's language priorities."""
    aliases = {"kk": "kz"}

    def supported(value):
        primary = (value or "").strip().lower().split("-")[0]
        primary = aliases.get(primary, primary)
        return primary if primary in LOCALES else None

    choice = supported(cookie)
    if choice:
        return choice
    choices = []
    for part in accept_language.split(","):
        tag, *params = part.strip().split(";")
        quality = 1.0
        try:
            for param in params:
                key, _, value = param.strip().partition("=")
                if key.lower() == "q":
                    quality = float(value)
        except ValueError:
            continue
        language = supported(tag)
        if language and 0 < quality <= 1:
            choices.append((quality, language))
    return max(choices, key=lambda item: item[0])[1] if choices else "en"


def normalize(locale: str) -> str:
    loc = (locale or "ru").lower()
    return loc if loc in TRANSLATIONS else "ru"


def locale_dict(locale: str) -> dict:
    """Словарь строк локали с подложенным ru-фолбэком — то, что уходит на
    клиент (одна локаль, все ключи присутствуют)."""
    loc = normalize(locale)
    return {**TRANSLATIONS["ru"], **TRANSLATIONS[loc]}


def get_translator(locale: str):
    loc = normalize(locale)

    def _(key: str) -> str:
        return TRANSLATIONS[loc].get(key) or TRANSLATIONS["ru"].get(key, key)

    return _
