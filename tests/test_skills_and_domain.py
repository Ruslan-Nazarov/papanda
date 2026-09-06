import pytest

from fastapi_app.services.skills import render_skill_instructions
from fastapi_app.services.context_builder import _detect_domain
from fastapi_app.services.ai_service import ai_service


def test_skill_default_is_empty():
    assert render_skill_instructions(None) == ""
    assert render_skill_instructions({"speaker": "plain_answerer", "addressee": "plain_answerer"}) == ""


def test_skill_non_default_renders_text():
    out = render_skill_instructions({"speaker": "professor", "addressee": "newbie"})
    assert "СКИЛЛ" in out
    assert "hidden-phrase" in out  # addressee != default -> инструкция по разметке


def test_detect_domain_word_boundary():
    assert _detect_domain("гражданский кодекс и его развитие") == "general"   # не «код»
    assert _detect_domain("роман как жанр") == "general"
    assert _detect_domain("производная функции") == "math_code"
    assert _detect_domain("вывод: a = b + c") == "math_code"                  # символ


def test_explain_prompt_has_history_hint():
    p = ai_service._explain_prompt("энтропия", "до", "после")
    assert "историческ" in p.lower()


@pytest.mark.asyncio
async def test_parse_article_asks_three_sections():
    from unittest.mock import AsyncMock, patch
    with patch.object(ai_service, "get_bundled_prompt", new_callable=AsyncMock) as gb, \
         patch.object(ai_service, "_generate", new_callable=AsyncMock) as gen:
        gb.return_value = "SYS"
        gen.return_value = "ok"
        await ai_service.parse_article("текст статьи")
        user_prompt = gen.call_args[0][1]
        assert "Историческая форма" in user_prompt
        assert "Логическая форма" in user_prompt
        assert "Расхождение" in user_prompt
