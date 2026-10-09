"""A drop-in replacement for GenerationPipeline (orchestrator.py), backed by the dialectic_world v3
engine -- a separate, pip-installed package (see requirements.in) -- instead of this app's own
five-stage Planner+Judge pipeline. Selected instead of GenerationPipeline in ai_router_service.py
when Settings.GENERATION_ENGINE == "dialectic_v3".

Full builds and step proposals use the same authored six-block algorithm. A step
proposal returns only the requested step after building with the existing note as context.
"""
import asyncio
import uuid
from contextlib import aclosing
from pathlib import Path
from typing import AsyncIterator

from dialectic_world import Context, Settings as DialecticSettings
from dialectic_world.llm import build_llm
from dialectic_world.trace import Trace
from dialectic_world.world.model import World

from fastapi_app.config import settings as conspect_settings
from fastapi_app.services.generation.contracts import GenerationResult, JudgeVerdict
from fastapi_app.services.generation.runtime import current_run, GenerationContext, generation_scope, GenerationError
from fastapi_app.services.generation.dialectic_llm import DialecticLLM
from fastapi_app.services.generation.scoped_dialectic_builder import build_world
from fastapi_app.services.generation.step_builder import build_step, predecessor_steps
from fastapi_app.services.generation.block_titles import generate_titles
from fastapi_app.services.generation.development import development_content
from fastapi_app.services.generation.presentation import final_sources, explanation_paragraphs, present
from fastapi_app.services.generation.note_context import clean_steps, current_steps, source_signature, prompt_signature

_PHASE_OF = {
    "FindP0": "planning",
    "CheckScope": "judging",
    "BuildIteration": "generating",
    "ReviewDevelopment": "judging",
    "PresentNote": "postprocess",
    "CompareDevelopment": "generating",
    "CheckOpposition": "judging",
    "FormContradiction": "postprocess",
    "ResolveLeap": "postprocess",
}

_STATUS_MAP = {
    "built": "completed",
    "mediated": "completed",
    "leap_not_found": "partial",
    "no_opposite": "partial",
    "no_p0": "not_applicable",
    "failed": "failed",
}

_OUTPUT_LANGUAGE = "the language of the original user request, respecting any explicit response-language choice in it"

_LABELS = {
    "ru": {"practical_link": "Практическая связь", "why_initial": "Почему выбран исходным",
           "resolution_trace": "Признак предшествующего разрешения",
           "development_potential": "Потенциал дальнейшего развития",
           "shared_content_with_p0": "Общее с P0", "difference_from_p0": "Отличие от P0",
           "exclusion_of_p0": "Исключение необходимости P0"},
    "en": {"practical_link": "Practical link", "why_initial": "Why it is the starting point",
           "resolution_trace": "Trace of a preceding resolution",
           "development_potential": "Potential for further development",
           "shared_content_with_p0": "Shared with P0", "difference_from_p0": "Difference from P0",
           "exclusion_of_p0": "Why P0 is no longer required"},
}
_P0_KEYS = ("practical_link", "why_initial", "resolution_trace", "development_potential")


def _builder_model_spec() -> str:
    """dialectic_world's build_llm() takes a comma-separated fallback chain of "provider:model".
    Order: OpenAI (the model these prompts were developed and tested on), then GigaChat, then the
    free-tier providers conspect already uses. A link is included only if its key is configured."""
    chain = []
    if conspect_settings.OPENAI_API_KEY:
        chain.append(f"openai:{conspect_settings.DIALECTIC_OPENAI_MODEL}")
    if conspect_settings.GIGACHAT_AUTH_KEY:
        chain.append(f"gigachat:{conspect_settings.GIGACHAT_MODEL}")
    if conspect_settings.GROQ_API_KEY:
        chain.append(f"groq:{conspect_settings.GROQ_MODEL}")
    if conspect_settings.CEREBRAS_API_KEY:
        chain.append(f"cerebras:{conspect_settings.CEREBRAS_MODEL}")
    if conspect_settings.OPENROUTER_API_KEY:
        chain.append(f"openrouter:{conspect_settings.OPENROUTER_MODEL}")
    if not chain:
        raise RuntimeError("dialectic_v3 engine: no provider configured (need OPENAI_API_KEY, "
                           "GIGACHAT_AUTH_KEY, GROQ_API_KEY, CEREBRAS_API_KEY or OPENROUTER_API_KEY)")
    return ",".join(chain)


def _ensure_api_keys_in_environ() -> None:
    """dialectic_world's providers read os.getenv() directly (see its llm/providers.py); conspect
    loads the same values through pydantic-settings, which does not itself populate the process
    environment. Bridge the ones this pipeline can use so both apps see the same keys regardless of
    how conspect happens to be deployed. GigaChat differs in name: conspect calls its credential
    GIGACHAT_AUTH_KEY, dialectic_world reads GIGACHAT_CREDENTIALS."""
    import os
    pairs = [("OPENAI_API_KEY", conspect_settings.OPENAI_API_KEY),
             ("GROQ_API_KEY", conspect_settings.GROQ_API_KEY),
             ("CEREBRAS_API_KEY", conspect_settings.CEREBRAS_API_KEY),
             ("OPENROUTER_API_KEY", conspect_settings.OPENROUTER_API_KEY),
             ("GIGACHAT_CREDENTIALS", conspect_settings.GIGACHAT_AUTH_KEY),
             ("GIGACHAT_SCOPE", conspect_settings.GIGACHAT_SCOPE)]
    ca = conspect_settings.GIGACHAT_CA_BUNDLE
    if ca:
        ca_path = Path(ca)
        pairs.append(("GIGACHAT_CA_BUNDLE", str(ca_path if ca_path.is_absolute() else conspect_settings.BASE_DIR / ca_path)))
    for env_name, value in pairs:
        if value and not os.environ.get(env_name):
            os.environ[env_name] = value


def _runs_dir() -> Path:
    return Path(conspect_settings.DATA_DIR) / "dialectic_v3_runs"


def _save_world(world: World, run_id: str) -> None:
    """Keep every generated world next to its trace so a run can be inspected afterwards; the note only
    stores the flat step texts. Best effort -- never fails a generation."""
    try:
        directory = _runs_dir()
        directory.mkdir(parents=True, exist_ok=True)
        (directory / f"{run_id}.json").write_text(world.model_dump_json(indent=1), encoding="utf-8")
    except Exception:  # noqa: BLE001
        pass


def _step(content: str) -> dict:
    return {"content": content, "status": "in_progress", "author": "ai"}


def _p0_content(world: World, locale: str) -> str:
    labels = _LABELS.get(locale, _LABELS["ru"])
    parts = [world.p0.statement]
    for key in _P0_KEYS:
        value = world.p0_explanation.get(key)
        if value:
            parts.append(f"{labels[key]}: {value}")
    return "\n\n".join(parts)


def build_generation_result(world: World, run_id: str, locale: str = "ru",
                            source_revision=None) -> GenerationResult:
    status = _STATUS_MAP.get(world.status, "failed")
    updated_steps: dict = {}
    if world.p0:
        updated_steps["step1"] = _step(_p0_content(world, locale))
    if world.iterations:
        index = 0
        for iteration in world.iterations:
            for position in range(len(iteration.developing)):
                index += 1
                updated_steps[f"step2.{index}"] = _step(development_content(world, iteration, position))
    for key, source in final_sources(world).items():
        if key != 'step1':
            updated_steps[key] = _step(explanation_paragraphs(source))
    for key, content in getattr(world, 'presentation_texts', {}).items():
        if key in updated_steps:
            updated_steps[key] = _step(content)

    error_message = None
    if status == "failed":
        error_message = "Не удалось построить мир: один из блоков не дал корректный ответ в отведённое число попыток."

    return GenerationResult(run_id=run_id, status=status, source_revision=source_revision,
                            updated_steps=updated_steps,
                            replace_bases=["1", "2", "3", "4", "5"], step_titles={}, note_meta={},
                            verdict={}, judge=JudgeVerdict(),
                            report={'engine': 'dialectic_v3', 'iterations': len(world.iterations),
                                    'stop_reason': getattr(world, 'stop_reason', ''),
                                    'scope_checks': getattr(world, 'scope_checks', []),
                                    'development_reviews': getattr(world, 'development_reviews', []),
                                    'stage_failures': getattr(world, 'stage_failures', []),
                                    'branches': [{'process_ref': b.explanation.get('process_ref'),
                                                  'stop_reason': b.stop_reason}
                                                 for b in getattr(world, 'branches', [])],
                                    'scope_review': world.comparisons[-1].raw.get('scope_review', {})
                                        if world.comparisons else {}},
                            error_message=error_message)


class DialecticV3Pipeline:
    """Application lifecycle, context and document mapping around the packaged engine."""

    def __init__(self, ai_service=None, context_builder=None, sanitizer=None, rag_manager=None):
        self.rag_manager = rag_manager

    async def stream_generate_full(self, state, locale, **kwargs) -> AsyncIterator[tuple]:
        run = current_run.get() or GenerationContext(source_revision=kwargs.get('source_revision'))
        try:
            async with generation_scope(run):
                async with aclosing(self._generate(state or {}, locale, **kwargs)) as source:
                    async for event in source:
                        yield event
        except GenerationError as error:
            run.status = 'failed'
            yield '__terminal__', GenerationResult(run_id=run.run_id, status='failed',
                source_revision=kwargs.get('source_revision'), error_message=str(error),
                report=run.metrics()).model_dump()

    async def _generate(self, state, locale, **kwargs):
        source_revision = kwargs.get("source_revision")
        # sse_response() allocates the run's id in its GenerationContext and rejects a terminal result
        # carrying any other one ("Mismatched run ID"), so take it from the ambient context.
        run = current_run.get()
        run_id = run.run_id if run is not None else uuid.uuid4().hex
        domain = ((state or {}).get("target_goal") or "").strip()
        request_rules_signature = prompt_signature()
        if not domain:
            yield "__terminal__", GenerationResult(
                run_id=run_id, status="not_applicable", source_revision=source_revision, judge=JudgeVerdict(),
                error_message="Тема не указана").model_dump()
            return

        _ensure_api_keys_in_environ()
        model_spec = _builder_model_spec()
        reference = state.get('reference')
        if reference is None and self.rag_manager is not None:
            reference = await self.rag_manager.reference_for(domain)
        target = kwargs.get('target_step')
        input_steps = predecessor_steps(state, target) if target is not None else state.get('steps')
        if input_steps:
            input_steps = clean_steps(input_steps)
        additional = {key: value for key, value in {
            'reference_document': reference, 'existing_note_steps': input_steps,
            'requested_step': kwargs.get('target_step'), 'clarified_step': kwargs.get('pinned_step'),
            'user_question': kwargs.get('question'),
            'step_to_revise': clean_steps(current_steps(state, target)) if target is not None else None,
        }.items() if value is not None and value != '' and value != {}}
        llm = DialecticLLM(build_llm(model_spec), additional,
                          original_request=domain, clarification=kwargs.get('question'))
        # Authored instructions stay English; the user's request determines answer language.
        ctx = Context(llm=llm, trace=Trace(_runs_dir() / f"{run_id}.jsonl"),
                     settings=DialecticSettings(prompt_language="en", builder_model=model_spec,
                                                output_language=_OUTPUT_LANGUAGE))

        queue: asyncio.Queue = asyncio.Queue()

        async def on_event(block, data):
            await queue.put((block, data))
        ctx.on_event = on_event

        task = asyncio.create_task(build_step(domain, ctx, state, target) if target is not None
                                   else build_world(domain, ctx))
        get_task = None
        try:
            while not task.done():
                get_task = asyncio.create_task(queue.get())
                await asyncio.wait({task, get_task}, return_when=asyncio.FIRST_COMPLETED)
                if get_task.done():
                    block, _data = get_task.result()
                    yield "__status__", {"phase": _PHASE_OF.get(block, "generating")}
                else:
                    get_task.cancel()
                    await asyncio.gather(get_task, return_exceptions=True)
            while not queue.empty():
                block, _data = queue.get_nowait()
                yield "__status__", {"phase": _PHASE_OF.get(block, "generating")}
            world = await task
            title_steps = build_generation_result(world, run_id, locale, source_revision).updated_steps
            if target is not None:
                title_steps = {key: value for key, value in title_steps.items()
                               if key.removeprefix('step').split('.')[0] == str(target)}
            if title_steps:
                yield '__status__', {'phase': 'postprocess'}
            rendered = await present(ctx, world, title_steps)
            if hasattr(world, 'presentation_texts'):
                world.presentation_texts.update(rendered)
            for key, text in rendered.items():
                title_steps[key]['content'] = text
            titles = await generate_titles(ctx, title_steps)
        except GenerationError:
            raise
        except Exception as exc:  # noqa: BLE001 -- surfaced to the caller as a failed terminal result
            yield "__terminal__", GenerationResult(
                run_id=run_id, status="failed", source_revision=source_revision, judge=JudgeVerdict(),
                error_message=f"{type(exc).__name__}: {exc}").model_dump()
            return
        finally:
            pending = [t for t in (task, get_task) if t is not None]
            for pending_task in pending:
                if not pending_task.done():
                    pending_task.cancel()
            await asyncio.gather(*pending, return_exceptions=True)
            await llm.aclose()

        _save_world(world, run_id)
        result = build_generation_result(world, run_id, locale, source_revision)
        for key, text in rendered.items():
            result.updated_steps[key]['content'] = text
        result.step_titles = titles
        target = kwargs.get('target_step')
        if target is not None:
            result.updated_steps = {key: value for key, value in result.updated_steps.items()
                                    if key.removeprefix('step').split('.')[0] == str(target)}
            # Proposing one step must not delete any other steps from the student's note.
            result.replace_bases = [str(target)]
            if not result.updated_steps and result.status == 'completed':
                result.status = 'failed'
        # Keep engine JSON with the generated content so a later step can use
        # prior results without regenerating them. The frontend binds it to text.
        for base in range(1, 6):
            key = next((key for key in result.updated_steps
                        if key.removeprefix('step').split('.')[0] == str(base)), None)
            if key:
                result.updated_steps[key]['generation_data'] = {'world': world.model_dump(),
                    'source_signature': source_signature(domain, state.get('reference')),
                    'prompt_signature': request_rules_signature}
        if run is not None:
            run.status = result.status
            result.report.update(run.metrics())
        yield "__terminal__", result.model_dump()
