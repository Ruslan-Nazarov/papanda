import re
import json

import nh3

# Строгий набор — для ПУБЛИЧНОЙ отдачи (страница /s/<token>): абзацы,
# форматирование, рамка формулы и span формулы с атрибутом formula.
_PUBLIC_TAGS = {"p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li",
                "code", "pre", "blockquote", "h3", "h4", "span", "div"}
_PUBLIC_ATTRS = {"span": {"class", "formula"}, "div": {"class"}}

# Набор пошире — для санитизации НА ЗАПИСЬ (create/update note): всё, что
# легально производит редактор (TipTap), включая ссылки, mark и скрытые
# фразы (span[data-type=hidden-phrase] + data-*). Скрипты/обработчики/style
# всё равно вырезаются — nh3 их не пропускает.
_WRITE_TAGS = _PUBLIC_TAGS | {"a", "mark", "sup", "sub", "h1", "h2", "h5", "h6",
                              "hr", "table", "thead", "tbody", "tr", "th", "td"}
_WRITE_ATTRS = {
    "span": {"class", "formula", "data-type", "data-hint", "data-expanded", "style"},
    "div": {"class"},
    "a": {"href", "title"},  # rel/target управляет сам nh3 (link_rel)
    "mark": {"class"},
}
# style на span нужен math-inline'у; nh3 санитизирует значение style сам
# (только безопасные свойства), поэтому его можно оставить в списке.
_WRITE_STYLES = {"color", "background-color", "font-weight", "text-decoration"}


def sanitize_block_html(html: str) -> str:
    """Строгая очистка для публичной отдачи (страница /s/<token>)."""
    if not html:
        return ""
    return nh3.clean(html, tags=_PUBLIC_TAGS, attributes=_PUBLIC_ATTRS)


def sanitize_on_write(html: str) -> str:
    """Очистка HTML блока при сохранении заметки — вырезает script/onclick/
    javascript:-ссылки и прочий актив, сохраняя всё легальное форматирование
    редактора."""
    if not html:
        return ""
    return nh3.clean(
        html, tags=_WRITE_TAGS, attributes=_WRITE_ATTRS,
        url_schemes={"http", "https", "mailto"},
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
