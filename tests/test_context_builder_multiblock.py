from fastapi_app.services.context_builder import expected_step_keys, thesis_for_key


def test_expected_step_keys_default_single_process_per_step():
    """Без sub_steps (или без скелета вовсе) — по одному ключу на шаг, как раньше."""
    assert expected_step_keys({}) == ["1", "2", "3", "4", "5"]
    skeleton = {f"step{i}": {"thesis": f"т{i}", "sub_steps": []} for i in range(1, 6)}
    assert expected_step_keys(skeleton) == ["1", "2", "3", "4", "5"]


def test_expected_step_keys_multiple_processes():
    """Регрессия на фичу «несколько простейших/развивающих процессов»:
    Шаг 1 — 1 sub_step (итого 2), Шаг 2 — 2 sub_steps (итого 3)."""
    skeleton = {
        "step1": {"thesis": "треугольник", "sub_steps": [{"thesis": "пространство"}]},
        "step2": {"thesis": "развитие А", "sub_steps": [{"thesis": "развитие Б"}, {"thesis": "развитие В"}]},
        "step3": {"thesis": "противоположность", "sub_steps": []},
        "step4": {"thesis": "противоречие", "sub_steps": []},
        "step5": {"thesis": "синтез", "sub_steps": []},
    }
    assert expected_step_keys(skeleton) == ["1.1", "1.2", "2.1", "2.2", "2.3", "3", "4", "5"]


def test_thesis_for_key_resolves_main_and_sub_theses():
    skeleton = {
        "step1": {"thesis": "треугольник", "sub_steps": [{"thesis": "пространство"}]},
        "step2": {"thesis": "развитие А", "sub_steps": [{"thesis": "развитие Б"}]},
    }
    assert thesis_for_key(skeleton, "1.1") == "треугольник"
    assert thesis_for_key(skeleton, "1.2") == "пространство"
    assert thesis_for_key(skeleton, "2.1") == "развитие А"
    assert thesis_for_key(skeleton, "2.2") == "развитие Б"
    # Ключ без точки (бесшовный шаг) тоже работает.
    assert thesis_for_key({"step3": {"thesis": "противоположность"}}, "3") == "противоположность"
    # Несуществующий индекс -> пусто, не падаем.
    assert thesis_for_key(skeleton, "1.3") == ""
