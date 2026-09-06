from fastapi_app.services.manual_algorithm import get_manual_algorithm

_EXPECTED_KEYS = {
    "anchor",
    "step1", "step1_title",
    "step2", "step2_title",
    "step3", "step3_title",
    "step4", "step4_title",
    "step5", "step5_title",
}


def test_ru_block_has_all_keys():
    ru = get_manual_algorithm("ru")
    assert set(ru) == _EXPECTED_KEYS
    assert ru["anchor"]
    assert "<div" in ru["step1"]  # подсказки 1-3 — форматированный HTML


def test_all_locales_present_and_parallel():
    ru, en, kz = (get_manual_algorithm(loc) for loc in ("ru", "en", "kz"))
    assert set(ru) == set(en) == set(kz) == _EXPECTED_KEYS
    # значения не пустые и различаются между локалями (реальный перевод, не копия ru)
    for k in _EXPECTED_KEYS:
        assert en[k] and kz[k]
    assert en["anchor"] != ru["anchor"]


def test_unknown_locale_falls_back_to_ru():
    assert get_manual_algorithm("fr") == get_manual_algorithm("ru")
