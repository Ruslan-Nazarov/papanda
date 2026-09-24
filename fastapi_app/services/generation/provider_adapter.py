"""Normalize transport outcomes and account for every physical request."""
import asyncio
from contextlib import aclosing
from contextvars import ContextVar
import time

from fastapi_app.services.generation.runtime import current_run, GenerationError
from fastapi_app.services.generation.routing import model_identity

response_info = ContextVar('provider_response', default=None)


def record_response(response):
    usage = getattr(response, 'usage', None)
    previous = response_info.get() or {}
    response_info.set({'model': getattr(response, 'model', None) or previous.get('model'),
                       'usage_tokens': getattr(usage, 'total_tokens', None) if usage is not None else previous.get('usage_tokens')})


class ProviderAdapter:
    @staticmethod
    def _start(provider, messages, kwargs, task):
        context = current_run.get()
        model = provider.fast_model_name if kwargs.get('fast') else provider.model_name
        cap = kwargs.get('max_tokens') or 4096
        kwargs['max_tokens'] = cap
        kwargs['timeout'] = min(kwargs.get('timeout') or context.remaining(), context.remaining())
        call = context.reserve(provider.name, model, messages, cap, task)
        response_info.set(None)
        return call, time.monotonic()

    @staticmethod
    def _finish(call, started, status, policy):
        info = response_info.get() or {}
        call.update(status=status, duration_s=round(time.monotonic() - started, 3))
        call['model'] = info.get('model') or call['model']
        usage = info.get('usage_tokens')
        if isinstance(usage, int) and not isinstance(usage, bool) and usage >= 0:
            call['usage_tokens'] = usage
        if status == 'completed' and model_identity(call['model']) in policy.excluded_models:
            call['status'] = 'rejected_model'
            raise GenerationError('model_policy', 'Provider returned an excluded model')

    @classmethod
    async def generate(cls, provider, messages, response_format, *, policy, task, **kwargs):
        call, started = cls._start(provider, messages, kwargs, task)
        try:
            async with asyncio.timeout(kwargs['timeout']):
                text = await provider.generate(messages, response_format, **kwargs)
            if not isinstance(text, str) or not text.strip() or text.startswith(('Error calling AI:', 'AI disabled')):
                raise GenerationError('empty_response', 'Provider returned no usable text')
        except BaseException as error:
            cls._finish(call, started, 'cancelled' if isinstance(error, asyncio.CancelledError) else 'failed', policy)
            raise
        cls._finish(call, started, 'completed', policy)
        return text

    @classmethod
    async def stream(cls, provider, messages, *, policy, task, **kwargs):
        call, started = cls._start(provider, messages, kwargs, task)
        received = False
        try:
            async with asyncio.timeout(kwargs['timeout']):
                async with aclosing(provider.generate_stream(messages, **kwargs)) as source:
                    async for delta in source:
                        if not isinstance(delta, str):
                            raise GenerationError('invalid_chunk')
                        if delta:
                            received = True
                            yield delta
            if not received:
                raise GenerationError('empty_response', 'Provider returned an empty stream')
        except BaseException as error:
            cls._finish(call, started, 'cancelled' if isinstance(error, (asyncio.CancelledError, GeneratorExit)) else 'failed', policy)
            raise
        cls._finish(call, started, 'completed', policy)
