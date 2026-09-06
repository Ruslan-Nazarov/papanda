"""Рендер инструкций «скилла» (регистр речи + уровень адресата) для промптов.

skill = {"speaker": "<role_id>", "addressee": "<role_id>"}, роли — в
`prompts/скиллы_регистр.json`. Две оси независимы: speaker меняет только
тон/регистр, addressee — только порог и количество пояснений через скрытый
текст (hidden-phrase). Обе роли = дефолт (или skill не задан) → пустая
строка, промпт не меняется.

Файл читается при каждом вызове (крохотный) — правки видны без рестарта.
"""
import json

from fastapi_app.config import settings

_SKILL_FILE = "скиллы_регистр.json"
_DEFAULT_SKILL = "plain_answerer"

_HIDDEN_PHRASE_SYNTAX = (
    "Термин, который поясняете через скрытый текст, оборачивайте СТРОГО так "
    "(прямо в тексте, без дополнительных пометок): "
    '<span data-type="hidden-phrase" data-hint="краткое объяснение термина">термин</span>'
)


def render_skill_instructions(skill: dict = None) -> str:
    speaker = (skill or {}).get("speaker") or _DEFAULT_SKILL
    addressee = (skill or {}).get("addressee") or _DEFAULT_SKILL
    if speaker == _DEFAULT_SKILL and addressee == _DEFAULT_SKILL:
        return ""

    try:
        raw = (settings.PROMPTS_DIR / _SKILL_FILE).read_text(encoding="utf-8")
        roles = json.loads(raw).get("roles", {})
    except (OSError, ValueError, TypeError):
        return ""

    lines = []
    speaker_role = roles.get(speaker)
    if speaker_role and speaker_role.get("speaker"):
        lines.append(speaker_role["speaker"])
    addressee_role = roles.get(addressee)
    addressee_text = addressee_role.get("addressee") if addressee_role else ""
    if addressee_text:
        lines.append(addressee_text)
        if addressee != _DEFAULT_SKILL:
            lines.append(_HIDDEN_PHRASE_SYNTAX)
    if not lines:
        return ""
    return "\nСКИЛЛ (регистр речи и уровень адресата):\n" + "\n".join(lines) + "\n"
