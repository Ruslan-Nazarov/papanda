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


def test_saved_chat_payload_survives_write_sanitization():
    import html
    import json
    from html.parser import HTMLParser

    data = {"version": 1, "fragment": "Матрица <Q>", "calculation": False, "turns": [
        {"question": "Почему?", "answer": 'Ответ: $q_1$. <img src=x onerror="alert(1)">',
         "sources": [{"block_id": "b1", "note_id": "12", "title": "Источник", "text": "Фрагмент"}]}]}
    encoded = html.escape(json.dumps(data, ensure_ascii=False), quote=True)
    source = (f'<p>Матрица <span data-type="concept-chat" data-chat="{encoded}" '
              'class="concept-chat-marker" role="button" tabindex="0" aria-label="Чат" '
              'aria-haspopup="dialog" title="Чат" onclick="alert(1)">💬</span> и текст.</p>')
    cleaned = sanitize_on_write(source)

    class Reader(HTMLParser):
        attrs = None

        def handle_starttag(self, tag, attrs):
            if tag == 'span':
                self.attrs = dict(attrs)

    reader = Reader()
    reader.feed(cleaned)
    assert json.loads(reader.attrs['data-chat']) == data
    assert reader.attrs['role'] == 'button'
    assert reader.attrs['tabindex'] == '0'
    assert reader.attrs['aria-haspopup'] == 'dialog'
    assert 'onclick' not in reader.attrs
    assert 'data-chat' not in sanitize_block_html(source)


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


def test_multiple_internal_targets_survive_write_only_when_valid():
    import html as html_module
    targets = '[{"url":"internal://note/1","text":"Первый","label":"Первый"},{"url":"internal://note/2/block/3","text":"Второй","label":"Второй"}]'
    source = f'<p><a href="internal://note/1" data-internal-links="{html_module.escape(targets, quote=True)}">текст</a></p>'
    assert 'data-internal-links=' in sanitize_on_write(source)
    assert 'data-internal-links' not in sanitize_block_html(source)
    unsafe = '<a href="internal://note/1" data-internal-links="[&quot;javascript:alert(1)&quot;,&quot;internal://note/2&quot;]">текст</a>'
    assert 'data-internal-links' not in sanitize_on_write(unsafe)


@pytest.mark.parametrize('clean', [sanitize_on_write, sanitize_block_html])
def test_text_size_survives_storage_and_public_view(clean):
    html = '<p><span class="text-size-24" data-text-size="24">Large text</span></p>'
    assert clean(html) == html
    invalid = clean('<span data-text-size="999" onclick="alert(1)">Text</span>')
    assert 'data-text-size' not in invalid and 'onclick' not in invalid
