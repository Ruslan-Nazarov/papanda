from fastapi_app.config import settings
from fastapi_app.services.generation.json_contract import parse_object
from fastapi_app.services.generation.common import _MAX_TOKENS
from fastapi_app.services.generation.contracts import JudgeResponse, JudgeVerdict
from fastapi_app.services.generation.runtime import BudgetExceeded
from fastapi_app.services.llm_provider import get_last_call_info


class Judge:
    def __init__(self, ai, builder, sanitizer):
        self.ai, self.builder, self.sanitizer = ai, builder, sanitizer

    async def evaluate(self, collected, locale, generated_models=()):
        try:
            prompt = await self.builder.build_judge_prompt(collected)
            raw = await self.ai._generate(
                prompt, f'Оцени конспект. Верни только JSON. Язык: {locale}',
                None, max_tokens=_MAX_TOKENS['judge'], temperature=0.2, use_cache=False,
                task='judge', exclude_models=generated_models,
                reasoning_effort=settings.LLM_REASONING_EFFORT_JUDGE,
            )
            parsed = JudgeResponse.model_validate(parse_object(raw))
            return JudgeVerdict(status='passed' if parsed.is_valid else 'failed',
                                reason=parsed.reason, bad_steps=parsed.bad_transitions,
                                model=(get_last_call_info() or {}).get('model'))
        except BudgetExceeded:
            raise
        except Exception:
            return JudgeVerdict(status='unavailable', reason='Judge did not return a valid independent assessment')
