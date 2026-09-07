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
