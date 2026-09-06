import pytest

from fastapi_app.services.context_builder import ContextBuilder


@pytest.mark.asyncio
async def test_default_skill_produces_no_instructions():
    """Оба скилла = neutral (или skill=None) -> промпт не меняется вообще,
    старое поведение (без skill) должно быть побитово идентичным."""
    cb = ContextBuilder()
    assert await cb._render_skill_instructions(None) == ""
    assert await cb._render_skill_instructions({"speaker": "neutral", "addressee": "neutral"}) == ""


@pytest.mark.asyncio
async def test_non_default_addressee_includes_hidden_phrase_markup_instruction():
    """Регрессия: для не-дефолтного addressee промпт обязан объяснять модели
    ТОЧНЫЙ синтаксис скрытой фразы (data-type="hidden-phrase" data-hint=...),
    иначе модель не знает, как оформить пояснение (баг, найденный вживую 2026-09-05)."""
    cb = ContextBuilder()
    rendered = await cb._render_skill_instructions({"speaker": "neutral", "addressee": "children"})
    assert 'data-type="hidden-phrase"' in rendered
    assert "data-hint=" in rendered


@pytest.mark.asyncio
async def test_default_addressee_does_not_include_hidden_phrase_markup_instruction():
    """Для дефолтного addressee (plain_answerer) не нужно навязывать разметку скрытых фраз вообще."""
    cb = ContextBuilder()
    rendered = await cb._render_skill_instructions({"speaker": "professor", "addressee": "neutral"})
    assert "hidden-phrase" not in rendered


@pytest.mark.asyncio
async def test_speaker_only_affects_tone_not_hidden_phrase_instruction():
    """speaker меняет только тон; сам по себе (без addressee != default) не должен
    внезапно включать инструкцию по скрытым фразам."""
    cb = ContextBuilder()
    rendered = await cb._render_skill_instructions({"speaker": "children", "addressee": "neutral"})
    assert "ребёнок" in rendered or "оказывается" in rendered.lower()
    assert "hidden-phrase" not in rendered
