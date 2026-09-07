import re
import json

import nh3

# Разрешённый HTML в теле блока конспекта (то, что генерит contentToHtml на
# фронте): абзацы, переносы, простое форматирование, рамка формулы и span
# формулы с атрибутом formula. Всё остальное вырезаем.
_ALLOWED_TAGS = {"p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li",
                 "code", "pre", "blockquote", "h3", "h4", "span", "div"}
_ALLOWED_ATTRS = {"span": {"class", "formula"}, "div": {"class"}}


def sanitize_block_html(html: str) -> str:
    """Очистить HTML блока перед публичной отдачей (страница /s/<token>)."""
    if not html:
        return ""
    return nh3.clean(html, tags=_ALLOWED_TAGS, attributes=_ALLOWED_ATTRS)


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
