from copy import deepcopy
from contextlib import aclosing
import logging

logger = logging.getLogger(__name__)

from fastapi_app.services.context_builder import expected_step_keys
from fastapi_app.services.generation.common import _base_of, _sort_key, _MAX_GENERATION_ATTEMPTS, _MIN_STEP_CHARS
from fastapi_app.services.generation.contracts import GenerationResult, JudgeVerdict
from fastapi_app.services.generation.judge import Judge
from fastapi_app.services.generation.planner import Planner
from fastapi_app.services.generation.repair import RepairPolicy
from fastapi_app.services.generation.runtime import GenerationContext, GenerationError, generation_scope, current_run
from fastapi_app.services.generation.text_generator import TextGenerator


class GenerationPipeline:
    def __init__(self, ai_service, context_builder, sanitizer, rag_manager):
        self.ai_service, self.context_builder = ai_service, context_builder
        self.sanitizer, self.rag_manager = sanitizer, rag_manager
        self.planner = Planner(ai_service, context_builder, sanitizer)
        self.generator = TextGenerator(ai_service, context_builder, sanitizer)
        self.judge = Judge(ai_service, context_builder, sanitizer)

    async def ground(self, state):
        if state.get('reference') is not None:
            return
        try:
            state['reference'] = await self.rag_manager.reference_for(state.get('target_goal', '')) or ''
        except Exception:
            logger.warning('Reference lookup unavailable; continuing without reference')
            state['reference'] = ''

    async def gen_skeleton(self, state, locale, failed_attempts=None):
        return await self.planner.plan(state, locale, failed_attempts or [])

    async def gen_json(self, prompt, message, key, max_tokens):
        return await self.generator.json_text(prompt, message, key, max_tokens)

    async def regen_process(self, state, key, skeleton, locale, **kwargs):
        return await self.generator.process(state, key, skeleton, locale, **kwargs)

    @staticmethod
    def _models(context):
        return {c['model'] for c in context.calls if c['task'] == 'step_stream' and c['status'] == 'completed'}

    @staticmethod
    def _existing_texts(state):
        values = {k.removeprefix('step'): v.get('content', '') for k, v in state.get('steps', {}).items()
                  if k.startswith('step') and isinstance(v, dict) and v.get('content')}
        return {k: v for k, v in values.items()
                if '.' in k or not any(other.startswith(k + '.') for other in values)}

    async def _fill(self, context, state, keys, locale, *, reason='', question=None, pinned=None):
        for key in keys:
            scratch = RepairPolicy.state_with_texts(state, context.collected)
            if question and pinned and _base_of(key) == str(pinned):
                scratch['_question_source'] = state.get('steps', {}).get(
                    f'step{key}', state.get('steps', {}).get(f'step{pinned}', {})
                ).get('content', '')
            text = await self.regen_process(
                scratch, key, context.plan, locale, reason=reason,
                question=question if pinned and _base_of(key) == str(pinned) else None,
            )
            context.collected[key] = text

    def _report(self, context, result, attempts, regen):
        expected = expected_step_keys(context.plan) if context.plan.get('applicable') else []
        if context.target_step:
            expected = [k for k in expected if _base_of(k) == str(context.target_step)]
        texts = context.generated_texts()
        missing = sorted(set(expected) - set(context.collected))
        reasons = []
        if missing:
            reasons.append('missing_blocks')
        if result.judge.status != 'passed':
            reasons.append('judge_unavailable' if result.judge.status == 'unavailable' else 'judge_gave_up')
        short = sum(len(v) < _MIN_STEP_CHARS for v in texts.values())
        if short:
            reasons.append('short_blocks')
        text_calls = [c for c in context.calls if c['task'] == 'step_stream' and c['status'] == 'completed']
        if any(c['provider'] != 'GigaChat' for c in text_calls):
            reasons.append('fallback_provider')
        return {**context.metrics(), 'status': result.status, 'attempts': attempts, 'regen': regen,
                'judge': result.judge.status, 'judge_reason': result.judge.reason,
                'expected_blocks': len(expected), 'got_blocks': len(texts),
                'short_blocks': short, 'missing_keys': missing,
                'gen_provider': text_calls[0]['provider'] if text_calls else None,
                'gen_fell_back': 'fallback_provider' in reasons,
                'degraded': bool(reasons), 'reasons': reasons}

    async def _operation(self, state, locale, context, *, target_step=None, pinned_step=None, question=None):
        result = GenerationResult(run_id=context.run_id, source_revision=context.source_revision, status='failed')
        attempts, regen = 0, 0
        try:
            await self.ground(state)
            rejected = []
            for attempt in range(1, (1 if target_step else _MAX_GENERATION_ATTEMPTS) + 1):
                attempts = attempt
                yield ('__status__', {'phase': 'planning', 'attempt': attempt})
                context.plan = await self.gen_skeleton(state, locale, rejected)
                if context.plan['applicable'] is False:
                    result.status = 'not_applicable'
                    result.verdict = {'applicable': False, 'reason': context.plan['applicability_reason'],
                                      **{k: context.plan[k] for k in ('type', 'plain') if k in context.plan}}
                    yield ('__not_applicable__', result.verdict)
                    break
                keys = expected_step_keys(context.plan)
                context.collected = {}
                if target_step:
                    context.collected = {k: v for k, v in self._existing_texts(state).items()
                                         if int(_base_of(k)) < target_step}
                    keys = [k for k in keys if _base_of(k) == str(target_step)]
                yield ('__status__', {'phase': 'generating', 'attempt': attempt})
                await self._fill(context, state, keys, locale, question=question, pinned=pinned_step)
                if target_step:
                    result.status = 'completed'
                    result.judge = JudgeVerdict(reason='Single-step draft; full document not assessed')
                    break
                yield ('__status__', {'phase': 'judging', 'attempt': attempt})
                result.judge = await self.judge.evaluate(context.collected, locale, self._models(context))
                if result.judge.status == 'passed':
                    result.status = 'completed'
                    break
                if result.judge.status == 'unavailable':
                    result.status = 'partial'
                    break
                repair = RepairPolicy.affected_keys(context.plan, result.judge.bad_steps)
                if repair:
                    yield ('__status__', {'phase': 'repairing', 'attempt': attempt})
                    await self._fill(context, state, repair, locale, reason=result.judge.reason)
                    regen += len(repair)
                    result.judge = await self.judge.evaluate(context.collected, locale, self._models(context))
                    if result.judge.status == 'passed':
                        result.status = 'completed'
                        break
                    if result.judge.status == 'unavailable':
                        result.status = 'partial'
                        break
                rejected.append({'thesis1': context.collected.get('1', '')[:500], 'reason': result.judge.reason})
                result.status = 'partial'
            if result.status != 'not_applicable':
                generated = {k: v for k, v in context.collected.items()
                             if target_step is None or _base_of(k) == str(target_step)}
                result.updated_steps = {f'step{k}': {'content': v, 'status': 'in_progress', 'author': 'ai'}
                                        for k, v in sorted(generated.items(), key=lambda pair: _sort_key(pair[0]))}
                result.replace_bases = [str(i) for i in range(target_step or 1, 6)]
                if not target_step and context.collected:
                    yield ('__status__', {'phase': 'postprocess', 'attempt': attempts})
                    result.step_titles, result.note_meta = await self.generator.postprocess(state, context.collected, locale)
        except GenerationError as error:
            result.status = 'partial' if context.generated_texts() else 'failed'
            result.error_message = str(error)
        except Exception:
            logger.exception('generation failed run_id=%s', context.run_id)
            result.status = 'partial' if context.generated_texts() else 'failed'
            result.error_message = 'Generation failed before completion'
        if result.status in {'partial', 'failed'} and not result.updated_steps:
            result.updated_steps = {f'step{k}': {'content': v, 'status': 'in_progress', 'author': 'ai'}
                                    for k, v in context.collected.items()
                                    if target_step is None or _base_of(k) == str(target_step)}
            result.replace_bases = [str(i) for i in range(target_step or 1, 6)]
        result.report = self._report(context, result, attempts, regen)
        context.status = result.status
        for key, value in result.updated_steps.items():
            yield key, value['content']
        if result.step_titles:
            yield '__titles__', result.step_titles
        if result.note_meta:
            yield '__note_meta__', result.note_meta
        yield '__report__', result.report
        yield '__terminal__', result.model_dump()

    async def stream_generate_full(self, state, locale, use_skeleton=True, pinned_step=None,
                                   question=None, source_revision=None, target_step=None):
        context = current_run.get() or GenerationContext(source_revision=source_revision)
        context.target_step = target_step
        try:
            async with generation_scope(context):
                async with aclosing(self._operation(
                    deepcopy(state), locale, context, target_step=target_step,
                    pinned_step=pinned_step, question=question,
                )) as operation:
                    async for event in operation:
                        yield event
        except GenerationError as error:
            context.status = 'partial' if context.generated_texts() else 'failed'
            result = GenerationResult(run_id=context.run_id, status=context.status,
                                      source_revision=context.source_revision, error_message=str(error),
                                      updated_steps={f'step{k}': {'content': v, 'status': 'in_progress', 'author': 'ai'}
                                                     for k, v in context.generated_texts().items()},
                                      replace_bases=[str(i) for i in range(target_step or 1, 6)],
                                      report=context.metrics())
            yield '__terminal__', result.model_dump()
