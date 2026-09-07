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


# --- Санитизация HTML блока ---------------------------------------------------

from fastapi_app.services.sanitizer import sanitize_on_write, sanitize_block_html


@pytest.mark.parametrize("html,must_keep", [
    ("<p><strong>ж</strong><em>к</em><u>п</u><s>з</s><code>c</code></p>",
     ["<strong>", "<em>", "<u>", "<s>", "<code>"]),
    ('<blockquote class="custom-quote" author="Гегель"><div class="quote-content"><p>ц</p></div></blockquote>',
     ['class="custom-quote"', 'author="Гегель"', 'class="quote-content"']),
    ('<p><span formula="a^2" class="math-inline" data-formula="a^2">a^2</span></p>',
     ['formula="a^2"', 'class="math-inline"', 'data-formula="a^2"']),
    ('<div class="math-callout"><div class="math-content"><p>x</p></div></div>',
     ['class="math-callout"', 'class="math-content"']),
    ('<p><span data-hint="h" data-type="hidden-phrase" data-expanded="false" class="hidden-phrase-mark">ф</span></p>',
     ['data-hint="h"', 'data-type="hidden-phrase"', 'data-expanded="false"', 'class="hidden-phrase-mark"']),
    ('<p><span data-question="о" class="question-mark-text">в</span></p>',
     ['data-question="о"', 'class="question-mark-text"']),
    ('<p><a href="https://ru.wikipedia.org">в</a></p>', ['href="https://ru.wikipedia.org"']),
    ('<p><a href="internal://note/12/block/34" class="internal-link">б</a></p>',
     ['href="internal://note/12/block/34"', 'class="internal-link"']),
    ("<ul><li>1</li><li>2</li></ul>", ["<ul>", "<li>1</li>"]),
])
def test_editor_html_survives_sanitize_on_write(html, must_keep):
    """Всё, что производят расширения TipTap, проходит санитизацию без потерь —
    иначе редактор молча теряет форматирование при сохранении."""
    out = sanitize_on_write(html)
    for frag in must_keep:
        assert frag in out, f"{frag!r} вырезан из {out!r}"


def test_sanitize_strips_active_content():
    for bad in [
        '<p>ok<script>alert(1)</script></p>',
        '<p><img src=x onerror=alert(2)></p>',
        '<a href="javascript:alert(1)">x</a>',
        '<p onclick="evil()">y</p>',
        '<p style="x:url(javascript:alert(1))">z</p>',
    ]:
        out = sanitize_on_write(bad)
        assert "script" not in out.lower()
        assert "onerror" not in out and "onclick" not in out
        assert "javascript:" not in out


def test_public_sanitize_drops_links_keeps_formatting():
    out = sanitize_block_html('<p><a href="https://x.com">л-ка</a> и <strong>жир</strong></p>')
    assert "<a " not in out
    assert "<strong>жир</strong>" in out
