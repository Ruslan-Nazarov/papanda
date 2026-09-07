import re
import json

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

_WRITE_TAGS = _INLINE_MARKS | _BLOCKS | {"span", "div", "a"}
_WRITE_ATTRS = {
    "span": {"class", "formula", "data-formula", "data-type", "data-hint",
             "data-expanded", "data-question", "style"},
    "div": {"class"},
    "blockquote": {"class", "author"},
    "a": {"href", "title", "class", "target"},  # rel добавляет сам nh3
}
_WRITE_SCHEMES = {"http", "https", "mailto", "internal"}  # internal:// — ссылки между конспектами

# Строгий набор для ПУБЛИЧНОЙ отдачи (/s/<token>): без ссылок и data-*,
# только форматирование + формулы + выноски.
_PUBLIC_TAGS = _INLINE_MARKS | _BLOCKS | {"span", "div"}
_PUBLIC_ATTRS = {"span": {"class", "formula", "data-formula"},
                 "div": {"class"}, "blockquote": {"class", "author"}}


def sanitize_block_html(html: str) -> str:
    """Строгая очистка для публичной отдачи (страница /s/<token>)."""
    if not html:
        return ""
    return nh3.clean(html, tags=_PUBLIC_TAGS, attributes=_PUBLIC_ATTRS)


def sanitize_on_write(html: str) -> str:
    """Очистка HTML блока при сохранении заметки — вырезает script/onclick/
    javascript:-ссылки и прочий актив, сохраняя всё легальное форматирование
    редактора (см. список расширений выше)."""
    if not html:
        return ""
    return nh3.clean(
        html, tags=_WRITE_TAGS, attributes=_WRITE_ATTRS, url_schemes=_WRITE_SCHEMES,
    )


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
