r"""Offline R4 control set. No external requests; latency/usage are synthetic.

Run: .venv\Scripts\python.exe scripts/benchmark_generation.py --output docs/benchmarks/r4-generation.json
"""
import argparse
import asyncio
import json
import math
import os
from pathlib import Path
import statistics
import sys
import time
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'tests'))
for key in ('GROQ_API_KEY', 'CEREBRAS_API_KEY', 'GOOGLE_API_KEY', 'OPENROUTER_API_KEY', 'GIGACHAT_AUTH_KEY'):
    os.environ[key] = ''

from test_ai_router_judge import _stage_ok_responses, _text_response
from fastapi_app.services import ai_service as ai_module
from fastapi_app.services.ai_router_service import ConspectusRouter
from fastapi_app.services.context_builder import ContextBuilder
from fastapi_app.services.sanitizer import Sanitizer
from fastapi_app.services.llm_provider import LLMRegistry
from fastapi_app.services.generation.provider_adapter import record_response
from fastapi_app.services.generation.runtime import GenerationContext, generation_scope, current_run, GenerationError


class ControlProvider:
    def __init__(self, name, scenario):
        self.name, self.scenario = name, scenario
        self.api_key = 'offline-control-only'
        self.model_name = self.fast_model_name = name + '-mock'
        self.failed_once = False

    async def generate(self, messages, *a, **kw):
        await asyncio.sleep(0.002)
        task = current_run.get().calls[-1]['task']
        if self.scenario in {'timeout', 'cancelled'}:
            await asyncio.sleep(10)
        if self.scenario == 'rate_limit_fallback' and self.name == 'Cerebras' and not self.failed_once:
            self.failed_once = True
            error = RuntimeError('429 controlled rate limit')
            error.status_code = 429
            raise error
        record_response(SimpleNamespace(model=self.model_name, usage=SimpleNamespace(total_tokens=200)))
        if self.scenario == 'empty_response':
            return ''
        if self.scenario == 'not_applicable':
            return '{"applicable":false,"applicability_reason":"convention","goal_as_process":"name"}'
        if task == 'judge':
            return '"false"' if self.scenario == 'invalid_judge_json' else '{"is_valid":true,"reason":"control passed"}'
        if task == 'history':
            return '{}'
        message = messages[-1]['content']
        for marker, response in _stage_ok_responses('').items():
            if marker in message:
                return response
        return _text_response(message, 'offline control')

    async def generate_stream(self, *a, **kw):
        await asyncio.sleep(0.002)
        yield 'partial'
        raise GenerationError('interrupted_control')


async def once(scenario):
    registry = object.__new__(LLMRegistry)
    registry.providers = [ControlProvider(name, scenario) for name in ('GigaChat', 'Cerebras', 'Gemini')]
    registry._start_idx = 0
    context = GenerationContext(deadline_seconds=0.05 if scenario == 'timeout' else 5)
    router = ConspectusRouter(ai_module.AIService(), ContextBuilder(), Sanitizer(),
                             SimpleNamespace(reference_for=AsyncMock(return_value='')))
    status, judge = 'failed', 'unavailable'
    async def operation():
        nonlocal status, judge
        context.started = time.monotonic()
        try:
            async with generation_scope(context):
                if scenario == 'interrupted_stream':
                    _ = [s async for s in registry.generate_stream([], max_tokens=20)]
                else:
                    result = await router.route_request({'action': 'generate_full', 'context_state': {'target_goal': 'control'}})
                    status, judge = result['status'], result['judge']['status']
        except GenerationError:
            status = 'partial' if scenario == 'interrupted_stream' else 'failed'
        except asyncio.CancelledError:
            status = 'cancelled'
    started = time.perf_counter()
    with patch.object(ai_module, 'llm_registry', registry), patch.object(ai_module, 'any_llm_key_configured', return_value=True):
        work = asyncio.create_task(operation())
        if scenario == 'cancelled':
            while not context.calls:
                await asyncio.sleep(0)
            work.cancel()
        await work
    return {'status': status, 'judge': judge, 'duration_ms': round((time.perf_counter()-started)*1000, 3),
            **{k: v for k, v in context.metrics().items() if k in {'call_count', 'reserved_tokens', 'usage_tokens', 'usage_complete'}}}


async def main(output):
    scenarios = {}
    expected = {'completed': 'completed', 'not_applicable': 'not_applicable', 'rate_limit_fallback': 'completed',
                'invalid_judge_json': 'partial', 'empty_response': 'failed', 'timeout': 'failed',
                'interrupted_stream': 'partial', 'cancelled': 'cancelled'}
    for scenario, status in expected.items():
        runs = [await once(scenario) for _ in range(10)]
        assert all(run['status'] == status for run in runs), (scenario, runs)
        if scenario == 'timeout':
            assert all(run['call_count'] == 1 for run in runs)
        if status != 'completed':
            assert all(run['judge'] != 'passed' for run in runs)
        durations = sorted(run['duration_ms'] for run in runs)
        scenarios[scenario] = {'p50_ms': round(statistics.median(durations), 3),
                               'p95_ms': durations[math.ceil(len(runs)*0.95)-1], 'runs': runs}
    report = {'kind': 'offline_mock_control', 'provider_delay_ms': 2, 'mock_usage_tokens_per_response': 200,
              'warning': 'Synthetic latency/usage; not real model quality, provider latency or monetary cost.', 'scenarios': scenarios}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    for name, data in scenarios.items():
        print(name, data['p50_ms'], data['p95_ms'], data['runs'][0]['call_count'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    asyncio.run(main(parser.parse_args().output))
