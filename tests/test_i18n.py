import pytest
import re
from fastapi_app.i18n import TRANSLATIONS, get_translator


def test_all_translation_keys_and_placeholders_match():
    reference = TRANSLATIONS["ru"]
    for locale, words in TRANSLATIONS.items():
        assert words.keys() == reference.keys(), locale
        for key, value in words.items():
            assert isinstance(value, str) and value.strip(), (locale, key)
            assert set(re.findall(r"\{\w+\}", value)) == set(
                re.findall(r"\{\w+\}", reference[key])
            ), (locale, key)
    assert not any(re.search(r"[А-Яа-яЁё]", value) for value in TRANSLATIONS["en"].values())


@pytest.mark.parametrize("cookie,header,expected", [
    (None, "en-GB,en;q=0.9", "en"),
    ("ru", "en-GB", "ru"),
    ("EN", "ru", "en"),
    ("invalid", "en-GB", "en"),
    (None, "ru;q=0.2,en-GB;q=0.9", "en"),
    (None, "ru;q=0,en;q=1", "en"),
    (None, "fr,kk-KZ;q=0.8,en;q=0.5", "kz"),
    (None, "ru;q=bad,en", "en"),
    (None, "ru;q=NaN,en", "en"),
    (None, "", "en"),
])
def test_request_locale(cookie, header, expected):
    from fastapi_app.i18n import request_locale
    assert request_locale(cookie, header) == expected

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
