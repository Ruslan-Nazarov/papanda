"""Application-owned scope checks and lifecycle around dialectic_world 0.4 blocks.

Keep package files immutable. A search limit is not a substantive rejection of P0.
"""
import json
from pathlib import Path

from pydantic import Field
from dialectic_world.builder.blocks import (
    Context, FormError, ask, p0_text, p0_explanation_text,
)
from dialectic_world.builder.prompts import load_prompt
from dialectic_world.world.model import World, Process, ComparisonRecord
from fastapi_app.services.generation.development import build_development, DevelopmentUnavailable
from fastapi_app.services.generation.engine_contracts import OppositionBranch, check_opposition, set_opposites, finish_branches, validate_comparison


PROMPTS = Path(__file__).resolve().parents[3] / "prompts" / "engine_scope"


class ScopedWorld(World):
    stop_reason: str = ""
    scope_checks: list[dict] = Field(default_factory=list)
    previous_attempts: list[dict] = Field(default_factory=list)
    development_texts: dict[str, str] = Field(default_factory=dict)
    development_reviews: list[dict] = Field(default_factory=list)
    branches: list[OppositionBranch] = Field(default_factory=list)
    presentation_texts: dict[str, str] = Field(default_factory=dict)
    stage_failures: list[dict] = Field(default_factory=list)


def instruction(name):
    return (PROMPTS / f"{name}.en.md").read_text(encoding="utf-8")


def text(data, key):
    value = data.get(key)
    if not isinstance(value, str) or not value.strip():
        raise FormError(f"{key}: nonempty string required")
    return value.strip()


def review(data, allowed):
    if not isinstance(data, dict) or data.get("status") not in allowed:
        raise FormError(f"review.status must be one of {sorted(allowed)}")
    text(data, "reason")
    return data


def context_text(domain, feedback=None):
    # Preserve the request verbatim; do not replace it with an inferred subject.
    return json.dumps({"original_request": domain, "review_feedback": feedback or {}},
                      ensure_ascii=False)


async def find_p0(ctx, world, rejected):
    lang = ctx.settings.prompt_language
    prompt = load_prompt("1", lang, subject=world.domain,
                         context=context_text(world.domain, {"rejected_candidates": rejected}))
    prompt += "\n\n" + instruction("find_p0")

    def parse(data):
        verdict = data.get("verdict")
        if verdict not in {"candidate", "not_suitable"}:
            raise FormError("verdict must be candidate or not_suitable")
        explanation = {key: text(data, key) for key in (
            "practical_link", "why_initial", "resolution_trace", "development_potential",
            "analyzed_process", "subject_preservation")}
        reason = text(data, "rejection_reason") if verdict == "not_suitable" else ""
        process = Process(id="P0", source=text(data, "from"), target=text(data, "to"),
                          statement=text(data, "statement"), role="p0")
        return process, explanation, verdict, reason

    return await ask(ctx, "FindP0", prompt, parse)


async def check_scope(ctx, world):
    prompt = instruction("check_scope") + "\n\n" + json.dumps({
        "original_request": world.domain,
        "candidate": world.p0.model_dump(), "explanation": world.p0_explanation,
    }, ensure_ascii=False)

    def parse(data):
        review(data, {"PRESERVED", "SUBSTITUTED", "INSUFFICIENT"})
        text(data, "analyzed_process")
        return data

    return await ask(ctx, "CheckScope", prompt, parse)


async def compare_development(ctx, world, feedback):
    lang = ctx.settings.prompt_language
    prompt = load_prompt("3", lang, subject=world.domain, p0=p0_text(world.p0, lang),
        p0_explanation=p0_explanation_text(world.p0_explanation, lang),
        iterations="\n\n".join(f"Iteration {it.n}:\n{json.dumps(it.raw, ensure_ascii=False)}"
                               for it in world.iterations),
        context=context_text(world.domain, feedback))
    prompt += "\n\n" + instruction("compare_development")

    def parse(data):
        if data.get('status') == 'COMPARISON_FAILED':
            text(data, 'failure_reason')
            world.stage_failures.append({'stage': 3, 'answer': data})
            return None
        if data.get("status") != "COMPARISON_COMPLETED":
            raise FormError(f"Comparison failed: {data.get('failure_reason', '')}")
        candidates = data.get("opposition_candidates")
        if not isinstance(candidates, list):
            raise FormError("opposition_candidates must be a list")
        refs = {f"I{it.n}.P{i}" for it in world.iterations
                for i in range(1, len(it.developing) + 1)}
        if data.get('iterations_analyzed') != [it.n for it in world.iterations]:
            raise FormError('Comparison must cover all supplied iterations in order')
        text(data, 'overall_development_pattern')
        seen = set()
        for candidate in candidates:
            if (not isinstance(candidate, dict) or candidate.get("process_ref") not in refs
                    or candidate.get("not_yet_proven") is not True or candidate['process_ref'] in seen):
                raise FormError("Invalid opposition candidate reference or not_yet_proven")
            seen.add(candidate['process_ref'])
        review(data.get("scope_review"), {"PRESERVED", "SUBSTITUTED", "INSUFFICIENT"})
        review(data.get("p0_assessment"), {"KEEP", "REJECT", "UNDETERMINED"})
        validate_comparison(data, world)
        return ComparisonRecord(iterations_analyzed=list(data.get("iterations_analyzed") or []),
            opposition_candidates=candidates,
            overall_development_pattern=str(data.get("overall_development_pattern") or ""), raw=data)

    return await ask(ctx, "CompareDevelopment", prompt, parse, iteration=world.iterations[-1].n)


def feedback_for(world, brief_limit):
    """Forward review evidence without duplicating the accumulated development JSON."""
    comparison = world.comparisons[-1].raw if world.comparisons else {}
    feedback = {key: comparison[key] for key in ("scope_review", "p0_assessment") if key in comparison}
    feedback["comparison"] = str(comparison.get("overall_development_pattern", ""))[:brief_limit]
    # Keep individual verdicts, including why a candidate did not replace P0.
    if world.opposition_checks:
        feedback["opposition_checks"] = [
            {"process_ref": item.get("process_ref"), "result": item.get("result"),
             "evidence": json.dumps(item, ensure_ascii=False)[:brief_limit]}
            for item in world.opposition_checks[-1].candidate_checks]
    return feedback


async def build_world(domain: str, ctx: Context, store=None):
    rejected, attempts = [], []
    world = None
    try:
        for attempt in range(1, ctx.settings.p0_attempts + 1):
            world = ScopedWorld(domain=domain, rejected_p0=list(rejected), previous_attempts=list(attempts))
            ctx.trace.event("p0_attempt", attempt=attempt)
            p0, explanation, verdict, reason = await find_p0(ctx, world, rejected)
            if verdict == "not_suitable":
                rejected.append({"p0": p0.statement, "reason": reason})
                world.rejected_p0 = list(rejected)
                world.status, world.stop_reason = "no_p0", "candidate_rejected"
                continue
            world.p0, world.p0_explanation = p0, explanation
            world.add(p0)
            scope = await check_scope(ctx, world)
            world.scope_checks.append(scope)
            if scope["status"] == "SUBSTITUTED":
                rejected.append({"p0": p0.statement, "reason": scope["reason"]})
                world.rejected_p0 = list(rejected)
                world.status, world.stop_reason = "no_p0", "subject_substituted"
                attempts.append(world.model_dump(exclude={"previous_attempts"}))
                # A rejected candidate is evidence in the attempt archive, not accepted note content.
                world.p0 = None
                world.processes.clear()
                continue
            if scope["status"] == "INSUFFICIENT":
                world.status, world.stop_reason = "no_opposite", "scope_justification_insufficient"
                break

            feedback = {}
            restart = False
            for n in range(1, ctx.settings.iterations_max + 1):
                previous = world.last_iteration()
                try:
                    iteration = await build_development(ctx, world, n, previous,
                        extra_context=context_text(domain, feedback) + "\n\n" + instruction("build_iteration"))
                except DevelopmentUnavailable as error:
                    world.status, world.stop_reason = 'no_opposite', 'development_not_established'
                    ctx.trace.event('development_unavailable', reason=str(error), iteration=n)
                    break
                world.iterations.append(iteration)
                comparison = await compare_development(ctx, world, feedback)
                if comparison is None:
                    world.status, world.stop_reason = 'no_opposite', 'comparison_not_established'
                    break
                world.comparisons.append(comparison)
                assessment = comparison.raw["p0_assessment"]
                if assessment["status"] == "REJECT":
                    rejected.append({"p0": p0.statement, "reason": assessment["reason"],
                                     "feedback": feedback_for(world, ctx.settings.brief_max_chars)})
                    world.rejected_p0 = list(rejected)
                    world.status, world.stop_reason = "no_opposite", "p0_unsuitable"
                    attempts.append(world.model_dump(exclude={"previous_attempts"}))
                    world.p0 = None
                    world.processes.clear()
                    world.iterations.clear()
                    world.development_texts.clear()
                    world.status = "no_p0"
                    restart = True
                    break
                if comparison.raw["scope_review"]["status"] != "PRESERVED":
                    # Retain the failed iteration in the trace, not in the accepted note.
                    world.iterations.pop()
                    for pid in iteration.developing:
                        world.processes.pop(pid, None)
                        world.development_texts.pop(pid, None)
                    world.status, world.stop_reason = "no_opposite", "iteration_scope_not_preserved"
                    break
                if comparison.opposition_candidates:
                    check = await check_opposition(ctx, world, comparison.opposition_candidates,
                                                  extra_context=context_text(domain, feedback))
                    world.opposition_checks.append(check)
                    if check.confirmed_opposites:
                        set_opposites(world, check)
                        await finish_branches(ctx, world, 5, context_text(domain, feedback))
                        break
                feedback = feedback_for(world, ctx.settings.brief_max_chars)
            if restart:
                continue
            if world.status == "building":
                missing_evidence = any(c.get("result") == "UNDETERMINED"
                    for check in world.opposition_checks for c in check.candidate_checks)
                world.status = "no_opposite"
                world.stop_reason = "opposition_evidence_insufficient" if missing_evidence else "iteration_limit"
            break
        return world
    except Exception as exc:
        if world is not None:
            world.status = "failed"
            ctx.trace.event("world", status="failed", error=f"{type(exc).__name__}: {exc}"[:500])
        raise
    finally:
        if world is not None:
            ctx.trace.event("world", status=world.status, reason=world.stop_reason)
            if store:
                store.save(world)
