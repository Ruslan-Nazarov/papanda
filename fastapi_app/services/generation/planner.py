from fastapi_app.config import settings
from fastapi_app.services.generation.json_contract import parse_object
from fastapi_app.services.llm_provider import get_last_call_info
from fastapi_app.services.generation.common import _MAX_PLAN_ATTEMPTS, _MAX_STAGE_RETRIES, _STAGE_MAX_TOKENS
from fastapi_app.services.generation.contracts import (
    FirstStage, SecondStage, Opposite, Contradiction, Resolution, StageVerdict,
)
from fastapi_app.services.generation.runtime import BudgetExceeded, GenerationError


class Planner:
    def __init__(self, ai, builder, sanitizer):
        self.ai, self.builder, self.sanitizer = ai, builder, sanitizer

    async def _json(self, prompt, message, schema, *, field=None, validation=False, exclude=()):
        try:
            raw = await self.ai._generate(
                prompt, message, None, max_tokens=_STAGE_MAX_TOKENS, temperature=0.3,
                use_cache=False, task='plan_validate' if validation else 'skeleton',
                exclude_models=exclude, reasoning_effort=settings.LLM_REASONING_EFFORT_SKELETON,
            )
            parsed = parse_object(raw)
            value = parsed.get(field) if field and isinstance(parsed, dict) else parsed
            return schema.model_validate(value).model_dump()
        except BudgetExceeded:
            raise
        except (ValueError, TypeError, AttributeError, GenerationError):
            return None

    async def plan(self, state, locale, failed_attempts=()):
        rejected_first = [{'thesis': a.get('thesis1', ''), 'reason': a.get('reason', '')}
                          for a in failed_attempts]
        for _ in range(_MAX_PLAN_ATTEMPTS):
            accepted, goal, applicable_reason = {}, '', ''
            for stage in range(1, 6):
                rejected = rejected_first if stage == 1 else []
                for _ in range(_MAX_STAGE_RETRIES):
                    prompt = await self._prompt(stage, state, accepted, goal, rejected)
                    schema = {1: FirstStage, 2: SecondStage, 3: Opposite, 4: Contradiction, 5: Resolution}[stage]
                    result = await self._json(prompt, f'Выполни Шаг {stage}. Верни только JSON. Язык: {locale}',
                                              schema, field=f'step{stage}' if stage > 2 else None)
                    if result is None:
                        rejected.append({'thesis': '?', 'blocks': [], 'reason': 'Неверный контракт JSON'})
                        continue
                    if stage == 1:
                        if result['applicable'] is False:
                            return result
                        goal, applicable_reason = result['goal_as_process'], result['applicability_reason']
                        if goal.strip().lower() == state.get('target_goal', '').strip().lower():
                            rejected.append({'thesis': result['step1']['thesis'],
                                             'reason': 'Цель не переформулирована в процесс'})
                            continue
                        candidate = result['step1']
                    elif stage == 2:
                        candidate = result['blocks']
                    else:
                        candidate = result
                    model = (get_last_call_info() or {}).get('model')
                    validation_prompt = await self._validation_prompt(stage, accepted, goal, candidate)
                    verdict = await self._json(
                        validation_prompt, f'Провалидируй Шаг {stage}. Верни только JSON. Язык: {locale}',
                        StageVerdict, validation=True, exclude=(model,) if model else (),
                    )
                    if verdict and verdict['valid'] is True:
                        accepted[stage] = candidate
                        break
                    rejected.append({'thesis': candidate.get('thesis', '') if stage != 2 else '',
                                     'blocks': [b['thesis'] for b in candidate] if stage == 2 else [],
                                     'reason': verdict['reason'] if verdict else 'Проверка недоступна'})
                if stage not in accepted:
                    if 1 in accepted:
                        rejected_first.append({'thesis': accepted[1]['thesis'],
                                               'reason': f'Не удалось построить и проверить шаг {stage}'})
                    break
            if len(accepted) == 5:
                return self._assemble(accepted, goal, applicable_reason)
        raise GenerationError('plan_failed', 'Could not build a validated plan')

    async def _prompt(self, stage, state, accepted, goal, rejected):
        b = self.builder
        if stage == 1:
            return await b.build_step1_prompt(state, rejected=rejected)
        first = accepted[1]['thesis']
        if stage == 2:
            return await b.build_step2_prompt(first, goal, rejected=rejected)
        if stage == 3:
            return await b.build_step3_prompt(first, accepted[2], rejected=rejected)
        if stage == 4:
            return await b.build_step4_prompt(first, accepted[3], rejected=rejected)
        return await b.build_step5_prompt(first, accepted[3]['thesis'], accepted[4], rejected=rejected)

    async def _validation_prompt(self, stage, accepted, goal, candidate):
        b = self.builder
        if stage == 1:
            return await b.build_step1_validation_prompt(goal, candidate)
        first = accepted[1]['thesis']
        if stage == 2:
            return await b.build_step2_validation_prompt(first, goal, candidate)
        if stage == 3:
            return await b.build_step3_validation_prompt(first, accepted[2], candidate)
        if stage == 4:
            return await b.build_step4_validation_prompt(first, accepted[3]['thesis'], candidate)
        return await b.build_step5_validation_prompt(accepted[4], candidate)

    @staticmethod
    def _assemble(accepted, goal, reason):
        blocks = accepted[2]
        ids = {b['id']: f'2.{i}' for i, b in enumerate(blocks, 1)}
        entries = [{**b, **({'растёт_из': ids[b['grows_from']]} if b['grows_from'] in ids else {})}
                   for b in blocks]
        return {'applicable': True, 'applicability_reason': reason, 'goal_as_process': goal,
                'step1': {**accepted[1], 'sub_steps': []},
                'step2': {**entries[0], 'sub_steps': entries[1:]},
                **{f'step{i}': {**accepted[i], 'sub_steps': []} for i in (3, 4, 5)}}
