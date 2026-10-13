from fastapi_app.services.context_builder import _detect_domain
from fastapi_app.services.ai_service import ai_service


def test_detect_domain_word_boundary():
    assert _detect_domain("гражданский кодекс и его развитие") == "general"   # не «код»
    assert _detect_domain("роман как жанр") == "general"
    assert _detect_domain("производная функции") == "math_code"
    assert _detect_domain("вывод: a = b + c") == "math_code"                  # символ


def test_explain_prompt_keeps_the_selected_fragment_and_its_context():
    p = ai_service._explain_prompt("энтропия", "до", "после")
    assert "Выделенный фрагмент: энтропия" in p
    assert "Блок: до" in p
    assert "Контекст блока: после" in p
    assert p.endswith("Что означает выделенный фрагмент здесь?")
