import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from io import BytesIO
from httpx import AsyncClient


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
# 2. ТЕСТЫ ЭНДПОИНТОВ ДИАЛЕКТИЧЕСКОГО АНАЛИЗА (OPPOSITES, EXPLAIN, HINT, CHECK)
# ==============================================================================

@pytest.mark.asyncio
async def test_opposites_endpoint_with_locales(client: AsyncClient):
    """Проверяет POST /api/ai/dialectics/opposites и передачу нормализованной локали."""
    with patch("fastapi_app.routers.ai.ai_service.get_opposites", new_callable=AsyncMock) as mock_get_opposites:
        mock_get_opposites.return_value = "Процесс B: Рассеяние энергии (энтропия)"
        
        # 1. С cookie locale=ru
        client.cookies.set("locale", "ru")
        payload = {"process_a": "Концентрация энергии"}
        res = await client.post("/api/ai/dialectics/opposites", json=payload)
        assert res.status_code == 200
        assert res.json()["result"] == "Процесс B: Рассеяние энергии (энтропия)"
        mock_get_opposites.assert_awaited_with("Концентрация энергии", locale="русском")

        # 2. С cookie locale=en
        client.cookies.set("locale", "en")
        res_en = await client.post("/api/ai/dialectics/opposites", json=payload)
        assert res_en.status_code == 200
        mock_get_opposites.assert_awaited_with("Концентрация энергии", locale="English")

        # 3. С cookie locale=kz
        client.cookies.set("locale", "kz")
        res_kz = await client.post("/api/ai/dialectics/opposites", json=payload)
        assert res_kz.status_code == 200
        mock_get_opposites.assert_awaited_with("Концентрация энергии", locale="қазақша")
        client.cookies.delete("locale")


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
            locale="русском"
        )
        client.cookies.delete("locale")


@pytest.mark.asyncio
async def test_hint_step_and_hint_alias_endpoints(client: AsyncClient):
    """Проверяет эндпоинты POST /api/ai/dialectics/hint-step и алиас POST /api/ai/dialectics/hint."""
    with patch("fastapi_app.routers.ai.ai_service.generate_dialectics_hint", new_callable=AsyncMock) as mock_hint:
        mock_hint.return_value = "Сформулируйте противоположность."
        
        payload = {
            "step_id": "step3",
            "current_content": "Тезис: Нагревание",
            "note_title": "Термодинамика"
        }
        
        # Проверка hint-step
        res1 = await client.post("/api/ai/dialectics/hint-step", json=payload)
        assert res1.status_code == 200
        assert res1.json()["hint"] == "Сформулируйте противоположность."

        # Проверка алиаса hint
        res2 = await client.post("/api/ai/dialectics/hint", json=payload)
        assert res2.status_code == 200
        assert res2.json()["hint"] == "Сформулируйте противоположность."
        
        assert mock_hint.call_count == 2


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
# 3. ТЕСТЫ МАТЕМАТИЧЕСКИХ ЭНДПОИНТОВ (PARSER, TEXT-MATH, EDIT-MATH, OCR, VOICE)
# ==============================================================================

@pytest.mark.asyncio
async def test_parser_endpoint_json_and_fallback(client: AsyncClient):
    """Проверяет POST /api/ai/dialectics/parser как с валидным JSON, так и с сырым текстом."""
    with patch("fastapi_app.routers.ai.ai_service.generate_parser", new_callable=AsyncMock) as mock_parser:
        # 1. Валидный JSON
        mock_parser.return_value = '{"formula": "E=mc^2", "explanation": "Энергия массы"}'
        res = await client.post("/api/ai/dialectics/parser", json={"formula": "E=mc^2"})
        assert res.status_code == 200
        assert res.json()["result"]["formula"] == "E=mc^2"

        # 2. Не JSON (fallback строка)
        mock_parser.return_value = "Просто текстовый ответ без JSON"
        res2 = await client.post("/api/ai/dialectics/parser", json={"formula": "E=mc^2"})
        assert res2.status_code == 200
        assert res2.json()["result"] == "Просто текстовый ответ без JSON"


@pytest.mark.asyncio
async def test_text_math_endpoint(client: AsyncClient):
    """Проверяет POST /api/ai/dialectics/text-math."""
    with patch("fastapi_app.routers.ai.ai_service.generate_parser", new_callable=AsyncMock) as mock_parser:
        mock_parser.return_value = '{"formula": "\\\\int x dx"}'
        
        res = await client.post("/api/ai/dialectics/text-math", json={"text": "интеграл от икс"})
        assert res.status_code == 200
        assert res.json()["result"] == '{"formula": "\\\\int x dx"}'
        mock_parser.assert_awaited_once_with("интеграл от икс")


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
        with patch("fastapi_app.routers.ai.ai_service.generate_parser", new_callable=AsyncMock) as mock_parser:
            mock_trans.return_value = "синус икс"
            mock_parser.return_value = '{"formula": "\\\\sin(x)"}'
            
            fake_audio = BytesIO(b"dummy audio data")
            files = {"file": ("audio.webm", fake_audio, "audio/webm")}
            
            res = await client.post("/api/ai/dialectics/voice-math", files=files)
            assert res.status_code == 200
            assert res.json()["result"] == "\\sin(x)"
            mock_trans.assert_awaited_once()
            mock_parser.assert_awaited_once_with("синус икс")


# ==============================================================================
# 4. ТЕСТЫ ПАРСЕРА СТАТЕЙ И PDF (ARTICLE-PARSER)
# ==============================================================================

@pytest.mark.asyncio
async def test_article_parser_with_text(client: AsyncClient):
    """Проверяет парсинг статьи при передаче article_text."""
    with patch("fastapi_app.routers.ai.ai_service.parse_article", new_callable=AsyncMock) as mock_article:
        mock_article.return_value = '[{"side": "left", "role": "thesis", "html": "<p>Тезис статьи</p>"}]'
        
        res = await client.post(
            "/api/ai/dialectics/article-parser",
            data={
                "message": "Разбери статью",
                "article_text": "Текст научной работы..."
            }
        )
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data["result"], list)
        assert data["result"][0]["role"] == "thesis"


@pytest.mark.asyncio
async def test_article_parser_with_valid_pdf(client: AsyncClient):
    """Проверяет парсинг статьи при загрузке PDF файла с извлечением текста."""
    with patch("fastapi_app.routers.ai.ai_service.parse_article", new_callable=AsyncMock) as mock_article:
        with patch("fastapi_app.routers.ai.PdfReader") as mock_pdf_reader_cls:
            mock_page = MagicMock()
            mock_page.extract_text.return_value = "Текст статьи из PDF документа"
            mock_reader = MagicMock()
            mock_reader.pages = [mock_page]
            mock_pdf_reader_cls.return_value = mock_reader

            mock_article.return_value = '[{"side": "left", "role": "thesis", "html": "<p>Текст из PDF</p>"}]'
            
            fake_pdf = BytesIO(b"fake pdf content")
            files = {"file": ("paper.pdf", fake_pdf, "application/pdf")}
            data = {"message": "Сделай конспект PDF"}
            
            res = await client.post("/api/ai/dialectics/article-parser", files=files, data=data)
            assert res.status_code == 200
            data_res = res.json()
            assert isinstance(data_res["result"], list)
            assert data_res["result"][0]["role"] == "thesis"
            mock_article.assert_awaited_once_with("Текст статьи из PDF документа\n", user_instruction="Сделай конспект PDF")


@pytest.mark.asyncio
async def test_article_parser_missing_input_and_invalid_pdf(client: AsyncClient):
    """Проверяет валидацию отсутствия входных данных и поврежденного PDF."""
    # 1. Ни текста, ни файла -> 400 Bad Request
    res_empty = await client.post(
        "/api/ai/dialectics/article-parser",
        data={"message": "Разбери"}
    )
    assert res_empty.status_code == 400
    assert "Must provide valid file or article_text" in res_empty.json()["detail"]

    # 2. Поврежденный PDF файл -> 400 Bad Request
    corrupt_pdf = BytesIO(b"not a real pdf content header")
    files = {"file": ("corrupt.pdf", corrupt_pdf, "application/pdf")}
    res_corrupt = await client.post(
        "/api/ai/dialectics/article-parser",
        files=files,
        data={"message": "Разбери"}
    )
    assert res_corrupt.status_code == 400
    assert "Error reading PDF" in res_corrupt.json()["detail"]


@pytest.mark.asyncio
async def test_article_parser_json_fallback(client: AsyncClient):
    """Проверяет fallback оборачивание в блок конспекта, если AI вернул невалидный JSON."""
    with patch("fastapi_app.routers.ai.ai_service.parse_article", new_callable=AsyncMock) as mock_article:
        mock_article.return_value = "Сырой неформатированный ответ модели"
        
        res = await client.post(
            "/api/ai/dialectics/article-parser",
            data={
                "message": "Разбери",
                "article_text": "Какой-то научный текст"
            }
        )
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data["result"], list)
        assert data["result"][0]["side"] == "left"
        assert data["result"][0]["role"] == "thesis"
        assert "Сырой неформатированный ответ" in data["result"][0]["html"]
