"""Live, isolated document-generation audit; sends the document only to OpenAI.

No app database writes. Records request bodies without headers or credentials.
Run with --document PATH --output DIRECTORY; --base RESULT_JSON audits step 2.
"""
import argparse
import asyncio
import hashlib
import html
import json
from pathlib import Path
import re
import sys
import time
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import httpx
from dialectic_world.llm.providers import OpenAICompatible
from fastapi_app.config import settings
from fastapi_app.routers.ai import GenerationInput
from fastapi_app.services.generation import dialectic_v3_pipeline as pipeline
from fastapi_app.services.generation.dialectic_llm import DialecticLLM
from fastapi_app.services.generation.runtime import GenerationContext, GenerationError, generation_scope
from fastapi_app.services.request_document import extract_request_document


def digest(value):
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


async def audit(args):
    out = Path(args.output).resolve()
    out.mkdir(parents=True, exist_ok=True)
    source = Path(args.document)
    document = extract_request_document(source.read_bytes(), source.name)['text']
    (out / 'document.txt').write_text(document, encoding='utf-8')
    steps = json.loads(Path(args.base).read_text(encoding='utf-8'))['updated_steps'] if args.base else {}
    state = GenerationInput(target_goal=args.goal, reference=document, steps=steps).model_dump()
    steps = state['steps']  # Compare the validated request DTO, excluding UI-only fields.
    calls = []
    def save(name, value):
        (out / name).write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')

    async def response_hook(response):
        await response.aread()
        try:
            data = response.json()
            calls[-1].update(http_status=response.status_code, usage=data.get('usage'),
                finish_reason=(data.get('choices') or [{}])[0].get('finish_reason'))
        except (ValueError, IndexError):
            calls[-1]['http_status'] = response.status_code

    original = DialecticLLM._complete
    async def record(self, provider, messages):
        contexts = {}
        for message in messages:
            if message['content'].startswith('Additional user context for this request.'):
                contexts.update(json.loads(message['content'].split('\n', 1)[1]))
        block = next((m.group(1) for message in messages
                      if (m := re.search(r'\[BLOCK ([^\]]+)\]', message['content']))), '?')
        prefix = json.dumps(messages[:2], ensure_ascii=False, sort_keys=True)
        call = {'block': block, 'model': provider.model, 'status': 'running', 'messages': messages,
            'document_exact': contexts.get('reference_document') == document,
            'document_chars': len(contexts.get('reference_document', '')),
            'prefix_sha256': digest(prefix), 'existing_steps_exact': contexts.get('existing_note_steps', {}) == steps}
        calls.append(call)
        save('calls.json', calls)
        print(f'call {len(calls)} block={block} document_exact={call["document_exact"]}', flush=True)
        if self.client is None:
            self.client = httpx.AsyncClient(event_hooks={'response': [response_hook]})
        started = time.monotonic()
        try:
            text, prompt, completion = await original(self, provider, messages)
            call.update(status='completed', response=text)
            return text, prompt, completion
        except Exception as error:
            call.update(status='failed', error_type=type(error).__name__)
            raise
        finally:
            call['duration_s'] = round(time.monotonic() - started, 3)
            usage = call.get('usage') or {}
            print(f'  {call["status"]} {call["duration_s"]}s input={usage.get("prompt_tokens")} '
                  f'output={usage.get("completion_tokens")} cache={(usage.get("prompt_tokens_details") or {}).get("cached_tokens")}', flush=True)
            save('calls.json', calls)

    # One provider and bounded retries: never send the attached document to fallback services.
    class AuditProvider(OpenAICompatible):
        def _request(self, messages):
            request = super()._request(messages)
            payload = json.loads(request.data)
            if getattr(args, 'reasoning_effort', None):
                payload['reasoning_effort'] = args.reasoning_effort
            if getattr(args, 'cache_key', False):
                payload['prompt_cache_key'] = 'ecg-audit-' + digest(args.goal + document)[:32]
            request.data = json.dumps(payload).encode('utf-8')
            return request

    provider = AuditProvider(api_key=settings.OPENAI_API_KEY, base_url='https://api.openai.com/v1',
                                model=settings.DIALECTIC_OPENAI_MODEL, max_tokens=16000, max_retries=1)
    run = GenerationContext()
    kwargs = {'source_revision': 1}
    if args.base:
        kwargs.update(target_step=2, question='Уточни способ создания одноканального ЭКГ по исходному ТЗ в шаге 2, сохрани требования и неопределённые параметры.')
    settings.DATA_DIR = out / 'engine-data'
    result = None
    try:
        async with generation_scope(run):
            with patch.object(pipeline, 'build_llm', lambda spec: provider), patch.object(DialecticLLM, '_complete', record):
                async for key, value in pipeline.DialecticV3Pipeline().stream_generate_full(state, 'ru', **kwargs):
                    if key == '__terminal__':
                        result = value
                    else:
                        print(f'phase {value}', flush=True)
    except GenerationError as error:
        result = {'status': 'failed', 'error_message': str(error), 'updated_steps': {}, 'report': run.metrics()}
    save('result.json', result)
    note = '\n\n'.join(f'{key}\n{value["content"]}' for key, value in (result or {}).get('updated_steps', {}).items())
    (out / 'conspect.txt').write_text(note, encoding='utf-8')
    (out / 'conspect.html').write_text('<!doctype html><meta charset="utf-8"><title>Конспект: создание ЭКГ</title>'
        '<style>body{max-width:960px;margin:40px auto;font:18px/1.6 system-ui;white-space:pre-wrap;padding:24px}</style>'
        + html.escape(note), encoding='utf-8')
    usages = [c.get('usage') or {} for c in calls]
    prompt = sum(u.get('prompt_tokens', 0) for u in usages)
    completion = sum(u.get('completion_tokens', 0) for u in usages)
    cached = sum((u.get('prompt_tokens_details') or {}).get('cached_tokens', 0) for u in usages)
    reasoning = sum((u.get('completion_tokens_details') or {}).get('reasoning_tokens', 0) for u in usages)
    old_reserve = sum(c['reserved_tokens'] for c in run.calls)
    summary = {'goal': args.goal, 'status': (result or {}).get('status'), 'error': (result or {}).get('error_message'),
        'model': settings.DIALECTIC_OPENAI_MODEL, 'document_chars': len(document), 'document_sha256': digest(document),
        'reasoning_effort': getattr(args, 'reasoning_effort', None) or 'provider_default',
        'cache_key_enabled': getattr(args, 'cache_key', False),
        'all_documents_exact': bool(calls) and all(c['document_exact'] for c in calls),
        'stable_prefix': len({c['prefix_sha256'] for c in calls}) == 1,
        'all_existing_steps_exact': all(c['existing_steps_exact'] for c in calls),
        'prompt_tokens': prompt, 'completion_tokens': completion, 'cached_tokens': cached, 'reasoning_tokens': reasoning,
        'cost_usd_estimate': ((prompt-cached)*0.25 + cached*0.025 + completion*2)/1_000_000,
        'without_cache_usd_estimate': (prompt*0.25 + completion*2)/1_000_000,
        'old_cumulative_reservation': old_reserve, 'current_budget_charge': run.tokens_reserved,
        'configured_budget': run.max_tokens, 'metrics': run.metrics(),
        'scope': 'live local pipeline; no browser or HTTP middleware; no application DB writes; OpenAI only'}
    save('summary.json', summary)
    print(json.dumps({k:v for k,v in summary.items() if k != 'metrics'}, ensure_ascii=False, indent=2), flush=True)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--document', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--goal', default='Как разработать одноканальный ЭКГ по приложенному ТЗ')
    parser.add_argument('--base', help='Previously generated result.json for a step-2 proposal')
    parser.add_argument('--reasoning-effort', choices=['low', 'medium', 'high'], help='Experimental OpenAI request parameter; no production change')
    parser.add_argument('--cache-key', action='store_true', help='Use a stable routing key for this audit document and goal')
    asyncio.run(audit(parser.parse_args()))
