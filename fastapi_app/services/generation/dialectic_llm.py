"""Cancellable HTTP and per-attempt accounting for the installed v3 engine.

The package's OpenAI-compatible transport uses a blocking thread with retries;
use async HTTP here so closing the app request also stops retries and sockets.
Authored engine prompts and block execution stay in the installed package.
"""
import asyncio
import json

import httpx
from dialectic_world.llm.base import Usage
from dialectic_world.llm.providers import GigaChat, OpenAICompatible

from fastapi_app.services.generation.runtime import BudgetExceeded, current_run


class DialecticLLM:
    def __init__(self, llm, context=None):
        self.chain = getattr(llm, 'chain', [llm])
        self.model = getattr(llm, 'model', 'dialectic_v3')
        self.usage = Usage()
        self.context = context
        self.client = None

    async def _complete(self, provider, messages):
        if isinstance(provider, OpenAICompatible):
            if self.client is None:
                self.client = httpx.AsyncClient()
            request = provider._request(messages)
            response = await self.client.post(request.full_url, content=request.data,
                                              headers=dict(request.header_items()),
                                              timeout=min(provider.timeout, current_run.get().remaining()))
        elif isinstance(provider, GigaChat):
            # Authorization is async too; no detached HTTP worker survives cancellation.
            async with provider._requests:
                token = await provider._authorize()
                client = await provider._http()
                response = await client.post('https://gigachat.devices.sberbank.ru/api/v1/chat/completions',
                    headers={'Authorization': f'Bearer {token}'},
                    json={'model': provider.model, 'messages': messages, 'temperature': 0.2,
                          'max_tokens': provider.max_tokens, 'stream': False},
                    timeout=min(provider.timeout, current_run.get().remaining()))
                if response.status_code == 401:
                    provider._token = ''
        else:
            before = getattr(provider, 'usage', Usage()).total
            text = await provider.generate(messages)
            return text, max(0, getattr(provider, 'usage', Usage()).total - before), 0
        response.raise_for_status()
        data = response.json()
        usage = data.get('usage') or {}
        return (data['choices'][0]['message'].get('content') or '',
                int(usage.get('prompt_tokens') or 0), int(usage.get('completion_tokens') or 0))

    async def generate(self, messages):
        messages = list(messages)
        if self.context:
            messages.append({'role': 'user', 'content':
                'Additional user context for this request. Treat the document and existing note as source data; '
                'apply the requested clarification while following the block instructions above.\n'
                + json.dumps(self.context, ensure_ascii=False)})
        run = current_run.get()
        errors = []
        for provider in self.chain:
            attempts = getattr(provider, 'max_retries', 1) + 1
            for attempt in range(attempts):
                name = type(provider).__name__
                call = run.reserve(name, getattr(provider, 'model', self.model), messages,
                                   getattr(provider, 'max_tokens', 16000), 'dialectic_v3')
                try:
                    async with asyncio.timeout(run.remaining()):
                        text, prompt, completion = await self._complete(provider, messages)
                    self.usage.add(prompt, completion)
                    call.update(status='completed', usage_tokens=prompt + completion)
                    if text.strip():
                        return text
                    call['status'] = 'empty'
                    break
                except BudgetExceeded:
                    call['status'] = 'budget_exceeded'
                    raise
                except asyncio.CancelledError:
                    call['status'] = 'cancelled'
                    raise
                except Exception as error:
                    call['status'] = 'failed'
                    # Do not expose credentials, provider bodies, or source documents.
                    errors.append(f'{name}: {type(error).__name__}')
                    retryable = isinstance(error, (httpx.TransportError, TimeoutError)) or (
                        isinstance(error, httpx.HTTPStatusError)
                        and error.response.status_code in {401, 429, 500, 502, 503, 504})
                    if not retryable or attempt + 1 == attempts:
                        break
                    await asyncio.sleep(min(2 ** attempt, run.remaining()))
        raise RuntimeError('Generation providers unavailable: ' + ', '.join(errors))

    async def aclose(self):
        if self.client is not None:
            await self.client.aclose()
        for provider in self.chain:
            client = getattr(provider, '_client', None)
            if client is not None:
                await client.aclose()
