"""Exercise actual prompts, JSON parsers, and control flow with scripted model replies."""
import json
import re

import pytest
from dialectic_world import Context, Settings
from dialectic_world.llm.base import Usage
from dialectic_world.trace import Trace
from dialectic_world.builder.blocks import BlockFailed

from fastapi_app.services.generation.scoped_dialectic_builder import build_world
from fastapi_app.services.generation.dialectic_v3_pipeline import build_generation_result


GOAL = "Как разработать устройство по ТЗ"


class ScriptedLLM:
    def __init__(self, scopes=None, assessments=None, iteration_scopes=None, opposition=None):
        self.usage = Usage()
        self.calls = []
        self.attempt, self.iteration = 0, 0
        self.scopes = scopes or ["PRESERVED"]
        self.assessments = assessments or ["KEEP"]
        self.iteration_scopes = iteration_scopes or ["PRESERVED"]
        self.opposition = opposition

    async def generate(self, messages):
        prompt = messages[0]["content"]
        block = re.search(r"\[BLOCK ([^\]]+)\]", prompt)[1]
        self.calls.append((block, prompt))
        self.usage.add(10, 10)
        if block == "FindP0":
            self.attempt += 1
            self.iteration = 0
            data = {key: f"{key} attempt {self.attempt}" for key in (
                "from", "to", "statement", "practical_link", "why_initial", "resolution_trace",
                "development_potential", "analyzed_process", "subject_preservation")}
            data["verdict"] = "candidate"
        elif block == "CheckScope":
            status = self.scopes[min(self.attempt - 1, len(self.scopes) - 1)]
            data = {"status": status, "reason": "concrete scope evidence", "analyzed_process": "development"}
        elif block == "BuildIteration":
            self.iteration += 1
            n = self.iteration
            data = {"iteration": n, "based_on_iteration": n - 1 if n > 1 else None,
                "status": "ITERATION_BUILT", "developing_processes": [{
                    "id": "P1", "process": f"development {n}", "development_relation": "relation",
                    "reveals": "content", "practical_significance": "significance", "relation_type": "type",
                    "basis": {"p0": True, "previous_iteration_as_whole": n > 1,
                              "current_iteration_processes": []}}],
                "development_chain": ["P0", "P1"], "p0_revealed_content": "content",
                "iteration_practical_integrity": "integrity"}
        elif block == "CompareDevelopment":
            assessment = self.assessments[min(self.attempt - 1, len(self.assessments) - 1)]
            scope = self.iteration_scopes[min(self.iteration - 1, len(self.iteration_scopes) - 1)]
            data = {"status": "COMPARISON_COMPLETED", "iterations_analyzed": list(range(1, self.iteration + 1)),
                "overall_development_pattern": "specific comparison feedback",
                "opposition_candidates": [{"process_ref": f"I{self.iteration}.P1", "not_yet_proven": True,
                    'process': 'candidate', 'reason_for_check': 'reason', 'p0_dependency_change': 'change', 'practical_basis': 'practice'}]
                    if self.opposition else [],
                "scope_review": {"status": scope, "reason": "iteration scope evidence"},
                "p0_assessment": {"status": assessment, "reason": "substantive P0 evidence"}}
            data.update(development_steps=[], relations_to_p0=[], relations_between_processes=[], iteration_patterns=[], cross_iteration_development=[])
            for n in range(1, self.iteration + 1):
                data['development_steps'].append({'process_ref': f'I{n}.P1', 'process': 'process',
                    'development_base': {'p0': True, 'previous_iteration_as_whole': n - 1 if n > 1 else None, 'current_iteration_processes': []},
                    **{key: key for key in ('base_before', 'increment', 'base_after', 'reveals_about_p0', 'practical_change')}})
                data['relations_to_p0'].append({'process_ref': f'I{n}.P1', 'process': 'process',
                    'p0_required_for_origin': True, 'p0_required_for_further_development': 'uncertain',
                    'p0_role': 'role', 'p0_role_change': 'change', 'practical_test': 'test'})
                data['iteration_patterns'].append({'iteration': n, **{key: key for key in (
                    'p0_role_at_start', 'p0_role_at_end', 'development_pattern', 'practical_result')}})
                if n > 1:
                    data['cross_iteration_development'].append({'from_iteration': n - 1, 'to_iteration': n,
                        **{key: key for key in ('previous_iteration_result', 'new_iteration_result', 'development_difference', 'change_in_p0_role', 'practical_meaning')}})
        elif block == "ReviewDevelopment":
            data = {"processes": [{"id": "P1", "status": "ACCEPT", "reason": "specific evidence",
                                   "content": f"Explained development {self.iteration}"}]}
        elif block == "CheckOpposition":
            ref = re.search(r'"process_ref": "(I\d+\.P\d+|manual\.step3(?:\.\d+)?)"', prompt)[1]
            data = {"status": "OPPOSITION_CHECK_COMPLETED", "candidate_checks": [{
                "process_ref": ref, "result": self.opposition,
                "origin_in_p0_development": "origin in achieved development",
                "shared_content": {"status": "ESTABLISHED", "content": "shared", "practical_basis": "practice"},
                "difference": {"status": "ESTABLISHED", "description": "difference", "practical_basis": "practice"},
                "exclusion_of_p0": {"status": "ESTABLISHED", "description": "exclusion"},
                "replacement": {"p0_still_required": self.opposition != "OPPOSITE", "what_is_replaced": "role",
                                "how": "replacement mechanism", "practical_basis": "practice"},
                "reason": "signal acquisition is still required; missing experiment"}],
                "confirmed_opposites": [{"process_ref": ref, "process": "opposite",
                    "shared_content_with_p0": "shared", "difference_from_p0": "difference",
                    "replacement_of_p0": "replacement mechanism", "exclusion_of_p0": "exclusion"}]
                    if self.opposition == "OPPOSITE" else []}
        elif block == "FormContradiction":
            confirmed_input = prompt.split('CONFIRMED OPPOSITE PROCESSES:')[1].split('CONTEXT:')[0]
            ref = re.search(r'"process_ref": "(I\d+\.P\d+|manual\.step3(?:\.\d+)?)"', confirmed_input)[1]
            supplied = re.search(r'\{"supplied_contradiction":.*', prompt)
            statement = json.JSONDecoder().raw_decode(supplied[0])[0]['supplied_contradiction'] if supplied else 'contradiction'
            data = {"status": "CONTRADICTIONS_FORMED", "contradictions": [{
                "status": "CONTRADICTION_FORMED", "opposite_ref": ref, "contradiction": statement,
                "development_path": {"origin": "origin", "development": "development", "emergence_of_opposite": "emergence"},
                "unity": {"shared_content": "unity", "practical_basis": "practical unity"},
                "difference": {"description": "difference", "practical_basis": "practical difference"},
                "exclusion": {"description": "exclusion", "not_destruction": "preservation"},
                "practical_manifestation": "manifestation"}]}
        elif block == "ResolveLeap":
            data = {"status": "CONTRADICTION_MEDIATED", "previous_p0_status": "NOT_YET_CONFIRMED", "next_cycle": None,
                "leap": {"type": "MEDIATION", "process": "mediation", "emerges_from_contradiction": "emergence",
                    "preserves_p0": "P0 preserved", "preserves_opposite": "opposite preserved",
                    "changes_contradiction": "changes", "enables_further_development": "further", "practical_basis": "practice"}}
        else:
            raise AssertionError(block)
        return json.dumps(data)


async def run(tmp_path, llm):
    ctx = Context(llm=llm, settings=Settings(prompt_language="en"), trace=Trace(tmp_path / "trace.jsonl"))
    return await build_world(GOAL, ctx)


@pytest.mark.asyncio
async def test_search_limit_retains_candidate_and_does_not_restart(tmp_path):
    llm = ScriptedLLM()
    world = await run(tmp_path, llm)
    assert world.status == "no_opposite" and world.stop_reason == "iteration_limit"
    assert len(world.iterations) == 3 and not world.rejected_p0
    assert [b for b, _ in llm.calls].count("FindP0") == 1
    assert len(llm.calls) == 11  # candidate, scope, three build/review/compare groups
    assert all(GOAL in prompt for _, prompt in llm.calls)
    assert "specific comparison feedback" in [p for b, p in llm.calls if b == "BuildIteration"][1]


@pytest.mark.asyncio
async def test_substituted_candidate_rejected_before_development(tmp_path):
    llm = ScriptedLLM(scopes=["SUBSTITUTED", "PRESERVED"])
    world = await run(tmp_path, llm)
    blocks = [b for b, _ in llm.calls]
    assert blocks[:4] == ["FindP0", "CheckScope", "FindP0", "CheckScope"]
    assert len(world.rejected_p0) == 1 and len(world.previous_attempts) == 1
    assert "concrete scope evidence" in llm.calls[2][1]
    assert world.p0.statement.endswith("attempt 2")


@pytest.mark.asyncio
async def test_insufficient_scope_justification_stops_without_development(tmp_path):
    llm = ScriptedLLM(scopes=["INSUFFICIENT"])
    world = await run(tmp_path, llm)
    assert len(llm.calls) == 2 and not world.rejected_p0 and not world.iterations
    assert world.stop_reason == "scope_justification_insufficient"
    result = build_generation_result(world, "run")
    assert result.status == "partial"
    assert result.report["scope_checks"][0]["reason"] == "concrete scope evidence"


@pytest.mark.asyncio
async def test_substantive_p0_rejection_restarts_with_review_and_preserves_attempt(tmp_path):
    llm = ScriptedLLM(assessments=["REJECT", "KEEP"])
    world = await run(tmp_path, llm)
    assert len(world.rejected_p0) == 1 and len(world.previous_attempts) == 1
    next_find = [p for b, p in llm.calls if b == "FindP0"][1]
    assert "substantive P0 evidence" in next_find and "specific comparison feedback" in next_find
    assert len(world.previous_attempts[0]["iterations"]) == 1
    assert world.p0.statement.endswith("attempt 2")


@pytest.mark.asyncio
@pytest.mark.parametrize("status", ["SUBSTITUTED", "INSUFFICIENT"])
async def test_out_of_scope_iteration_not_exported_and_p0_not_rejected(tmp_path, status):
    llm = ScriptedLLM(iteration_scopes=["PRESERVED", status])
    world = await run(tmp_path, llm)
    assert world.stop_reason == "iteration_scope_not_preserved" and not world.rejected_p0
    assert len(world.iterations) == 1
    assert len(world.processes) == 2  # P0 plus only the accepted iteration
    result = build_generation_result(world, "run")
    assert "step2.1" in result.updated_steps and "step2.2" not in result.updated_steps
    assert result.report["scope_review"]["status"] == status


@pytest.mark.asyncio
@pytest.mark.parametrize("status", ["NOT_OPPOSITE", "UNDETERMINED"])
async def test_opposition_feedback_forwarded_without_rejecting_p0(tmp_path, status):
    llm = ScriptedLLM(opposition=status)
    world = await run(tmp_path, llm)
    builds = [p for b, p in llm.calls if b == "BuildIteration"]
    assert "signal acquisition is still required" in builds[1]
    assert not world.rejected_p0 and llm.attempt == 1
    assert world.stop_reason == ("opposition_evidence_insufficient" if status == "UNDETERMINED" else "iteration_limit")


@pytest.mark.asyncio
async def test_confirmed_opposite_still_runs_contradiction_and_leap(tmp_path):
    llm = ScriptedLLM(opposition="OPPOSITE")
    world = await run(tmp_path, llm)
    assert world.status == "mediated" and world.contradiction and world.resolution
    assert [b for b, _ in llm.calls] == ["FindP0", "CheckScope", "BuildIteration", "ReviewDevelopment", "CompareDevelopment",
                                       "CheckOpposition", "FormContradiction", "ResolveLeap"]


@pytest.mark.asyncio
async def test_all_substituted_candidates_never_become_note_content(tmp_path):
    llm = ScriptedLLM(scopes=["SUBSTITUTED"])
    world = await run(tmp_path, llm)
    assert llm.attempt == 3 and len(world.rejected_p0) == 3
    assert world.p0 is None and not world.iterations and not world.processes
    assert not build_generation_result(world, "run").updated_steps
    assert all(attempt["status"] == "no_p0" for attempt in world.previous_attempts)


@pytest.mark.asyncio
@pytest.mark.parametrize("block,field", [("FindP0", "subject_preservation"),
                                         ("CheckScope", "reason"),
                                         ("CompareDevelopment", "scope_review")])
async def test_missing_review_contract_cannot_silently_bypass_check(tmp_path, block, field):
    llm = ScriptedLLM()
    original = llm.generate

    async def malformed(messages):
        data = json.loads(await original(messages))
        if f"[BLOCK {block}]" in messages[0]["content"]:
            data.pop(field, None)
        return json.dumps(data)

    llm.generate = malformed
    with pytest.raises(BlockFailed):
        await run(tmp_path, llm)
    assert [name for name, _ in llm.calls].count(block) == 3
