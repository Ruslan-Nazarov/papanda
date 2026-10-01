import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from io import BytesIO
from httpx import AsyncClient


@pytest.mark.asyncio
@pytest.mark.parametrize("endpoint", ["parser", "article-parser"])
async def test_removed_parsers_are_unavailable(client: AsyncClient, endpoint):
    response = await client.post(f"/api/ai/dialectics/{endpoint}", json={})
    assert response.status_code == 404


# ==============================================================================
# 1. ТЕСТЫ СТАТИЧЕСКИХ ДАННЫХ И БАЗОВЫХ ЭНДПОИНТОВ
# ==============================================================================

@pytest.mark.asyncio
async def test_get_notes_hints_static(client: AsyncClient):
    """Проверяет эндпоинт GET /api/ai/dialectics/notes/hints."""
    res = await client.get("/api/ai/dialectics/notes/hints")
    assert res.status_code == 200
    data = res.json()
    assert "hints" in data
    hints = data["hints"]
    for key in ["anchor", "step1", "step2", "step3", "step4", "step5"]:
        assert key in hints
        assert len(hints[key]) > 0


# ==============================================================================
# 2. ТЕСТЫ ЭНДПОИНТОВ ДИАЛЕКТИЧЕСКОГО АНАЛИЗА (EXPLAIN, HINT, CHECK)
# ==============================================================================

@pytest.mark.asyncio
async def test_explain_concept_endpoint(client: AsyncClient):
    """Проверяет POST /api/ai/dialectics/explain-concept с историей и контекстом."""
    with patch("fastapi_app.routers.ai.ai_service.explain_concept", new_callable=AsyncMock) as mock_explain:
        mock_explain.return_value = "Отрицание отрицания — это закон развития..."
        
        client.cookies.set("locale", "ru")
        payload = {
            "text": "Отрицание отрицания",
            "context_before": "Рассматривая развитие тезиса и антитезиса",
            "context_after": "мы приходим к синтезу.",
            "history": [{"role": "user", "content": "Поясни подробнее"}]
        }
        res = await client.post("/api/ai/dialectics/explain-concept", json=payload)
        
        assert res.status_code == 200
        data = res.json()
        assert data["result"] == "Отрицание отрицания — это закон развития..."
        assert data["user_query"] == "Отрицание отрицания"
        mock_explain.assert_awaited_once_with(
            text="Отрицание отрицания",
            context_before="Рассматривая развитие тезиса и антитезиса",
            context_after="мы приходим к синтезу.",
            history=[{"role": "user", "content": "Поясни подробнее"}],
            locale="русском",
        )
        client.cookies.delete("locale")


@pytest.mark.asyncio
async def test_check_logic_endpoint(client: AsyncClient):
    """Проверяет POST /api/ai/dialectics/check-ai."""
    with patch("fastapi_app.routers.ai.ai_service.check_logic", new_callable=AsyncMock) as mock_check:
        mock_check.return_value = "Логическая цепочка выстроена безупречно."
        
        client.cookies.set("locale", "ru")
        payload = {
            "text": "Тезис -> Антитезис -> Противоречие -> Синтез",
            "history": []
        }
        res = await client.post("/api/ai/dialectics/check-ai", json=payload)
        
        assert res.status_code == 200
        data = res.json()
        assert data["result"] == "Логическая цепочка выстроена безупречно."
        mock_check.assert_awaited_once_with("Тезис -> Антитезис -> Противоречие -> Синтез", [], locale="русском")
        client.cookies.delete("locale")


# ==============================================================================
# 3. ТЕСТЫ МАТЕМАТИЧЕСКИХ ЭНДПОИНТОВ (TEXT-MATH, EDIT-MATH, OCR, VOICE)
# ==============================================================================

@pytest.mark.asyncio
async def test_text_math_endpoint(client: AsyncClient):
    """Проверяет POST /api/ai/dialectics/text-math — описание словами -> формула LaTeX."""
    with patch("fastapi_app.routers.ai.ai_service.text_to_formula", new_callable=AsyncMock) as mock_ttf:
        mock_ttf.return_value = '{"formula": "\\\\int x dx"}'

        res = await client.post("/api/ai/dialectics/text-math", json={"text": "интеграл от икс"})
        assert res.status_code == 200
        assert res.json()["result"]["formula"] == "\\int x dx"
        mock_ttf.assert_awaited_once_with("интеграл от икс")


@pytest.mark.asyncio
async def test_edit_math_endpoint_json_and_fallback(client: AsyncClient):
    """Проверяет POST /api/ai/dialectics/edit-math."""
    with patch("fastapi_app.routers.ai.ai_service.edit_math", new_callable=AsyncMock) as mock_edit:
        # Валидный JSON
        mock_edit.return_value = '{"formula": "x^2 + 5"}'
        res = await client.post("/api/ai/dialectics/edit-math", json={"formula": "x^2", "instruction": "прибавь 5"})
        assert res.status_code == 200
        assert res.json()["result"]["formula"] == "x^2 + 5"

        # Fallback при невалидном JSON
        mock_edit.return_value = "x^2 + 5 (raw text)"
        res_fb = await client.post("/api/ai/dialectics/edit-math", json={"formula": "x^2", "instruction": "прибавь 5"})
        assert res_fb.status_code == 200
        assert res_fb.json()["result"] == "x^2 + 5 (raw text)"


@pytest.mark.asyncio
async def test_formula_ocr_endpoint(client: AsyncClient):
    """Проверяет POST /api/ai/dialectics/formula/ocr с загрузкой файла."""
    with patch("fastapi_app.routers.ai.ai_service.ocr_formula", new_callable=AsyncMock) as mock_ocr:
        mock_ocr.return_value = '{"formula": "\\\\frac{a}{b}"}'
        
        fake_file = BytesIO(b"fake image stream")
        files = {"file": ("formula.png", fake_file, "image/png")}
        
        res = await client.post("/api/ai/dialectics/formula/ocr", files=files)
        assert res.status_code == 200
        assert res.json()["result"]["formula"] == "\\frac{a}{b}"
        mock_ocr.assert_awaited_once()


@pytest.mark.asyncio
async def test_voice_math_endpoint(client: AsyncClient):
    """Проверяет POST /api/ai/dialectics/voice-math с транскрибацией и парсингом."""
    with patch("fastapi_app.routers.ai.ai_service.transcribe_audio", new_callable=AsyncMock) as mock_trans:
        with patch("fastapi_app.routers.ai.ai_service.text_to_formula", new_callable=AsyncMock) as mock_ttf:
            mock_trans.return_value = "синус икс"
            mock_ttf.return_value = '{"formula": "\\\\sin(x)"}'

            fake_audio = BytesIO(b"dummy audio data")
            files = {"file": ("audio.webm", fake_audio, "audio/webm")}

            res = await client.post("/api/ai/dialectics/voice-math", files=files)
            assert res.status_code == 200
            assert res.json()["result"] == "\\sin(x)"
            mock_trans.assert_awaited_once()
            mock_ttf.assert_awaited_once_with("синус икс")


@pytest.mark.asyncio
async def test_generate_full_stream_sse_frames(client: AsyncClient):
    """SSE-эндпоинт полной генерации: кадры data: со step/content, затем
    report, затем done. Регрессионный тест на форму потока."""
    async def _fake_stream(*_a, **_k):
        yield ("step1", "простейший процесс")
        yield ("step2.1", "развитие один")
        yield ("__titles__", {"1": "начало", "2.1": "ветка"})
        yield ("__note_meta__", {"note_title": "Тест", "anchor_summary": "итог"})
        yield ("__report__", {"degraded": True, "reasons": ["fallback_provider"], "judge": "passed"})
        from fastapi_app.services.generation.runtime import current_run
        yield ('__terminal__', {'run_id': current_run.get().run_id, 'status': 'completed'})

    with patch("fastapi_app.routers.ai.conspectus_router.stream_generate_full", side_effect=_fake_stream):
        frames = []
        async with client.stream(
            "POST", "/api/ai/dialectics/conspectus/generate-full/stream",
            json={"action": "generate_full", "context_state": {"target_goal": "рост"}},
        ) as resp:
            assert resp.status_code == 200
            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    frames.append(json.loads(line[6:]))

    steps = [f for f in frames if "step" in f]
    assert {s["step"] for s in steps} == {"step1", "step2.1"}
    assert any(f.get("titles") == {"1": "начало", "2.1": "ветка"} for f in frames)
    assert any("note_meta" in f for f in frames)
    report_frame = next(f for f in frames if "report" in f)
    assert report_frame["report"]["degraded"] is True
    assert frames[0]['type'] == 'started'
    assert frames[-1]['type'] == 'terminal'
    assert frames[-1]['status'] == 'completed'
    assert len({f['run_id'] for f in frames}) == 1
    assert [f['sequence'] for f in frames] == list(range(1, len(frames) + 1))


@pytest.mark.asyncio
async def test_generation_daily_quota_returns_429(client: AsyncClient, monkeypatch):
    """Суточный лимит генераций на сессию: после N-й генерации приходит 429
    с осмысленным текстом, работа не запускается."""
    import fastapi_app.services.abuse_guard as guard
    monkeypatch.setattr("fastapi_app.config.settings.SESSION_DAILY_GENERATION_CAP", 2)

    async def _fake_stream(*_a, **_k):
        yield ("step1", "ok")

    with patch("fastapi_app.routers.ai.conspectus_router.stream_generate_full", side_effect=_fake_stream):
        body = {"action": "generate_full", "context_state": {"target_goal": "x"}}
        for _ in range(2):
            r = await client.post("/api/ai/dialectics/conspectus/generate-full/stream", json=body)
            assert r.status_code == 200
        r = await client.post("/api/ai/dialectics/conspectus/generate-full/stream", json=body)
        assert r.status_code == 429
        assert "лимит" in r.json()["detail"].lower()
