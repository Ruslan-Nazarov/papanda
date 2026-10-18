"""Explicit live-provider acceptance run with synthetic inputs and no application DB writes.

Run: python scripts/verify_live_ai.py --live --pipeline --output .cache/live-acceptance
The default invocation makes no requests. Results need a human semantic review;
transport completion is never recorded as proof of mathematical correctness.
"""
import argparse
import asyncio
from contextlib import aclosing
from fractions import Fraction
import json
from pathlib import Path
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from fastapi_app.config import settings
from fastapi_app.services.ai_service import AIService
from fastapi_app.services.generation.dialectic_v3_pipeline import DialecticV3Pipeline
from fastapi_app.services.generation.runtime import GenerationContext, generation_scope
from fastapi_app.services.math_suggestions import parse_suggestion


async def main(args):
    if not args.live:
        print('No requests sent. Use --live explicitly; --pipeline also runs full and step generation.')
        return
    out = Path(args.output).resolve()
    out.mkdir(parents=True, exist_ok=True)
    settings.DATA_DIR = out / 'engine-data'
    service = AIService()
    results = []

    def save():
        (out / 'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')

    async def check(name, operation, expected, calls=6, seconds=150):
        if args.only and name not in args.only:
            return None
        run = GenerationContext(max_calls=calls, deadline_seconds=seconds, max_tokens=700_000)
        started = time.monotonic()
        record = {'case': name, 'expected': expected, 'semantic_review': 'pending'}
        print(f'Start {name}', flush=True)
        try:
            async with generation_scope(run):
                response = await asyncio.wait_for(operation(), seconds)
            record.update(transport='completed', response=response)
            if isinstance(response, dict) and response.get('status') in ('failed', 'not_found'):
                record['transport'] = response['status']
            if isinstance(response, str) and response.startswith(('AI disabled:', 'Error calling AI:')):
                record['transport'] = 'failed'
        except Exception as error:
            record.update(transport='failed', error_type=type(error).__name__)
        record.update(duration_s=round(time.monotonic() - started, 2), metrics=run.metrics())
        results.append(record)
        save()
        print(json.dumps({key: record[key] for key in ('case', 'transport', 'duration_s')}, ensure_ascii=False), flush=True)
        return record.get('response')

    concept = await check('concept', lambda: service.explain_concept(
        'v_p', 'Нормировка трёх компонент', 'v_p=(9+0+9)/3=6 — дисперсия, деление на число компонент.',
        [], note_title='Среднее и дисперсия'),
        'Uses the supplied population variance definition, v_p=6 and divisor 3.')
    await check('follow_up', lambda: service.explain_concept(
        'v_p', 'Нормировка трёх компонент', 'v_p=(9+0+9)/3=6; это средний квадрат отклонений, не выборочная оценка.',
        [{'role': 'user', 'content': 'Что такое v_p?'}, {'role': 'assistant', 'content': concept or ''}],
        question='Почему здесь деление на 3, а не на 2?', note_title='Среднее и дисперсия'),
        'Explains population mean of three terms versus unbiased sample estimator; keeps divisor 3.')
    passage = {'block_id': 'definition', 'title': 'Дисперсия',
               'text': 'v_p — средний квадрат отклонений трёх компонент от среднего: (9+0+9)/3=6.'}
    suggestion_data = {'note_title': 'Нормировка', 'block_id': 'calculation', 'formula': 'v_p=6',
                       'symbol': 'v_p', 'passages': [passage]}

    async def suggest():
        raw = await service.suggest_math_definition(suggestion_data, locale='русском')
        return parse_suggestion(raw, [passage])

    await check('symbol_definition', suggest, 'Definition grounded in the provided passage with a verified quote.')
    numerator = sum((value - 5) ** 2 for value in (2, 5, 8))
    expected = str(Fraction(numerator, 3 * (6 + 3)))
    calculation = {'formula': r'\frac{(2-5)^2+(5-5)^2+(8-5)^2}{3(6+3)}=\frac{18}{27}=\frac{2}{3}',
        'note_title': 'Нормировка', 'context_before': 'Средний квадрат нормированных компонент',
        'context_after': 'S=[2,5,8], среднее 5, v_p=6, epsilon=3. Знаменатель корня sqrt(v_p+epsilon).',
        'original_formulas': [r'\frac{\sum_{i=0}^{2}(S_i-\mu)^2}{3(v_p+\varepsilon)}'],
        'math_symbols': [], 'number_definitions': [], 'note_passages': [], 'history': [], 'question': ''}

    async def calculation_answer(data):
        async with aclosing(service.explain_calculation_stream(data)) as stream:
            return ''.join([part async for part in stream])

    await check('calculation', lambda: calculation_answer(calculation),
                f'Complete steps: deviations -3,0,3; squares 9,0,9; sum 18; denominator 27; exact result {expected}.')
    await check('incorrect_calculation', lambda: calculation_answer({**calculation,
                'formula': r'\frac{18}{27}=\frac{3}{2}'}),
                f'Explicitly rejects 3/2 and derives {expected}; never rationalizes the incorrect equality.')

    if args.pipeline:
        state = {'target_goal': args.goal,
                 'steps': {}, 'reference': None}

        async def generate(data, **kwargs):
            terminal = None
            async with aclosing(DialecticV3Pipeline().stream_generate_full(data, 'ru', source_revision=1, **kwargs)) as stream:
                async for key, value in stream:
                    if key == '__terminal__':
                        terminal = value
                    else:
                        print(f'Phase: {value.get("phase", key)}', flush=True)
            return terminal

        full = await check('full_generation', lambda: generate(state),
            'Keeps the specified equation/domain, distinguishes natural and integer solutions, gives x=-4 or honestly reports an incomplete analysis.',
            calls=24, seconds=600)
        if not args.only or 'single_step' in args.only:
            steps = {'step1': full['updated_steps']['step1']} if full and full.get('updated_steps', {}).get('step1') else {
                'step1': {'content': 'Сложение натуральных чисел соединяет количества единиц. При сложении двух натуральных чисел результат снова натуральный. Для уравнения x+7=3 в натуральных числах решения нет.', 'status': 'in_progress'}}
            await check('single_step', lambda: generate({**state, 'steps': steps}, target_step=2),
                'Returns only step 2; preserves the supplied P0 and x+7=3; no rewriting of other steps.',
                calls=14, seconds=420)
    print(f'Results: {out / "results.json"}', flush=True)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--live', action='store_true')
    parser.add_argument('--pipeline', action='store_true')
    parser.add_argument('--only', nargs='+', help='Run only the named cases')
    parser.add_argument('--goal', default='Почему натуральных чисел недостаточно для решения x+7=3 и как возникает расширение до целых чисел?')
    parser.add_argument('--output', default='.cache/live-acceptance')
    asyncio.run(main(parser.parse_args()))
