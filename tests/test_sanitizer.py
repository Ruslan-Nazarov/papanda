import pytest

from fastapi_app.services.sanitizer import Sanitizer


def test_plain_json():
    assert Sanitizer.extract_json('{"a": 1}') == {"a": 1}


def test_json_in_markdown_fence():
    raw = 'Вот результат:\n```json\n{"step1": {"thesis": "x"}}\n```\nготово'
    assert Sanitizer.extract_json(raw) == {"step1": {"thesis": "x"}}


def test_prose_with_braces_then_real_object():
    """Проза с фигурными скобками перед настоящим объектом — берём объект, не мусор."""
    raw = 'Обозначим множество как {x, y}. Ответ: {"is_valid": true, "reason": "ок"}'
    assert Sanitizer.extract_json(raw) == {"is_valid": True, "reason": "ок"}


def test_multiple_objects_returns_first_valid():
    """Регрессия на жадный (\\{.*\\}): при двух объектах старый код склеивал
    их в один невалидный кусок. Теперь берём первый разбираемый."""
    raw = '{"is_valid": false, "reason": "первый"}\nи ещё раз\n{"is_valid": true, "reason": "второй"}'
    assert Sanitizer.extract_json(raw) == {"is_valid": False, "reason": "первый"}


def test_brace_inside_string_not_miscounted():
    raw = '{"reason": "тут есть символ } внутри строки", "is_valid": true}'
    assert Sanitizer.extract_json(raw) == {
        "reason": "тут есть символ } внутри строки",
        "is_valid": True,
    }


def test_nested_object():
    raw = 'префикс {"a": {"b": {"c": 1}}, "d": 2} суффикс'
    assert Sanitizer.extract_json(raw) == {"a": {"b": {"c": 1}}, "d": 2}


def test_no_json_raises():
    with pytest.raises(ValueError):
        Sanitizer.extract_json("тут вообще нет json")
