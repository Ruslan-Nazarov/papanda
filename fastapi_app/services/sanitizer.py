import re
import json
import base64
import binascii

import nh3

# ВАЖНО: списки должны покрывать ВСЁ, что производят расширения TipTap
# (fastapi_app/static/js/notes/extensions/*.js) — иначе санитизация молча
# съест форматирование при сохранении. Проверяется round-trip-тестом
# (tests/test_sanitizer.py::test_editor_html_survives_sanitize_on_write).
#
# CustomQuote     → <blockquote class author><div class="quote-content">…
#                   <div class="quote-author-wrap"><span class="quote-dash">
#                   <span class="quote-author">
# MathCallout     → <div class="math-callout"><div class="math-content">
# MathInline      → <span class="math-inline" formula data-formula>
# HiddenPhrase    → <span data-type="hidden-phrase" data-hint data-expanded class>
# QuestionMark    → <span data-question class="question-mark-text">
# InternalLink    → <a href=(http/https/mailto/internal://note/…) target rel class>

_INLINE_MARKS = {"strong", "b", "em", "i", "u", "s", "strike", "code", "mark", "sub", "sup"}
_BLOCKS = {"p", "br", "ul", "ol", "li", "pre", "blockquote", "hr",
           "h1", "h2", "h3", "h4", "h5", "h6",
           "table", "thead", "tbody", "tr", "th", "td"}

_WRITE_TAGS = _INLINE_MARKS | _BLOCKS | {"span", "div", "a", "img"}
_WRITE_ATTRS = {
    "span": {"class", "formula", "data-formula", "data-type", "data-hint",
             "data-expanded", "data-question", "style"},
    "div": {"class"},
    "blockquote": {"class", "author"},
    "a": {"href", "title", "class", "target"},  # rel добавляет сам nh3
    "img": {"src", "alt", "title", "width", "height"},
}
_WRITE_SCHEMES = {"http", "https", "mailto", "internal"}  # internal:// — ссылки между конспектами

# Строгий набор для ПУБЛИЧНОЙ отдачи (/s/<token>): без ссылок и data-*,
# только форматирование + формулы + выноски.
_PUBLIC_TAGS = _INLINE_MARKS | _BLOCKS | {"span", "div", "img"}
_PUBLIC_ATTRS = {"span": {"class", "formula", "data-formula"},
                 "div": {"class"}, "blockquote": {"class", "author"},
                 "img": _WRITE_ATTRS["img"]}

MAX_EMBEDDED_IMAGE_BYTES = 2 * 1024 * 1024
_IMAGE_DATA = re.compile(r"data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/]*={0,2})\Z", re.I)


def _safe_image_source(value: str) -> bool:
    # Bound allocation before decoding; SVG and arbitrary data MIME types are excluded.
    if len(value) > 64 + 4 * ((MAX_EMBEDDED_IMAGE_BYTES + 2) // 3):
        return False
    match = _IMAGE_DATA.fullmatch(value)
    if not match:
        return False
    try:
        raw = base64.b64decode(match[2], validate=True)
    except (ValueError, binascii.Error):
        return False
    if len(raw) > MAX_EMBEDDED_IMAGE_BYTES:
        return False
    mime = match[1].lower()
    return ((mime == 'png' and raw.startswith(b'\x89PNG\r\n\x1a\n'))
            or (mime == 'jpeg' and raw.startswith(b'\xff\xd8\xff'))
            or (mime == 'webp' and raw.startswith(b'RIFF') and raw[8:12] == b'WEBP'))


def _filter_attribute(tag: str, attribute: str, value: str):
    if tag == 'img' and attribute == 'src':
        if _safe_image_source(value):
            return value
        return None
    if tag == 'img' and attribute in {'width', 'height'}:
        return value if re.fullmatch(r'[0-9]{1,4}', value) and 0 < int(value) <= 8192 else None
    if attribute in {'href', 'src'}:
        compact = re.sub(r'[\x00-\x20\x7f]', '', value).lower()
        if compact.startswith('data:'):
            return None
    return value


def sanitize_block_html(html: str) -> str:
    """Строгая очистка для публичной отдачи (страница /s/<token>)."""
    if not html:
        return ""
    return nh3.clean(html, tags=_PUBLIC_TAGS, attributes=_PUBLIC_ATTRS,
                     url_schemes={'data'}, attribute_filter=_filter_attribute)


def sanitize_on_write(html: str, *, reject_invalid_images: bool = False) -> str:
    """Очистка HTML блока при сохранении заметки — вырезает script/onclick/
    javascript:-ссылки и прочий актив, сохраняя всё легальное форматирование
    редактора (см. список расширений выше)."""
    if not html:
        return ""
    invalid_image = False

    def filter_attribute(tag, attribute, value):
        nonlocal invalid_image
        filtered = _filter_attribute(tag, attribute, value)
        if tag == 'img' and attribute == 'src' and filtered is None:
            invalid_image = True
        return filtered

    cleaned = nh3.clean(
        html, tags=_WRITE_TAGS, attributes=_WRITE_ATTRS, url_schemes=_WRITE_SCHEMES | {'data'},
        attribute_filter=filter_attribute,
    )
    # nh3 does not propagate exceptions from the Rust callback. Raise in Python.
    if reject_invalid_images and invalid_image:
        raise ValueError('Images must be embedded PNG, JPEG or WebP, at most 2 MiB each')
    return cleaned


def _iter_balanced_objects(text: str):
    """Все верхнеуровневые {...} по порядку, со счётом глубины и уважением
    к строковым литералам (кавычки/экранирование), чтобы не хватать лишнего,
    когда в ответе LLM несколько JSON-объектов или проза с фигурными скобками."""
    depth = 0
    start = -1
    in_str = False
    escape = False
    for i, ch in enumerate(text):
        if in_str:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            if depth > 0:
                depth -= 1
                if depth == 0 and start != -1:
                    yield text[start:i + 1]
                    start = -1


class Sanitizer:
    @staticmethod
    def extract_json(llm_response: str) -> dict:
        """Извлекает JSON из ответа LLM, даже если он обернут в markdown (```json ... ```)"""
        try:
            # Сначала пробуем распарсить как есть
            return json.loads(llm_response)
        except json.JSONDecodeError:
            # Ищем блок JSON через регулярное выражение
            json_match = re.search(r'```(?:json)?\s*(.*?)\s*```', llm_response, re.DOTALL | re.IGNORECASE)
            if json_match:
                try:
                    return json.loads(json_match.group(1))
                except json.JSONDecodeError:
                    pass

        # Первый корректно разбираемый сбалансированный объект {...}.
        # Раньше было жадное (\{.*\}) — оно захватывало от первой { до последней }
        # и ломалось, если объектов несколько или вокруг проза с { }.
        for candidate in _iter_balanced_objects(llm_response):
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                continue

        # Если ничего не помогло, возвращаем ошибку для логирования
        raise ValueError("Failed to extract valid JSON from LLM response.")

    @staticmethod
    def clean_markdown_for_editor(text: str) -> str:
        """
        Возвращаем текст как есть. Фронтенд (AIController) теперь сам парсит 
        Markdown через marked.js в нормальный HTML.
        """
        if not text:
            return ""
        return text.strip()
