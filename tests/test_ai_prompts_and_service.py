import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from io import BytesIO
from fastapi_app.services.ai_service import AIService, PROMPT_MAP, PROMPT_CHAINS
from fastapi_app.services.locale_utils import normalize_locale
from fastapi_app.config import settings


# ==============================================================================
# 1. ТЕСТЫ МЕХАНИКИ СБОРКИ ЦЕПОЧЕК ПРОМПТОВ (BUNDLING & CACHING)
# ==============================================================================

@pytest.mark.asyncio
async def test_prompt_chains_composition_and_caching():
    """Проверяет механику сборки цепочек промптов, объединение разделителем и кэширование."""
    service = AIService()

    # Проверяем структуру цепочек
    assert "opposites" in PROMPT_CHAINS
    assert "formula" in PROMPT_CHAINS
    assert "hint" in PROMPT_CHAINS
    assert "article" in PROMPT_CHAINS
    assert "what_is" in PROMPT_CHAINS
    assert "check_ai" in PROMPT_CHAINS

    # Проверяем сборку бандла с моком чтения файлов (изолированно от содержимого файлов на диске)
    with patch("aiofiles.open") as mock_aio_open:
        mock_file = AsyncMock()
        mock_file.read.return_value = "PROMPT_CHUNK"
        mock_aio_open.return_value.__aenter__.return_value = mock_file
        
        with patch("pathlib.Path.exists", return_value=True):
            bundled = await service.get_bundled_prompt("opposites")
            assert isinstance(bundled, str)
            assert "\n\n---\n\n" in bundled
            # 3 элемента в цепочке opposites: base, restore, opposites
            assert bundled.count("PROMPT_CHUNK") == 3

            # Проверяем кэширование: повторный вызов возвращает закэшированную строку без повторного чтения
            assert "opposites" in service._prompts_cache
            cached_val = await service.get_bundled_prompt("opposites")
            assert cached_val is bundled


@pytest.mark.asyncio
async def test_prompt_bundle_fallback_for_missing_files():
    """Проверяет корректный фолбэк при запросе неизвестного ключа или отсутствующего файла."""
    service = AIService()
    fallback_prompt = await service.get_bundled_prompt("unknown_hypothetical_feature")
    assert "Instruction for unknown_hypothetical_feature" in fallback_prompt


# ==============================================================================
# 2. ТЕСТЫ ПРИМЕНЕНИЯ ПРОМПТОВ В AIService
# ==============================================================================

@pytest.mark.asyncio
async def test_generate_parser_prompt_application():
    """generate_parser: системный промпт «formula», формула в user-промпте, вывод Markdown (без json_object)."""
    service = AIService()
    with patch.object(service, "get_bundled_prompt", new_callable=AsyncMock) as mock_bundle:
        mock_bundle.return_value = "SYSTEM_FORMULA_PROMPT"
        with patch.object(service, "_generate", new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = "## Цепочка\n1 + 1 → …"

            res = await service.generate_parser("E=mc^2")
            assert res == "## Цепочка\n1 + 1 → …"
            mock_bundle.assert_awaited_with("formula")
            args = mock_gen.call_args[0]
            sys_prompt, user_prompt = args[0], args[1]
            response_fmt = args[2] if len(args) > 2 else mock_gen.call_args[1].get("response_format")
            assert sys_prompt == "SYSTEM_FORMULA_PROMPT"
            assert "E=mc^2" in user_prompt
            # промпт запрещает объяснять смысл — user-промпт не должен этого требовать
            assert "смысл формулы целиком" not in user_prompt
            assert response_fmt is None


@pytest.mark.asyncio
async def test_edit_math_prompt_application():
    """edit_math: свой узкий системный промпт (не диалектический), формула + инструкция в user, json_object."""
    service = AIService()
    with patch.object(service, "get_bundled_prompt", new_callable=AsyncMock) as mock_bundle:
        with patch.object(service, "_generate", new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = '{"formula": "y = 2x + 1"}'

            res = await service.edit_math(instruction="прибавь единицу", formula="y = 2x")
            assert res == '{"formula": "y = 2x + 1"}'
            mock_bundle.assert_not_awaited()
            args = mock_gen.call_args[0]
            sys_prompt, user_prompt = args[0], args[1]
            response_fmt = args[2] if len(args) > 2 else mock_gen.call_args[1].get("response_format")
            assert "LaTeX" in sys_prompt
            assert "y = 2x" in user_prompt
            assert "прибавь единицу" in user_prompt
            assert response_fmt == {"type": "json_object"}


@pytest.mark.asyncio
async def test_parse_article_prompt_application():
    """parse_article: системный промпт «article», текст статьи в user-промпте, вывод Markdown (без json_object)."""
    service = AIService()
    with patch.object(service, "get_bundled_prompt", new_callable=AsyncMock) as mock_bundle:
        mock_bundle.return_value = "SYSTEM_ARTICLE_PROMPT"
        with patch.object(service, "_generate", new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = "## Реконструкция\nТезис …"

            res = await service.parse_article(
                text="Текст исследовательской статьи...",
                user_instruction="Выдели основные этапы"
            )
            assert "Тезис" in res
            mock_bundle.assert_awaited_with("article")
            args = mock_gen.call_args[0]
            sys_prompt, user_prompt = args[0], args[1]
            response_fmt = args[2] if len(args) > 2 else mock_gen.call_args[1].get("response_format")
            assert sys_prompt == "SYSTEM_ARTICLE_PROMPT"
            assert "Выдели основные этапы" in user_prompt
            assert "Текст исследовательской статьи..." in user_prompt
            assert response_fmt is None


@pytest.mark.asyncio
async def test_get_hint_restore_prompt_application():
    """Проверяет ветку восстановления содержимого блока (step_id='restore')."""
    service = AIService()
    with patch.object(service, "get_bundled_prompt", new_callable=AsyncMock) as mock_bundle:
        mock_bundle.return_value = "SYSTEM_RESTORE_PROMPT"
        with patch.object(service, "_generate", new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = "Восстановленный текст"
            
            res = await service.get_hint(
                step_id="restore",
                goal_text="Заголовок блока",
                context_text="Контекст соседних блоков",
                locale="русском"
            )
            assert res == "Восстановленный текст"
            mock_bundle.assert_awaited_with("restore")
            args = mock_gen.call_args[0]
            sys_prompt, user_prompt = args[0], args[1]
            assert sys_prompt == "SYSTEM_RESTORE_PROMPT"
            assert "Заголовок блока" in user_prompt
            assert "Контекст соседних блоков" in user_prompt


@pytest.mark.asyncio
async def test_get_hint_steps_prompt_application():
    """Проверяет ветку подсказок по шагам (step1–step5) и передачу локали."""
    service = AIService()
    for step in ["step1", "step2", "step3", "step4", "step5"]:
        with patch.object(service, "get_bundled_prompt", new_callable=AsyncMock) as mock_bundle:
            mock_bundle.return_value = "SYSTEM_HINT_PROMPT"
            with patch.object(service, "_generate", new_callable=AsyncMock) as mock_gen:
                mock_gen.return_value = f"Подсказка для {step}"
                
                res = await service.get_hint(
                    step_id=step,
                    goal_text="Тестовая цель",
                    context_text="Текущие данные",
                    locale="English"
                )
                assert res == f"Подсказка для {step}"
                mock_bundle.assert_awaited_with("hint")
                args = mock_gen.call_args[0]
                sys_prompt, user_prompt = args[0], args[1]
                assert sys_prompt == "SYSTEM_HINT_PROMPT"
                assert f"Шаг: {step}" in user_prompt
                assert "Тестовая цель" in user_prompt
                assert "Текущие данные" in user_prompt
                assert "English" in user_prompt


@pytest.mark.asyncio
async def test_generate_dialectics_hint_delegation():
    """Проверяет делегирование вызова generate_dialectics_hint в get_hint."""
    service = AIService()
    with patch.object(service, "get_hint", new_callable=AsyncMock) as mock_get_hint:
        mock_get_hint.return_value = "Подсказка ассистента"
        res = await service.generate_dialectics_hint(
            step_id="step2",
            current_content="Текущий контент",
            note_title="Заголовок темы",
            locale="русском"
        )
        assert res == "Подсказка ассистента"
        mock_get_hint.assert_awaited_once_with(
            step_id="step2",
            goal_text="Заголовок темы",
            context_text="Текущий контент",
            locale="русском"
        )


@pytest.mark.asyncio
async def test_check_logic_prompt_application():
    """Проверяет применение промпта в check_logic: передачу текста конспекта, истории и локали."""
    service = AIService()
    with patch.object(service, "get_bundled_prompt", new_callable=AsyncMock) as mock_bundle:
        mock_bundle.return_value = "SYSTEM_CHECK_PROMPT"
        with patch.object(service, "_generate", new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = "Оценка логики конспекта."
            history = [{"role": "user", "content": "Проверь еще раз"}]
            
            res = await service.check_logic(
                note_text="Блок 1 -> Блок 2 -> Синтез",
                history=history,
                locale="русском"
            )
            assert res == "Оценка логики конспекта."
            mock_bundle.assert_awaited_with("check_ai")
            args = mock_gen.call_args[0]
            kwargs = mock_gen.call_args[1]
            sys_prompt, user_prompt = args[0], args[1]
            assert sys_prompt == "SYSTEM_CHECK_PROMPT"
            assert "Блок 1 -> Блок 2 -> Синтез" in user_prompt
            assert kwargs["history"] == history


# ==============================================================================
# 3. ТЕСТЫ МЕХАНИКИ ИИ (VISION OCR, WHISPER AUDIO, LOW-LEVEL _GENERATE)
# ==============================================================================

@pytest.mark.asyncio
async def test_ocr_formula_primary_and_fallback_models():
    """Проверяет механику OCR формул: первичная модель Scout, fallback на vision-preview и обработка ошибок."""
    service = AIService()
    
    # 1. Успех на первичной модели Scout
    mock_resp = MagicMock()
    mock_resp.choices = [MagicMock(message=MagicMock(content='{"latex": "x^2 + y^2 = r^2"}'))]
    
    service.client.chat.completions.create = AsyncMock(return_value=mock_resp)
    
    with patch("fastapi_app.services.ai_service.settings.GROQ_API_KEY", "gsk_test_key_valid"):
        res = await service.ocr_formula("fake_base64_data")
        assert res == '{"latex": "x^2 + y^2 = r^2"}'
        assert service.client.chat.completions.create.call_args[1]["model"] == settings.GROQ_VISION_MODEL

    # 2. Ошибка первичной модели -> Fallback на llama-3.2-11b-vision-preview
    fallback_resp = MagicMock()
    fallback_resp.choices = [MagicMock(message=MagicMock(content='{"latex": "fallback_result"}'))]
    
    service.client.chat.completions.create = AsyncMock(
        side_effect=[Exception("Scout not available"), fallback_resp]
    )
    
    with patch("fastapi_app.services.ai_service.settings.GROQ_API_KEY", "gsk_test_key_valid"):
        res2 = await service.ocr_formula("fake_base64_data")
        assert res2 == '{"latex": "fallback_result"}'
        assert service.client.chat.completions.create.call_count == 2
        second_call_model = service.client.chat.completions.create.call_args_list[1][1]["model"]
        assert second_call_model == settings.GROQ_VISION_FALLBACK_MODEL

    # 3. Обе модели выдали ошибку
    service.client.chat.completions.create = AsyncMock(
        side_effect=[Exception("Scout failed"), Exception("Vision preview failed")]
    )
    with patch("fastapi_app.services.ai_service.settings.GROQ_API_KEY", "gsk_test_key_valid"):
        res3 = await service.ocr_formula("fake_base64_data")
        assert "Error calling AI Vision" in res3

    # 4. API disabled state
    with patch("fastapi_app.services.ai_service.settings.GROQ_API_KEY", ""):
        assert await service.ocr_formula("fake_base64_data") == "AI disabled."


@pytest.mark.asyncio
async def test_transcribe_audio_whisper_and_fallback():
    """Проверяет механику Whisper: через client.audio и через REST fallback httpx."""
    service = AIService()
    
    # 1. Когда у клиента есть атрибут audio
    mock_audio = MagicMock()
    mock_transcription = MagicMock()
    mock_transcription.text = "интеграл от нуля до бесконечности"
    mock_audio.transcriptions.create = AsyncMock(return_value=mock_transcription)
    service.client.audio = mock_audio
    
    with patch("fastapi_app.services.ai_service.settings.GROQ_API_KEY", "gsk_test_key_valid"):
        with patch("builtins.open", MagicMock()):
            res = await service.transcribe_audio("dummy_path/test.webm")
            assert res == "интеграл от нуля до бесконечности"

    # 2. Когда атрибута audio нет -> REST fallback через httpx.AsyncClient
    service.client = MagicMock(spec=[])  # клиент без свойства audio
    with patch("fastapi_app.services.ai_service.settings.GROQ_API_KEY", "gsk_test_key_valid"):
        with patch("builtins.open", MagicMock()):
            mock_http_resp = MagicMock()
            mock_http_resp.json.return_value = {"text": "распознанный через rest голос"}
            
            mock_client_instance = AsyncMock()
            mock_client_instance.post.return_value = mock_http_resp
            mock_client_cls = MagicMock()
            mock_client_cls.return_value.__aenter__.return_value = mock_client_instance
            
            with patch("httpx.AsyncClient", mock_client_cls):
                res_rest = await service.transcribe_audio("dummy_path/test.webm")
                assert res_rest == "распознанный через rest голос"

    # 3. Проверка обработки ошибки транскрибации
    service.client.audio = mock_audio
    mock_audio.transcriptions.create = AsyncMock(side_effect=Exception("Audio format error"))
    with patch("fastapi_app.services.ai_service.settings.GROQ_API_KEY", "gsk_test_key_valid"):
        with patch("builtins.open", MagicMock()):
            err_res = await service.transcribe_audio("dummy_path/error.webm")
            assert "Error transcribing audio" in err_res

    # 4. Отключенный API ключ
    with patch("fastapi_app.services.ai_service.settings.GROQ_API_KEY", ""):
        assert await service.transcribe_audio("dummy_path/test.webm") == "Audio transcription disabled."


@pytest.mark.asyncio
async def test_generate_error_handling_and_disabled_state():
    """Проверяет механику _generate поверх LLMRegistry: disabled-состояние,
    сетевые ошибки, успешный вызов и формирование messages."""
    service = AIService()

    # 1. Ни одного ключа не настроено -> дружелюбное сообщение вместо ошибки
    with patch("fastapi_app.services.ai_service.any_llm_key_configured", return_value=False):
        res = await service._generate("sys", "user")
        assert "AI disabled" in res

    # 2. Ошибка от реестра провайдеров -> "Error calling AI: ..."
    with patch("fastapi_app.services.ai_service.any_llm_key_configured", return_value=True), \
         patch("fastapi_app.services.ai_service.llm_registry.generate",
               new=AsyncMock(side_effect=RuntimeError("Connection timed out"))):
        err_res = await service._generate("sys", "user", use_cache=False)
        assert "Error calling AI: Connection timed out" in err_res

    # 3. Успешный вызов и формирование сообщений (system + history + user)
    with patch("fastapi_app.services.ai_service.any_llm_key_configured", return_value=True), \
         patch("fastapi_app.services.ai_service.llm_registry.generate",
               new=AsyncMock(return_value="Ответ ИИ")) as mock_gen:
        history = [{"role": "user", "content": "Вопрос 1"}, {"role": "assistant", "content": "Ответ 1"}]
        res = await service._generate("SYS_PROMPT", "USER_PROMPT", history=history, use_cache=False)
        assert res == "Ответ ИИ"

        sent_messages = mock_gen.call_args[0][0]
        assert sent_messages[0] == {"role": "system", "content": "SYS_PROMPT"}
        assert sent_messages[1] == {"role": "user", "content": "Вопрос 1"}
        assert sent_messages[2] == {"role": "assistant", "content": "Ответ 1"}
        assert sent_messages[3] == {"role": "user", "content": "USER_PROMPT"}


# ==============================================================================
# 4. ТЕСТЫ НОРМАЛИЗАЦИИ ЛОКАЛИ
# ==============================================================================

def test_normalize_locale_utility():
    """Проверяет корректное преобразование локалей в понятные для ИИ названия языков."""
    assert normalize_locale("ru") == "русском"
    assert normalize_locale("ru-RU") == "русском"
    assert normalize_locale("RU") == "русском"
    assert normalize_locale("en") == "English"
    assert normalize_locale("en-US") == "English"
    assert normalize_locale("EN") == "English"
    assert normalize_locale("kz") == "қазақша"
    assert normalize_locale("kz-KZ") == "қазақша"
    assert normalize_locale("KZ") == "қазақша"
    assert normalize_locale("") == "русском"
    assert normalize_locale(None) == "русском"
    assert normalize_locale("fr") == "русском"
