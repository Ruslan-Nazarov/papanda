from abc import ABC
from contextlib import aclosing
from typing import Optional, List, Dict, AsyncIterator
from openai import AsyncOpenAI
import logging
import asyncio
import random

from fastapi_app.config import settings

logger = logging.getLogger(__name__)

_PLACEHOLDER_KEYS = {"", "your_groq_api_key_here", "dummy_key"}


def any_llm_key_configured() -> bool:
    """Живая проверка: настроен ли хоть один рабочий API-ключ LLM."""
    keys = (
        settings.GROQ_API_KEY, settings.GOOGLE_API_KEY, settings.OPENROUTER_API_KEY,
        settings.SAMBANOVA_API_KEY, settings.CEREBRAS_API_KEY, settings.HUGGINGFACE_API_KEY,
    )
    return any(k and k not in _PLACEHOLDER_KEYS for k in keys)


class BaseLLMProvider(ABC):
    def __init__(self, api_key: str, base_url: str, model_name: str, name: str, fast_model_name: Optional[str] = None):
        self.api_key = api_key
        self.base_url = base_url
        self.model_name = model_name
        self.fast_model_name = fast_model_name or model_name
        self.name = name

        # Обход строгой проверки OpenAI на пустой ключ при старте сервера.
        # LLMRegistry всё равно пропустит этот провайдер, если self.api_key пустой.
        safe_api_key = self.api_key if self.api_key else "dummy_key_to_bypass_init_error"
        # max_retries=0: не даём SDK делать экспоненциальный backoff на 429 —
        # на бесплатном тарифе это добавляет по 5-15 сек к вызову. Реслучаем через
        # LLMRegistry на следующего провайдера.
        self.client = AsyncOpenAI(api_key=safe_api_key, base_url=self.base_url, max_retries=0)

    def _build_kwargs(self, messages, response_format, max_tokens, temperature, fast, timeout,
                      reasoning_effort=None) -> dict:
        model = self.fast_model_name if fast else self.model_name
        kwargs = {
            "model": model,
            "messages": messages,
            "timeout": timeout if timeout is not None else settings.LLM_TIMEOUT,
        }
        if max_tokens:
            kwargs["max_tokens"] = max_tokens
        if temperature is not None:
            kwargs["temperature"] = temperature
        # reasoning-модели (gpt-oss, gemini-flash) без ограничения тратят лимит
        # токенов на «размышления» и тормозят/ломают JSON. По умолчанию усилие
        # низкое (settings.LLM_REASONING_EFFORT); вызов может поднять его явно
        # (reasoning_effort=) — так основная генерация идёт на medium.
        effort = reasoning_effort or settings.LLM_REASONING_EFFORT
        if effort and ("gpt-oss" in model or "gemini" in model):
            kwargs["extra_body"] = {"reasoning_effort": effort}
        if response_format:
            kwargs["response_format"] = response_format
        return kwargs

    async def generate(
        self,
        messages: List[Dict[str, str]],
        response_format: Optional[dict] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        fast: bool = False,
        timeout: Optional[float] = None,
        reasoning_effort: Optional[str] = None,
    ) -> str:
        if not self.api_key:
            raise ValueError(f"API key missing for provider {self.name}")

        kwargs = self._build_kwargs(messages, response_format, max_tokens, temperature, fast, timeout,
                                    reasoning_effort)
        response = await self.client.chat.completions.create(**kwargs)
        # Некоторые OpenAI-совместимые эндпоинты (OpenRouter) на ошибке отдают
        # 200 с телом без choices — не даём этому упасть как TypeError.
        if not getattr(response, "choices", None):
            raise RuntimeError(f"{self.name}: empty choices in response ({getattr(response, 'error', response)})")
        content = response.choices[0].message.content
        if content is None:
            raise RuntimeError(f"{self.name}: null content in response")
        return content

    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        fast: bool = False,
        timeout: Optional[float] = None,
        reasoning_effort: Optional[str] = None,
    ) -> AsyncIterator[str]:
        if not self.api_key:
            raise ValueError(f"API key missing for provider {self.name}")

        kwargs = self._build_kwargs(messages, None, max_tokens, temperature, fast, timeout,
                                    reasoning_effort)
        kwargs["stream"] = True
        stream = await self.client.chat.completions.create(**kwargs)
        # async with гарантирует закрытие HTTP-потока и при досрочном прерывании.
        async with stream:
            async for chunk in stream:
                choices = getattr(chunk, "choices", None)
                if not choices:
                    continue
                delta = getattr(choices[0].delta, "content", None)
                if delta:
                    yield delta


class GroqProvider(BaseLLMProvider):
    def __init__(self):
        super().__init__(
            api_key=settings.GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1",
            model_name=settings.GROQ_MODEL,
            name="Groq",
            fast_model_name=settings.GROQ_FAST_MODEL,
        )


class GroqAltProvider(BaseLLMProvider):
    """Тот же Groq-ключ, другая модель — отдельный лимит частоты (и для fast-режима тоже)."""
    def __init__(self):
        super().__init__(
            api_key=settings.GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1",
            model_name=settings.GROQ_ALT_MODEL,
            name="GroqAlt",
            fast_model_name=settings.GROQ_ALT_MODEL,
        )


class HuggingFaceProvider(BaseLLMProvider):
    def __init__(self):
        super().__init__(
            api_key=settings.HUGGINGFACE_API_KEY,
            base_url="https://api-inference.huggingface.co/v1",
            model_name=settings.HUGGINGFACE_MODEL,
            name="HuggingFace"
        )


class GeminiProvider(BaseLLMProvider):
    """Google AI Studio через OpenAI-совместимый эндпоинт."""
    def __init__(self):
        super().__init__(
            api_key=settings.GOOGLE_API_KEY,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            model_name=settings.GOOGLE_MODEL,
            name="Gemini",
            fast_model_name=settings.GOOGLE_FAST_MODEL,
        )


class OpenRouterProvider(BaseLLMProvider):
    def __init__(self):
        super().__init__(
            api_key=settings.OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1",
            model_name=settings.OPENROUTER_MODEL,
            name="OpenRouter"
        )


class SambaNovaProvider(BaseLLMProvider):
    def __init__(self):
        super().__init__(
            api_key=settings.SAMBANOVA_API_KEY,
            base_url="https://api.sambanova.ai/v1",
            model_name=settings.SAMBANOVA_MODEL,
            name="SambaNova"
        )


class CerebrasProvider(BaseLLMProvider):
    def __init__(self):
        super().__init__(
            api_key=settings.CEREBRAS_API_KEY,
            base_url="https://api.cerebras.ai/v1",
            model_name=settings.CEREBRAS_MODEL,
            name="Cerebras",
            fast_model_name=settings.CEREBRAS_FAST_MODEL,
        )


class _AllRateLimited(Exception):
    """Весь круг провайдеров упёрся в rate-limit — есть смысл подождать и повторить."""


# Маршрутизация вызовов под задачу (2026-09-07). Значение — список имён
# провайдеров в порядке предпочтения для этой задачи; фолбэк на остальных из
# кольца сохраняется. Решение по $5-кредиту Cerebras: на горячем пути первым
# бесплатный Groq, Cerebras — первый фолбаг (платный буфер включается ровно
# когда Groq затроттлился), Gemini — вторым.
TASK_ROUTES: Dict[str, List[str]] = {
    # ОСНОВНАЯ генерация конспекта (стрим всех шагов + добор): Cerebras первым.
    # Причина (2026-09-07): у Groq gpt-oss-120b лимит 8000 токенов/мин на
    # вход+выход вместе — при длинном выводе (~9k) он сразу 429. Cerebras
    # ($5 кредит, тот же gpt-oss-120b, кэш префикса) этой стены не имеет.
    # Gemini flash-lite — второй фолбэк (большой контекст); Groq последним как
    # backstop (в основном 429, спасает добор по одному процессу).
    "step_stream": ["Cerebras", "Gemini", "Groq"],   # стрим шагов конспекта
    "what_is":     ["Groq", "Cerebras", "Gemini"],   # «Что это?»
    "formula":     ["Groq", "Cerebras", "Gemini"],   # парсер формул
    "check":       ["Groq", "Cerebras", "Gemini"],   # «⚖️ Проверка ИИ» логики/фактов
    "article":     ["Groq", "Cerebras", "Gemini"],   # длинный вход
    "tiny":        ["Groq", "Cerebras", "Gemini"],   # мелкие LaTeX-преобразования
    # мелкие структурные вызовы: Gemini flash-lite первым — он быстрый, чистый
    # JSON, и так минутный лимит Groq не тратится на вспомогательное
    # (на этом ключе рабочий ТОЛЬКО flash-lite, обычный flash сразу 429).
    "skeleton":    ["Gemini", "Groq", "Cerebras"],   # план-скелет (fast=True)
    "history":     ["Gemini", "Groq"],               # исторические справки 📜 (fast=True)
    # судья: Gemini первым осознанно — он ВНЕ семейства gpt-oss (Groq/Cerebras),
    # чтобы не оценивал выход родственной модели.
    "judge":       ["Gemini", "Cerebras", "Groq"],
}


class LLMRegistry:
    def __init__(self):
        # Порядок = приоритет фолбэка по умолчанию. Живые (2026-09-07): Groq
        # (free ~200k TPD), Cerebras (gpt-oss-120b, $5 кредит), Gemini
        # (3.5-flash / flash-lite), GroqAlt (тот же ключ, qwen — отдельный
        # лимит), OpenRouter (:free minimax — общий бэкстоп).
        # SambaNova / HuggingFace выпилены: первый требует оплаты (402), у
        # второго мёртв эндпоинт — в кольце они только жгли по 1-2 с на 402/
        # connection error каждый проход.
        self.providers = [
            GroqProvider(),
            CerebrasProvider(),
            GeminiProvider(),
            GroqAltProvider(),
            OpenRouterProvider(),
        ]
        # С какого провайдера начинать следующий запрос (сдвигается при rate-limit,
        # чтобы размазать нагрузку по провайдерам и не долбить один и тот же).
        self._start_idx: int = 0

    def _order(self, prefer=None) -> List[int]:
        """Порядок провайдеров: от _start_idx по кругу; если задан prefer
        (имя провайдера ИЛИ список имён) — эти идут первыми в указанном
        порядке. Так вызовы маршрутизируются под задачу (см. TASK_ROUTES),
        а фолбэк на остальных сохраняется."""
        n = len(self.providers)
        order = [(self._start_idx + i) % n for i in range(n)]
        names = [prefer] if isinstance(prefer, str) else list(prefer or [])
        head: List[int] = []
        for name in names:
            pi = next((i for i, p in enumerate(self.providers) if p.name == name), None)
            if pi is not None and pi not in head:
                head.append(pi)
        if head:
            order = head + [i for i in order if i not in head]
        return order

    async def generate(
        self,
        messages: List[Dict[str, str]],
        response_format: Optional[dict] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        fast: bool = False,
        prefer=None,   # str | list[str] | None — см. LLMRegistry._order/TASK_ROUTES
        reasoning_effort: Optional[str] = None,
    ) -> str:
        # До 3 проходов по провайдерам: если весь круг упёрся в rate-limit,
        # ждём короткую паузу и пробуем снова (на free-тарифе окна лимитов узкие).
        last_error = "unknown"
        for attempt in range(3):
            try:
                return await self._one_pass(messages, response_format, max_tokens, temperature, fast, prefer,
                                            reasoning_effort)
            except _AllRateLimited as e:
                last_error = str(e)
                await asyncio.sleep(1.5 + random.random() * (attempt + 1))
        raise RuntimeError(f"All LLM providers rate limited after retries. {last_error}")

    async def _one_pass(
        self,
        messages: List[Dict[str, str]],
        response_format: Optional[dict],
        max_tokens: Optional[int],
        temperature: Optional[float],
        fast: bool,
        prefer=None,   # str | list[str] | None — см. LLMRegistry._order/TASK_ROUTES
        reasoning_effort: Optional[str] = None,
    ) -> str:
        provider_errors: List[str] = []
        rate_limited_count = 0

        n = len(self.providers)
        order = self._order(prefer)

        for idx in order:
            provider = self.providers[idx]
            if not provider.api_key or provider.api_key == "your_groq_api_key_here":
                logger.warning(f"Skipping {provider.name}: API key missing.")
                provider_errors.append(f"{provider.name}: API key missing")
                continue

            try:
                logger.info(f"Trying LLM generation with {provider.name} (fast={fast})...")
                result = await provider.generate(
                    messages, response_format, max_tokens=max_tokens, temperature=temperature, fast=fast,
                    reasoning_effort=reasoning_effort,
                )
                return result
            except Exception as e:
                error_msg = str(e).lower()
                is_network_error = any(kw in error_msg for kw in ("connection", "timeout", "timed out", "connect"))
                is_rate_limit = any(kw in error_msg for kw in ("429", "rate limit", "rate_limit", "too many requests", "quota"))

                # Rate limit: сразу к следующему провайдеру и сдвигаем стартовую точку,
                # чтобы следующие запросы не начинались с перегруженного провайдера.
                # При prefer-маршрутизации стартовую точку не трогаем — это
                # осознанный выбор канала, а не общая ротация.
                if is_rate_limit:
                    if not prefer:
                        self._start_idx = (idx + 1) % n
                    rate_limited_count += 1
                    provider_errors.append(f"{provider.name}: rate limited")
                    logger.warning(f"Provider {provider.name} rate limited, rotating to next.")
                    continue

                # При сетевой ошибке не тратим время на retry — сразу к следующему провайдеру
                if is_network_error:
                    provider_errors.append(f"{provider.name}: {e}")
                    logger.error(f"Provider {provider.name} network error, skipping: {e}")
                    continue

                # Попробуем без response_format, если ошибка может быть связана с неподдержкой JSON режима
                if response_format and ("400" in error_msg or "format" in error_msg or "json" in error_msg or "unsupported" in error_msg):
                    logger.warning(f"Retrying {provider.name} without response_format due to error: {e}")
                    try:
                        result = await provider.generate(
                            messages, None, max_tokens=max_tokens, temperature=temperature, fast=fast,
                            reasoning_effort=reasoning_effort,
                        )
                        return result
                    except Exception as e2:
                        provider_errors.append(f"{provider.name}: {e2}")
                        logger.error(f"Provider {provider.name} failed on retry: {e2}")
                else:
                    provider_errors.append(f"{provider.name}: {e}")
                    logger.error(f"Provider {provider.name} failed: {e}")
                
                continue

        errors_summary = " | ".join(provider_errors)
        # Если хоть один провайдер просто «затроттлен» (а не мёртв) — есть шанс,
        # что пауза + повтор помогут. Остальные ошибки (402/404/сеть) неустранимы.
        if rate_limited_count > 0:
            raise _AllRateLimited(f"Errors: [{errors_summary}]")
        raise RuntimeError(f"All LLM providers failed. Errors: [{errors_summary}]")

    async def aclose(self):
        """Закрыть HTTP-клиенты всех провайдеров (вызывать при остановке приложения)."""
        for p in self.providers:
            try:
                await p.client.close()
            except Exception:
                pass

    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        fast: bool = False,
        prefer=None,   # str | list[str] | None — см. LLMRegistry._order/TASK_ROUTES
        reasoning_effort: Optional[str] = None,
        timeout: Optional[float] = None,
    ) -> AsyncIterator[str]:
        """Стрим токенов. Фолбэк на другого провайдера возможен только до первого
        отданного чанка; после — ошибка просто обрывает поток."""
        provider_errors: List[str] = []
        n = len(self.providers)
        order = self._order(prefer)

        for idx in order:
            provider = self.providers[idx]
            if not provider.api_key or provider.api_key == "your_groq_api_key_here":
                continue

            started = False
            try:
                logger.info(f"Streaming with {provider.name} (fast={fast})...")
                async with aclosing(provider.generate_stream(
                    messages, max_tokens=max_tokens, temperature=temperature, fast=fast,
                    reasoning_effort=reasoning_effort, timeout=timeout,
                )) as pstream:
                    async for delta in pstream:
                        started = True
                        yield delta
                return
            except Exception as e:
                if started:
                    logger.error(f"Stream from {provider.name} broke mid-response: {e}")
                    return
                msg = str(e).lower()
                if not prefer and any(kw in msg for kw in ("429", "rate limit", "rate_limit", "too many requests", "quota")):
                    self._start_idx = (idx + 1) % n
                provider_errors.append(f"{provider.name}: {e}")
                logger.warning(f"Stream provider {provider.name} failed before first chunk: {e}")
                continue

        raise RuntimeError(f"All LLM providers failed (stream). Errors: [{' | '.join(provider_errors)}]")


llm_registry = LLMRegistry()
