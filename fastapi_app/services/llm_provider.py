from abc import ABC
from contextlib import aclosing
from typing import Optional, List, Dict, AsyncIterator
from openai import AsyncOpenAI
import contextvars
import logging
import asyncio
import time
import uuid

import httpx
from fastapi_app.services.generation.provider_adapter import ProviderAdapter, record_response, response_info
from fastapi_app.services.generation.runtime import generation_scope, current_run, GenerationError, BudgetExceeded
from fastapi_app.services.generation.routing import RoutePolicy, route_for, model_identity

from fastapi_app.config import settings

logger = logging.getLogger(__name__)

_PLACEHOLDER_KEYS = {"", "your_groq_api_key_here", "dummy_key"}

# Кто обслужил последний вызов LLM в текущем запросе — чтобы генератор мог
# отличить «просел провайдер / упали на резерв» от «плохо сработал алгоритм»
# и сказать это пользователю. Contextvar: изолировано по asyncio-задаче.
_last_call: contextvars.ContextVar = contextvars.ContextVar("llm_last_call", default=None)


def get_last_call_info() -> Optional[dict]:
    """{'provider': str, 'fell_back': bool, 'rate_limited': int} последнего
    успешного вызова через LLMRegistry, либо None."""
    return _last_call.get()


def _note_call(provider_name: str, fell_back: bool, rate_limited: int = 0, model=None) -> None:
    _last_call.set({"provider": provider_name, "model": model, "fell_back": fell_back, "rate_limited": rate_limited})


def any_llm_key_configured() -> bool:
    """Живая проверка: настроен ли хоть один рабочий API-ключ LLM."""
    keys = (
        settings.GROQ_API_KEY, settings.GOOGLE_API_KEY, settings.OPENROUTER_API_KEY,
        settings.SAMBANOVA_API_KEY, settings.CEREBRAS_API_KEY, settings.HUGGINGFACE_API_KEY,
        settings.GIGACHAT_AUTH_KEY,
    )
    return any(k and k not in _PLACEHOLDER_KEYS for k in keys)


class BaseLLMProvider(ABC):
    def __init__(self, api_key: str, base_url: str, model_name: str, name: str, fast_model_name: Optional[str] = None,
                 client: Optional[AsyncOpenAI] = None):
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
        self.client = client if client is not None else AsyncOpenAI(api_key=safe_api_key, base_url=self.base_url, max_retries=0)

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
        record_response(response)
        # Некоторые OpenAI-совместимые эндпоинты (OpenRouter) на ошибке отдают
        # 200 с телом без choices — не даём этому упасть как TypeError.
        if not getattr(response, "choices", None):
            raise RuntimeError(f"{self.name}: empty choices in response ({getattr(response, 'error', response)})")
        if response.choices[0].finish_reason != 'stop':
            raise GenerationError('incomplete_response', 'Provider did not finish the response')
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
        finished = False
        # async with гарантирует закрытие HTTP-потока и при досрочном прерывании.
        async with stream:
            async for chunk in stream:
                record_response(chunk)
                choices = getattr(chunk, "choices", None)
                if not choices:
                    continue
                finish = choices[0].finish_reason
                if finish:
                    if finish != 'stop':
                        raise GenerationError('incomplete_stream', 'Provider truncated the stream')
                    finished = True
                delta = getattr(choices[0].delta, "content", None)
                if delta:
                    yield delta
        if not finished:
            raise GenerationError('incomplete_stream', 'Provider stream ended before completion')


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


_GIGACHAT_OAUTH_URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth"


class GigaChatProvider(BaseLLMProvider):
    """Сбер GigaChat. Три отличия от прочих провайдеров:

    1. Авторизация — OAuth2. `settings.GIGACHAT_AUTH_KEY` (статичный «Authorization
       Key» из ЛК) не является bearer-токеном: его меняют на `access_token`
       POST-запросом к NGW; токен живёт ~30 мин (поле `expires_at`, unix-мс).
       Кэшируем и обновляем заблаговременно.
    2. TLS — сертификат эндпоинта подписан НУЦ Минцифры, которого нет в
       системном хранилище. Проверка TLS обязательна; при необходимости задать
       `GIGACHAT_CA_BUNDLE` с russian_trusted_root_ca.pem.
    3. Сам chat-completions эндпоинт OpenAI-совместим — вызов идёт через
       общий `BaseLLMProvider.generate` / `generate_stream`.

    Потенциальный плюс для 152-ФЗ: обработка в РФ (в отличие от Cerebras/Groq/
    Google в США — сейчас это отражено в политике конфиденциальности).
    """

    def __init__(self):
        import ssl
        if not settings.GIGACHAT_VERIFY_SSL:
            raise ValueError('GIGACHAT_VERIFY_SSL=false is no longer supported; configure a trusted CA bundle')
        self._verify = ssl.create_default_context(cafile=settings.GIGACHAT_CA_BUNDLE or None)
        super().__init__(
            api_key=settings.GIGACHAT_AUTH_KEY,
            base_url="https://gigachat.devices.sberbank.ru/api/v1",
            model_name=settings.GIGACHAT_MODEL,
            name="GigaChat",
            fast_model_name=settings.GIGACHAT_FAST_MODEL,
            client=AsyncOpenAI(
                api_key='dummy_key_to_bypass_init_error',
                base_url='https://gigachat.devices.sberbank.ru/api/v1', max_retries=0,
                http_client=httpx.AsyncClient(verify=self._verify, timeout=httpx.Timeout(60.0)),
            ),
        )
        self._token: Optional[str] = None
        self._token_exp: float = 0.0            # unix-секунды, когда токен истечёт
        self._token_lock = asyncio.Lock()
        # OAuth and API use the same verified SSLContext.

    async def _ensure_token(self) -> None:
        if self._token and time.time() < self._token_exp - 60:
            return
        async with self._token_lock:
            if self._token and time.time() < self._token_exp - 60:
                return
            headers = {
                "Authorization": f"Basic {self.api_key}",
                "RqUID": str(uuid.uuid4()),
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
            }
            async with httpx.AsyncClient(verify=self._verify, timeout=30.0) as c:
                r = await c.post(
                    _GIGACHAT_OAUTH_URL, headers=headers,
                    data={"scope": settings.GIGACHAT_SCOPE},
                )
                r.raise_for_status()
                data = r.json()
            self._token = data["access_token"]
            exp_ms = data.get("expires_at") or 0
            self._token_exp = (exp_ms / 1000.0) if exp_ms else (time.time() + 25 * 60)
            self.client.api_key = self._token
            logger.info("GigaChat: got access_token, expires in %.0f min",
                        max(0.0, (self._token_exp - time.time()) / 60))

    async def generate(self, *args, **kwargs) -> str:
        await self._ensure_token()
        return await super().generate(*args, **kwargs)

    async def generate_stream(self, *args, **kwargs) -> AsyncIterator[str]:
        await self._ensure_token()
        async with aclosing(super().generate_stream(*args, **kwargs)) as stream:
            async for delta in stream:
                yield delta


from fastapi_app.services.generation.routing import TASK_ROUTES


class LLMRegistry:
    def __init__(self):
        self.providers = [GroqProvider(), CerebrasProvider(), GeminiProvider(),
                          GroqAltProvider(), OpenRouterProvider(), GigaChatProvider()]
        self._start_idx = 0

    def _order(self, prefer=None, fast=False):
        policy = prefer if isinstance(prefer, RoutePolicy) else route_for(prefer=prefer)
        order = sorted(range(len(self.providers)), key=lambda i: (
            policy.preferred.index(self.providers[i].name) if self.providers[i].name in policy.preferred
            else len(policy.preferred) + (i - self._start_idx) % max(1, len(self.providers))))
        return [i for i in order
                if (policy.allowed is None or self.providers[i].name in policy.allowed)
                and model_identity(self.providers[i].fast_model_name if fast else self.providers[i].model_name)
                not in policy.excluded_models]

    def route_fingerprint(self):
        return [(p.name, p.model_name, p.fast_model_name) for p in self.providers]

    @staticmethod
    def _rate_limited(error):
        return getattr(error, 'status_code', None) == 429 or any(
            s in str(error).lower() for s in ('429', 'rate limit', 'rate_limit', 'too many requests'))

    async def generate(self, messages, response_format=None, max_tokens=None, temperature=None,
                       fast=False, prefer=None, reasoning_effort=None, timeout=None, task=None):
        policy = prefer if isinstance(prefer, RoutePolicy) else route_for(task, prefer)
        outer = current_run.get()
        async with generation_scope() as context:
            _last_call.set(None)
            tried, rate_limited = 0, 0
            for attempt in range(3):
                retry_rate_limit = False
                for idx in self._order(policy, fast):
                    provider = self.providers[idx]
                    if provider.api_key in _PLACEHOLDER_KEYS or not provider.api_key:
                        continue
                    formats = [response_format, None] if response_format else [None]
                    for fmt in formats:
                        try:
                            result = await ProviderAdapter.generate(
                                provider, messages, fmt, policy=policy, task=task,
                                max_tokens=max_tokens, temperature=temperature, fast=fast,
                                reasoning_effort=reasoning_effort, timeout=timeout or settings.LLM_TIMEOUT)
                            model = (response_info.get() or {}).get('model') or (provider.fast_model_name if fast else provider.model_name)
                            _note_call(provider.name, tried > 0, rate_limited, model)
                            if outer is None:
                                context.status = 'completed'
                            return result
                        except BudgetExceeded:
                            raise
                        except Exception as error:
                            tried += 1
                            if self._rate_limited(error):
                                rate_limited += 1
                                retry_rate_limit = True
                                break
                            if fmt and getattr(error, 'status_code', None) == 400:
                                continue
                            break
                if not retry_rate_limit:
                    break
                if attempt < 2:
                    await asyncio.sleep(min(1.5 * (attempt + 1), context.remaining()))
            raise GenerationError('providers_unavailable', 'No allowed provider completed the request')

    async def generate_stream(self, messages, max_tokens=None, temperature=None, fast=False,
                              prefer=None, reasoning_effort=None, timeout=None, task=None):
        policy = prefer if isinstance(prefer, RoutePolicy) else route_for(task, prefer)
        outer = current_run.get()
        async with generation_scope() as context:
            _last_call.set(None)
            tried = 0
            for idx in self._order(policy, fast):
                provider = self.providers[idx]
                if provider.api_key in _PLACEHOLDER_KEYS or not provider.api_key:
                    continue
                started = False
                try:
                    async with aclosing(ProviderAdapter.stream(
                        provider, messages, policy=policy, task=task,
                        max_tokens=max_tokens, temperature=temperature, fast=fast,
                        reasoning_effort=reasoning_effort, timeout=timeout or settings.LLM_TIMEOUT,
                    )) as stream:
                        async for delta in stream:
                            started = True
                            yield delta
                    _note_call(provider.name, tried > 0, model=(response_info.get() or {}).get('model') or (provider.fast_model_name if fast else provider.model_name))
                    if outer is None:
                        context.status = 'completed'
                    return
                except BudgetExceeded:
                    raise
                except Exception as error:
                    tried += 1
                    if started:
                        raise GenerationError('incomplete_stream', 'Provider stream interrupted after content') from error
            raise GenerationError('providers_unavailable', 'No allowed provider completed the stream')

    async def aclose(self):
        for provider in self.providers:
            await provider.client.close()


llm_registry = LLMRegistry()
