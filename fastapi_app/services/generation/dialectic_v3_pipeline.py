"""A drop-in replacement for GenerationPipeline (orchestrator.py), backed by the dialectic_world v3
engine -- a separate, pip-installed package (see requirements.in) -- instead of this app's own
five-stage Planner+Judge pipeline. Selected instead of GenerationPipeline in ai_router_service.py
when Settings.GENERATION_ENGINE == "dialectic_v3".

Scope (see the integration plan): only full-conspectus generation. `generate_step`/pinned-step
clarify and reference-document RAG grounding are not supported here -- callers should keep using the
legacy engine for those, matching the fallback already wired at the construction site.
"""
import asyncio
import uuid
from pathlib import Path
from typing import AsyncIterator

from dialectic_world import Context, Settings as DialecticSettings, build_world
from dialectic_world.llm import build_llm
from dialectic_world.trace import Trace
from dialectic_world.world.model import World

from fastapi_app.config import settings as conspect_settings
from fastapi_app.services.generation.contracts import GenerationResult, JudgeVerdict
from fastapi_app.services.generation.runtime import current_run

_PHASE_OF = {
    "FindP0": "planning",
    "BuildIteration": "generating",
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

_OUTPUT_LANGUAGE = {"ru": "Russian", "en": "English", "kz": "Kazakh"}

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
_OPPOSITE_KEYS = ("shared_content_with_p0", "difference_from_p0", "exclusion_of_p0")


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


def _opposite_content(world: World, locale: str) -> str:
    labels = _LABELS.get(locale, _LABELS["ru"])
    parts = [world.opposite.statement]
    for key in _OPPOSITE_KEYS:
        value = world.opposite_explanation.get(key)
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
        for i, pid in enumerate(world.iterations[-1].developing[:4], start=1):
            updated_steps[f"step2.{i}"] = _step(world.get(pid).statement)
    if world.opposite:
        updated_steps["step3"] = _step(_opposite_content(world, locale))
    if world.contradiction:
        c = world.get(world.contradiction.process_id)
        updated_steps["step4"] = _step(f"{c.statement}\n\n{world.contradiction.unity}".strip())
    if world.resolution:
        r = world.get(world.resolution.process_id)
        updated_steps["step5"] = _step(f"{r.statement}\n\n{world.resolution.explanation}".strip())

    error_message = None
    if status == "failed":
        error_message = "Не удалось построить мир: один из блоков не дал корректный ответ в отведённое число попыток."

    return GenerationResult(run_id=run_id, status=status, source_revision=source_revision,
                            updated_steps=updated_steps,
                            replace_bases=["1", "2", "3", "4", "5"], step_titles={}, note_meta={},
                            verdict={}, judge=JudgeVerdict(), report={}, error_message=error_message)


class DialecticV3Pipeline:
    """Constructor shape matches GenerationPipeline's (ConspectusRouter.__init__ calls both the same
    way) -- the four arguments are accepted and unused, since this pipeline has its own engine
    instead of reusing conspect's ai_service/context_builder/sanitizer/rag_manager."""

    def __init__(self, ai_service=None, context_builder=None, sanitizer=None, rag_manager=None):
        del ai_service, context_builder, sanitizer, rag_manager

    async def stream_generate_full(self, state, locale, **kwargs) -> AsyncIterator[tuple]:
        # target_step/pinned_step/question are not supported (see module docstring). source_revision is the
        # note revision the client sent; the client rejects a result that does not echo it back.
        source_revision = kwargs.get("source_revision")
        # sse_response() allocates the run's id in its GenerationContext and rejects a terminal result
        # carrying any other one ("Mismatched run ID"), so take it from the ambient context.
        run = current_run.get()
        run_id = run.run_id if run is not None else uuid.uuid4().hex
        domain = ((state or {}).get("target_goal") or "").strip()
        if not domain:
            yield "__terminal__", GenerationResult(
                run_id=run_id, status="not_applicable", source_revision=source_revision, judge=JudgeVerdict(),
                error_message="Тема не указана").model_dump()
            return

        _ensure_api_keys_in_environ()
        model_spec = _builder_model_spec()
        # The engine's instructions are always English; only the language of the answer follows the UI locale.
        ctx = Context(llm=build_llm(model_spec), trace=Trace(_runs_dir() / f"{run_id}.jsonl"),
                     settings=DialecticSettings(prompt_language="en", builder_model=model_spec,
                                                output_language=_OUTPUT_LANGUAGE.get(locale, "Russian")))

        queue: asyncio.Queue = asyncio.Queue()

        async def on_event(block, data):
            await queue.put((block, data))
        ctx.on_event = on_event

        task = asyncio.create_task(build_world(domain, ctx))
        while not task.done():
            get_task = asyncio.ensure_future(queue.get())
            await asyncio.wait({task, get_task}, return_when=asyncio.FIRST_COMPLETED)
            if get_task.done():
                block, _data = get_task.result()
                yield "__status__", {"phase": _PHASE_OF.get(block, "generating")}
            else:
                get_task.cancel()
        while not queue.empty():
            block, _data = queue.get_nowait()
            yield "__status__", {"phase": _PHASE_OF.get(block, "generating")}

        try:
            world = await task
        except Exception as exc:  # noqa: BLE001 -- surfaced to the caller as a failed terminal result
            yield "__terminal__", GenerationResult(
                run_id=run_id, status="failed", source_revision=source_revision, judge=JudgeVerdict(),
                error_message=f"{type(exc).__name__}: {exc}").model_dump()
            return

        _save_world(world, run_id)
        yield "__terminal__", build_generation_result(world, run_id, locale, source_revision).model_dump()
