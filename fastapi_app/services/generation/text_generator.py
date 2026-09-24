from fastapi_app.config import settings
from fastapi_app.services.generation.json_contract import parse_object
from fastapi_app.services.context_builder import thesis_for_key, _detect_domain
from fastapi_app.services.generation.common import _MAX_TOKENS, _fix_math, _NUMBER_UNIT_RE
from fastapi_app.services.generation.contracts import Postprocess
from fastapi_app.services.generation.runtime import BudgetExceeded, GenerationError


class TextGenerator:
    def __init__(self, ai, builder, sanitizer):
        self.ai, self.builder, self.sanitizer = ai, builder, sanitizer

    async def json_text(self, prompt, message, key, cap):
        for _ in range(2):
            try:
                raw = await self.ai._generate(
                    prompt, message, None, max_tokens=cap, temperature=0.4,
                    use_cache=False, task='step_stream',
                    reasoning_effort=settings.LLM_REASONING_EFFORT_GEN, timeout=settings.LLM_TIMEOUT_GEN)
                parsed = parse_object(raw)
                value = parsed.get(key) if isinstance(parsed, dict) else None
                if isinstance(value, str) and value.strip():
                    return _fix_math(value.strip())
            except BudgetExceeded:
                raise
            except (ValueError, TypeError, GenerationError):
                pass
        raise GenerationError('invalid_text', 'Model did not return the requested text block')

    async def process(self, state, key, skeleton, locale, *, reason='', question=None):
        base = int(key.split('.')[0])
        if '.' in key:
            prompt = await self.builder.build_process_prompt(state, key, skeleton)
            output_key, message = 'process', f'Генерируй процесс. Язык: {locale}'
            if question:
                prompt += f'\nУТОЧНЕНИЕ ПОЛЬЗОВАТЕЛЯ: {question}\n'
        else:
            prompt = await self.builder.build_step_prompt(state, base, question=question, skeleton=skeleton)
            thesis = thesis_for_key(skeleton, key)
            if thesis:
                prompt += f'\nРЕКОМЕНДУЕМЫЙ ТЕЗИС ОТ АРХИТЕКТОРА: {thesis}\n'
            output_key, message = f'step{base}', f'Генерируй шаг {base}. Язык: {locale}'
        if question and state.get('_question_source'):
            prompt += f'\nИСХОДНЫЙ ТЕКСТ, К КОТОРОМУ ЗАДАН ВОПРОС:\n{state["_question_source"]}\n'
        if reason:
            prompt += f'\nЗАМЕЧАНИЕ СУДЬИ: {reason}\nИСПРАВЛЯЕМЫЙ ТЕКСТ:\n{state.get("_process_texts", {}).get(key, "")}\n'
        cap = _MAX_TOKENS['step5' if base == 5 else 'step']
        text = await self.json_text(prompt, message, output_key, cap)
        if base == 5 and _detect_domain(skeleton.get('goal_as_process', ''), text) == 'math_code' and not _NUMBER_UNIT_RE.search(text):
            prompt += '\nДоведи разрешение до конкретного числового примера с единицей измерения.\n'
            text = await self.json_text(prompt, message, output_key, cap)
        return text

    async def postprocess(self, state, collected, locale):
        try:
            prompt = await self.builder.build_titles_meta_prompt(state, collected)
            raw = await self.ai._generate(
                prompt, f'Верни JSON {{titles, note_title, anchor_title, anchor_summary}}. Язык: {locale}',
                {'type': 'json_object'}, max_tokens=_MAX_TOKENS['history'], temperature=0.4,
                use_cache=False, fast=True, task='history')
            parsed = Postprocess.model_validate(parse_object(raw))
            return ({k: v for k, v in parsed.titles.items() if k in collected},
                    {k: getattr(parsed, k) for k in ('note_title', 'anchor_title', 'anchor_summary') if getattr(parsed, k)})
        except BudgetExceeded:
            raise
        except (ValueError, TypeError, GenerationError):
            return {}, {}
