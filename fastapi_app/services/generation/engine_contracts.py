"""Application adapters for the authored opposition, contradiction and leap contracts.

The installed package's parsers discard branches and accept empty evidence. Keep
its prompt files intact and enforce their response contracts at this boundary.
"""
import json

from dialectic_world.builder.blocks import FormError, ask, p0_text, p0_explanation_text, opposite_text
from dialectic_world.builder.prompts import load_prompt
from dialectic_world.world.model import OppositionCheck, Process, Contradiction, Resolution, new_id
from pydantic import BaseModel, Field


class OppositionBranch(BaseModel):
    opposite: Process
    explanation: dict = Field(default_factory=dict)
    confirmed: bool = True
    contradiction: Contradiction | None = None
    resolution: Resolution | None = None
    stop_reason: str = ''


def required(data, *path):
    value = data
    for key in path:
        value = value.get(key) if isinstance(value, dict) else None
    if not isinstance(value, str) or not value.strip():
        raise FormError('.'.join(path) + ': nonempty text required')
    return value.strip()


def inputs(ctx, world, extra_context):
    return dict(subject=world.domain, p0=p0_text(world.p0, ctx.settings.prompt_language),
        p0_explanation=p0_explanation_text(world.p0_explanation, ctx.settings.prompt_language),
        iterations='\n\n'.join(json.dumps(it.raw, ensure_ascii=False) for it in world.iterations),
        context=extra_context or '(none)')


def exact_records(data, field, key, expected):
    records = data.get(field)
    if not isinstance(records, list) or any(not isinstance(r, dict) for r in records):
        raise FormError(field + ': list of objects required')
    refs = [r.get(key) for r in records]
    if any(not isinstance(ref, str) for ref in refs) or len(refs) != len(set(refs)) or set(refs) != set(expected):
        raise FormError(field + ': must cover the supplied references exactly once')
    return records


def validate_comparison(data, world):
    refs = {f'I{it.n}.P{i}': (it, i) for it in world.iterations for i in range(1, len(it.developing) + 1)}
    for row in exact_records(data, 'development_steps', 'process_ref', refs):
        it, i = refs[row['process_ref']]
        for key in ('process', 'base_before', 'increment', 'base_after', 'reveals_about_p0', 'practical_change'):
            required(row, key)
        basis = row.get('development_base')
        if (not isinstance(basis, dict) or basis.get('p0') is not True
                or basis.get('previous_iteration_as_whole') != it.based_on_iteration
                or basis.get('current_iteration_processes') != [f'I{it.n}.P{j}' for j in range(1, i)]):
            raise FormError('Comparison development_base must match the supplied iteration')
    for row in exact_records(data, 'relations_to_p0', 'process_ref', refs):
        for key in ('process', 'p0_role', 'p0_role_change', 'practical_test'):
            required(row, key)
        for key in ('p0_required_for_origin', 'p0_required_for_further_development'):
            value = row.get(key)
            if type(value) is not bool and value != 'uncertain':
                raise FormError(key + ': boolean or uncertain required')
    relations = data.get('relations_between_processes')
    if not isinstance(relations, list):
        raise FormError('relations_between_processes: list required')
    for row in relations:
        if required(row, 'process_a') not in refs or required(row, 'process_b') not in refs:
            raise FormError('Relation must refer to supplied processes')
        for key in ('relation', 'effect_on_development', 'practical_significance'):
            required(row, key)
    patterns = data.get('iteration_patterns')
    numbers = [it.n for it in world.iterations]
    if (not isinstance(patterns, list) or any(not isinstance(p, dict) or type(p.get('iteration')) is not int for p in patterns)
            or sorted(p['iteration'] for p in patterns) != sorted(numbers)):
        raise FormError('iteration_patterns must cover each supplied iteration exactly once')
    for row in patterns:
        for key in ('p0_role_at_start', 'p0_role_at_end', 'development_pattern', 'practical_result'):
            required(row, key)
    cross = data.get('cross_iteration_development')
    if not isinstance(cross, list) or any(not isinstance(row, dict) for row in cross):
        raise FormError('cross_iteration_development: list required')
    pairs = [(row.get('from_iteration'), row.get('to_iteration')) for row in cross]
    if any(type(number) is not int for pair in pairs for number in pair) or sorted(pairs) != list(zip(numbers, numbers[1:])):
        raise FormError('Cross-iteration analysis must cover each transition between supplied iterations')
    for row in cross:
        for key in ('previous_iteration_result', 'new_iteration_result', 'development_difference', 'change_in_p0_role', 'practical_meaning'):
            required(row, key)
    for row in data.get('opposition_candidates', []):
        for key in ('process', 'reason_for_check', 'p0_dependency_change', 'practical_basis'):
            required(row, key)


async def check_opposition(ctx, world, candidates, extra_context=''):
    refs = [c['process_ref'] for c in candidates]
    prompt = load_prompt('4', ctx.settings.prompt_language, **inputs(ctx, world, extra_context),
        comparison=json.dumps(world.comparisons[-1].raw if world.comparisons else {}, ensure_ascii=False),
        opposition_candidates=json.dumps(candidates, ensure_ascii=False))

    def parse(data):
        if data.get('status') != 'OPPOSITION_CHECK_COMPLETED':
            raise FormError('Expected OPPOSITION_CHECK_COMPLETED for supplied candidates')
        checks = exact_records(data, 'candidate_checks', 'process_ref', refs)
        for c in checks:
            if c.get('result') not in ('OPPOSITE', 'NOT_OPPOSITE', 'UNDETERMINED'):
                raise FormError('Invalid opposition verdict')
            required(c, 'reason')
            for section in ('shared_content', 'difference', 'exclusion_of_p0'):
                if not isinstance(c.get(section), dict) or c[section].get('status') not in (
                        'ESTABLISHED', 'NOT_ESTABLISHED', 'UNCERTAIN'):
                    raise FormError(section + ': invalid status')
            if c['result'] == 'OPPOSITE':
                required(c, 'origin_in_p0_development')
                for path in (('shared_content', 'content'), ('shared_content', 'practical_basis'),
                             ('difference', 'description'), ('difference', 'practical_basis'),
                             ('replacement', 'what_is_replaced'), ('replacement', 'how'),
                             ('replacement', 'practical_basis'), ('exclusion_of_p0', 'description')):
                    required(c, *path)
                if c['replacement'].get('p0_still_required') is not False or any(
                    c[s]['status'] != 'ESTABLISHED' for s in ('shared_content', 'difference', 'exclusion_of_p0')):
                    raise FormError('OPPOSITE requires established evidence and p0_still_required=false')
        confirmed = exact_records(data, 'confirmed_opposites', 'process_ref',
                                  [c['process_ref'] for c in checks if c['result'] == 'OPPOSITE'])
        for c in confirmed:
            for key in ('process', 'shared_content_with_p0', 'difference_from_p0',
                        'replacement_of_p0', 'exclusion_of_p0'):
                required(c, key)
        return OppositionCheck(candidate_checks=checks, confirmed_opposites=confirmed, raw=data)

    return await ask(ctx, 'CheckOpposition', prompt, parse)


async def form_contradiction(ctx, world, opposite, explanation, extra_context='', supplied=None):
    prompt = load_prompt('5', ctx.settings.prompt_language, **inputs(ctx, world, extra_context),
        comparison=json.dumps(world.comparisons[-1].raw if world.comparisons else {}, ensure_ascii=False),
        opposition_result=json.dumps(world.opposition_checks[-1].raw if world.opposition_checks else {}, ensure_ascii=False),
        confirmed_opposites=json.dumps([explanation], ensure_ascii=False))
    if supplied is not None:
        prompt += ('\nReview the user-supplied contradiction below against these same rules. '
                   'Do not replace or rewrite it. Return CONTRADICTION_UNDETERMINED if it is not '
                   'substantiated. For a formed result, copy its text exactly into contradiction.\n'
                   + json.dumps({'supplied_contradiction': supplied}, ensure_ascii=False))

    def parse(data):
        if data.get('status') == 'CONTRADICTION_FORMATION_FAILED':
            required(data, 'failure_reason')
            world.stage_failures.append({'stage': 4, 'process_ref': explanation['process_ref'], 'answer': data})
            return None
        if data.get('status') != 'CONTRADICTIONS_FORMED':
            raise FormError('Expected CONTRADICTIONS_FORMED')
        c = exact_records(data, 'contradictions', 'opposite_ref', [explanation['process_ref']])[0]
        if c.get('status') == 'CONTRADICTION_UNDETERMINED':
            required(c, 'uncertainty')
            world.stage_failures.append({'stage': 4, 'process_ref': explanation['process_ref'], 'answer': data})
            return None
        if c.get('status') != 'CONTRADICTION_FORMED':
            raise FormError('Invalid contradiction status')
        statement = required(c, 'contradiction')
        if supplied is not None and statement != supplied.strip():
            raise FormError('Validation must preserve the supplied contradiction verbatim')
        for path in (('development_path', 'origin'), ('development_path', 'development'),
                     ('development_path', 'emergence_of_opposite'), ('unity', 'shared_content'),
                     ('unity', 'practical_basis'), ('difference', 'description'),
                     ('difference', 'practical_basis'), ('exclusion', 'description'),
                     ('exclusion', 'not_destruction'), ('practical_manifestation',)):
            required(c, *path)
        process = world.add(Process(id=new_id('C'), source=world.p0.statement, target=opposite.statement,
            statement=statement, role='contradiction', derived_from=[world.p0.id, opposite.id]))
        return Contradiction(process_id=process.id, unity=c['unity']['shared_content'], raw=c)

    return await ask(ctx, 'FormContradiction', prompt, parse)


async def resolve_leap(ctx, world, opposite, explanation, extra_context=''):
    prompt = load_prompt('6', ctx.settings.prompt_language, **inputs(ctx, world, extra_context),
        opposite=opposite_text(opposite, explanation),
        contradiction=json.dumps(world.contradiction.raw, ensure_ascii=False),
        previous_results=json.dumps({'comparison': world.comparisons[-1].raw if world.comparisons else {},
            'opposition_check': world.opposition_checks[-1].raw if world.opposition_checks else {}}, ensure_ascii=False))

    def parse(data):
        status = data.get('status')
        if status in ('LEAP_NOT_FOUND', 'NO_CONTRADICTION'):
            required(data, 'failure_reason')
            if data.get('leap') is not None or data.get('next_cycle') is not None:
                raise FormError('An unresolved result cannot declare a leap or next cycle')
            world.stage_failures.append({'stage': 5, 'process_ref': explanation['process_ref'], 'answer': data})
            return None
        kind = {'CONTRADICTION_RESOLVED': 'REPLACEMENT', 'CONTRADICTION_MEDIATED': 'MEDIATION'}.get(status)
        leap = data.get('leap')
        if kind is None or not isinstance(leap, dict) or leap.get('type') != kind:
            raise FormError('Resolution status and leap type must agree')
        for key in ('process', 'emerges_from_contradiction', 'practical_basis'):
            required(leap, key)
        if kind == 'REPLACEMENT':
            for key in ('p0_content_transformed', 'opposite_content_transformed', 'new_unity'):
                required(leap, key)
            required(leap, 'replacement', 'explanation')
            if (leap['replacement'].get('replaces_p0') is not True
                    or leap['replacement'].get('replaces_opposite') is not True
                    or data.get('previous_p0_status') != 'CONFIRMED_P0'):
                raise FormError('Replacement must replace both sides and confirm P0')
            required(data, 'next_cycle', 'candidate_p0')
            if data['next_cycle'].get('basis') != 'RESULT_OF_LEAP':
                raise FormError('Invalid basis for next cycle')
        else:
            for key in ('preserves_p0', 'preserves_opposite', 'changes_contradiction', 'enables_further_development'):
                required(leap, key)
            if data.get('previous_p0_status') != 'NOT_YET_CONFIRMED' or data.get('next_cycle') is not None:
                raise FormError('Mediation cannot confirm P0 or start a replacement cycle')
        process = world.add(Process(id=new_id('R'), source=world.p0.statement, target=opposite.statement,
            statement=leap['process'], role='resolution', derived_from=[world.contradiction.process_id]))
        return Resolution(process_id=process.id, kind=kind.lower(), explanation=leap['practical_basis'], raw=data)

    return await ask(ctx, 'ResolveLeap', prompt, parse)


def set_opposites(world, check):
    branches = []
    for confirmed in check.confirmed_opposites:
        n, position = (int(part[1:]) for part in confirmed['process_ref'].split('.'))
        iteration = next(it for it in world.iterations if it.n == n)
        branches.append(OppositionBranch(opposite=world.get(iteration.developing[position - 1]), explanation=confirmed))
    world.branches = branches
    if branches:
        select_branch(world, branches[0])


def select_branch(world, branch):
    world.opposite, world.opposite_explanation = branch.opposite, branch.explanation
    world.contradiction, world.resolution = branch.contradiction, branch.resolution


async def confirm_supplied_opposites(ctx, world, extra):
    pending = [b for b in world.branches if not b.confirmed]
    if not pending:
        return
    candidates = [{'process_ref': b.explanation['process_ref'], 'process': b.opposite.statement} for b in pending]
    check = await check_opposition(ctx, world, candidates, extra_context=extra)
    world.opposition_checks.append(check)
    confirmed = {c['process_ref']: c for c in check.confirmed_opposites}
    if set(confirmed) != {c['process_ref'] for c in candidates}:
        raise ValueError('Противоположность в заполненном шаге 3 не подтверждена. Проверьте предыдущие шаги.')
    for branch in pending:
        branch.explanation = confirmed[branch.explanation['process_ref']]
        branch.confirmed = True


async def finish_branches(ctx, world, target, extra, preserve_predecessors=False):
    if preserve_predecessors and target == 5 and any(b.contradiction is None for b in world.branches):
        raise ValueError('Сначала заполните шаг 4 для каждой подтверждённой противоположности.')
    await confirm_supplied_opposites(ctx, world, extra)
    if not world.branches:
        raise ValueError('Нет подтверждённой противоположности для продолжения.')
    for branch in world.branches:
        select_branch(world, branch)
        existing = branch.contradiction
        if existing is None or existing.raw.get('source') == 'existing_note':
            supplied = world.get(existing.process_id).statement if existing else None
            branch.contradiction = await form_contradiction(ctx, world, branch.opposite,
                branch.explanation, extra_context=extra, supplied=supplied)
        if branch.contradiction is None:
            branch.stop_reason = 'contradiction_not_formed'
            continue
        world.contradiction = branch.contradiction
        if target == 5:
            branch.resolution = await resolve_leap(ctx, world, branch.opposite, branch.explanation, extra_context=extra)
            if branch.resolution is None:
                branch.stop_reason = 'leap_not_found'
    select_branch(world, world.branches[0])
    if any(b.stop_reason for b in world.branches):
        world.status, world.stop_reason = 'leap_not_found', 'incomplete_branches'
    elif target == 4:
        world.status = 'built'
    else:
        world.status = 'mediated' if any(b.resolution.kind == 'mediation' for b in world.branches) else 'built'
