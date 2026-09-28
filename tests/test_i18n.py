import pytest
from fastapi_app.i18n import TRANSLATIONS, get_translator

def test_translations_structure():
    assert "ru" in TRANSLATIONS
    assert "en" in TRANSLATIONS
    assert "kz" in TRANSLATIONS
    
    ru_keys = set(TRANSLATIONS["ru"].keys())
    en_keys = set(TRANSLATIONS["en"].keys())
    kz_keys = set(TRANSLATIONS["kz"].keys())
    
    # Check that core keys are present in all locales
    core_keys = {
        "app_title",
        "btn_open",
        "btn_help",
        "btn_mode",
        "btn_versions",
        "no_category",
        "placeholder_title",
        "btn_checkpoint",
        "menu_mode_title",
        "menu_dialectics",
        "menu_two_column",
        "btn_ai_wizard",
        "btn_export_md",
        "btn_print",
        "btn_toc",
        "btn_search",
        "btn_stickers",
        "lang_ru",
        "lang_en",
        "lang_kz"
    }
    
    assert core_keys.issubset(ru_keys)
    assert core_keys.issubset(en_keys)
    assert core_keys.issubset(kz_keys)


def test_get_translator():
    ru_t = get_translator("ru")
    en_t = get_translator("en")
    kz_t = get_translator("kz")
    fallback_t = get_translator("de") # unsupported locale falls back to ru
    
    assert ru_t("app_title") == "Конспекты"
    assert en_t("app_title") == "Notes"
    assert kz_t("app_title") == "Конспекттер"
    assert fallback_t("app_title") == "Конспекты"
    
    # Missing key returns the key itself
    assert ru_t("non_existing_key_xyz") == "non_existing_key_xyz"
