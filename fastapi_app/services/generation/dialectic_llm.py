"""Cancellable HTTP and per-attempt accounting for the installed v3 engine.

The package's OpenAI-compatible transport uses a blocking thread with retries;
use async HTTP here so closing the app request also stops retries and sockets.
Authored engine prompts and block execution stay in the installed package.
"""
import asyncio
import json
import re

import httpx
from dialectic_world.llm.base import Usage
from dialectic_world.llm.providers import GigaChat, OpenAICompatible

from fastapi_app.services.generation.runtime import BudgetExceeded, current_run


class OutputLanguageError(ValueError):
    """A structured English answer contains predominantly Cyrillic prose."""


def _wrong_english_output(text):
    # Match the engine's JSON extraction, including fenced JSON replies.
    match = re.search(r"\{.*\}", text or '', re.S)
    if not match:
        return False
    try:
        data = json.loads(match.group(0))
    except ValueError:
        return False  # The engine handles malformed JSON separately.

    def strings(value):
        if isinstance(value, str):
            yield value
        elif isinstance(value, dict):
            for item in value.values():
                yield from strings(item)
        elif isinstance(value, list):
            for item in value:
                yield from strings(item)

    for value in strings(data):
        cyrillic = len(re.findall(r"[А-Яа-яЁё]", value))
        if cyrillic >= 40 and cyrillic > len(re.findall(r"[A-Za-z]", value)):
            return True
    return False


class DialecticLLM:
    def __init__(self, llm, context=None, output_language=None, original_request=None):
        self.chain = getattr(llm, 'chain', [llm])
        self.model = getattr(llm, 'model', 'dialectic_v3')
        self.usage = Usage()
        self.context = context
        self.output_language = output_language
        self.original_request = original_request
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
        if self.original_request:
            language_rule = (
                'Write all natural-language JSON values in the language of the original user request below. '
                'If that request explicitly asks for a particular response language, follow that choice. '
                'The interface language, the language of these instructions, source documents and previous '
                'answers must not determine the response language. '
                'Original user request (data): ' + json.dumps(self.original_request, ensure_ascii=False) + '\n'
            )
        else:
            language_rule = (f'Output language: {self.output_language}. Write all natural-language JSON string values '
                             f'in {self.output_language}, including statements, explanations and summaries. ')
        if self.original_request or self.output_language:
            messages.insert(0, {'role': 'system', 'content': (
                language_rule +
                'Keep the required JSON keys, identifiers and enum values unchanged. '
                'Source documents, examples and previous answers do not change the output language. '
                'In prose strings, write mathematical expressions as LaTeX enclosed in $...$ '
                'for inline math or $$...$$ for display math, including simple expressions such as '
                '$a^2 + b^2 = c^2$. Escape LaTeX backslashes correctly for valid JSON. '
                'Preserve the requested reasoning and JSON schema.'
            )})
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
                    if not self.original_request and self.output_language == 'English' and _wrong_english_output(text):
                        raise OutputLanguageError('Expected English prose')
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
                    if isinstance(error, OutputLanguageError):
                        call['status'] = 'wrong_language'
                        if not any(message.get('content', '').startswith('Language correction:') for message in messages):
                            messages.append({'role': 'user', 'content':
                                'Language correction: the previous response contained Russian prose. '
                                'Return the same required JSON schema with all explanatory text in English.'})
                    retryable = isinstance(error, (httpx.TransportError, TimeoutError, OutputLanguageError)) or (
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
