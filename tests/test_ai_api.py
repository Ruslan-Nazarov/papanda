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
            locale="русском"
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


# ==============================================================================
# 4. ТЕСТЫ ПАРСЕРА СТАТЕЙ И PDF (ARTICLE-PARSER)
# ==============================================================================

@pytest.mark.asyncio
async def test_article_parser_with_text(client: AsyncClient):
    """Парсинг статьи из article_text — на выходе связный Markdown-текст."""
    with patch("fastapi_app.routers.ai.ai_service.parse_article", new_callable=AsyncMock) as mock_article:
        mock_article.return_value = "## Реконструкция\nПростейший процесс — …"

        res = await client.post(
            "/api/ai/dialectics/article-parser",
            data={
                "message": "Разбери статью",
                "article_text": "Текст научной работы..."
            }
        )
        assert res.status_code == 200
        assert res.json()["result"] == "## Реконструкция\nПростейший процесс — …"


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

            mock_article.return_value = "## Реконструкция из PDF"

            fake_pdf = BytesIO(b"fake pdf content")
            files = {"file": ("paper.pdf", fake_pdf, "application/pdf")}
            data = {"message": "Сделай конспект PDF"}

            res = await client.post("/api/ai/dialectics/article-parser", files=files, data=data)
            assert res.status_code == 200
            assert res.json()["result"] == "## Реконструкция из PDF"
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
    assert "ссылка" in res_empty.json()["detail"].lower()

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
async def test_article_parser_from_url(client: AsyncClient):
    """URL передаётся -> роутер тянет текст со страницы и парсит его."""
    with patch("fastapi_app.routers.ai._fetch_article_from_url", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = "Длинный текст статьи со страницы " * 20
        with patch("fastapi_app.routers.ai.ai_service.parse_article", new_callable=AsyncMock) as mock_article:
            mock_article.return_value = "## Реконструкция по ссылке"

            res = await client.post(
                "/api/ai/dialectics/article-parser",
                data={"message": "Разбери", "url": "https://ru.wikipedia.org/wiki/Теорема_Пифагора"},
            )
            assert res.status_code == 200
            assert res.json()["result"] == "## Реконструкция по ссылке"
            mock_fetch.assert_awaited_once()


@pytest.mark.asyncio
async def test_article_parser_url_ssrf_guard(client: AsyncClient):
    """Локальные / приватные адреса и не-http схемы отклоняются."""
    for bad in ("http://localhost/x", "http://127.0.0.1/x", "file:///etc/passwd", "ftp://example.com/x"):
        res = await client.post(
            "/api/ai/dialectics/article-parser",
            data={"message": "Разбери", "url": bad},
        )
        assert res.status_code == 400
