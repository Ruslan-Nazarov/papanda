"""Generate one note step from saved predecessors, without replaying their model calls."""
from dialectic_world.world.model import Process, IterationRecord, Contradiction
from pydantic import ValidationError
from fastapi_app.services.generation.engine_contracts import (
    OppositionBranch, check_opposition, set_opposites, finish_branches, select_branch,
)
from fastapi_app.services.generation.note_context import base, predecessor_steps, source_signature, prompt_signature, clean_steps
from fastapi_app.services.generation.development import build_development, DevelopmentUnavailable
from fastapi_app.services.generation.scoped_dialectic_builder import (
    ScopedWorld, find_p0, check_scope, compare_development, context_text, instruction,
)


def _content(steps, number):
    children = sorted((key for key in steps if key.startswith(f'step{number}.')),
                      key=lambda key: int(key.split('.')[1]))
    keys = children or [f'step{number}']
    return [(steps.get(key, {}).get('content') or '').strip() for key in keys
            if (steps.get(key, {}).get('content') or '').strip()]


def world_from_steps(domain, steps, target, reference=None):
    for number in range(1, target):
        if not _content(steps, number):
            raise ValueError(f'Сначала заполните шаг {number}. Генерация предыдущих шагов автоматически не запускается.')

    # Reuse structured results only when text, headings and annotations still match.
    # Manual edits always win over metadata saved by an earlier generation.
    rules_signature = prompt_signature()
    for key in sorted(steps, key=lambda key: (base(key), key), reverse=True):
        data = steps[key].get('generation_data') or {}
        dependencies = data.get('dependencies') or {}
        expected = {key: value.get('content', '') for key, value in steps.items()}
        expected_context = {key: {'title': value.get('title') or '',
            'stickers': [{'title': sticker.get('title') or '', 'text': sticker.get('text') or ''}
                         for sticker in value.get('stickers', [])
                         if (sticker.get('title') or '').strip() or (sticker.get('text') or '').strip()]}
            for key, value in steps.items()}
        saved_context = data.get('context_dependencies')
        # Legacy snapshots are safe only if there are no untracked annotations.
        context_matches = (saved_context == expected_context if saved_context is not None else
                           all(not item['title'] and not item['stickers'] for item in expected_context.values()))
        signature = data.get('source_signature')
        source_matches = signature == source_signature(domain, reference) if signature else reference is None
        snapshot = data.get('world')
        if (isinstance(snapshot, dict) and snapshot.get('domain') == domain and dependencies == expected
                and context_matches and source_matches and data.get('prompt_signature') == rules_signature):
            try:
                world = ScopedWorld.model_validate(data['world'])
            except (ValidationError, TypeError):
                continue  # Old or damaged engine metadata must not prevent use of the visible text.
            world.status = 'building'
            world.stop_reason = ''
            world.stage_failures = [failure for failure in world.stage_failures if failure.get('stage', 5) < target]
            world.presentation_texts = {key: text for key, text in world.presentation_texts.items() if base(key) < target}
            if target <= 2:
                world.iterations = []
                world.development_reviews = []
            if target <= 3:
                world.comparisons = []
                world.opposition_checks = []
                world.opposite = None
                world.opposite_explanation = {}
                world.branches = []
            if target <= 4:
                world.contradiction = None
            world.resolution = None
            if world.opposite and not world.branches:
                ref = world.opposite_explanation.get('process_ref')
                confirmed = any(c.get('process_ref') == ref for check in world.opposition_checks for c in check.confirmed_opposites) if ref else False
                world.branches = [OppositionBranch(opposite=world.opposite, explanation=world.opposite_explanation or
                    {'process_ref': 'manual.step3'}, confirmed=confirmed, contradiction=world.contradiction)]
            for branch in world.branches:
                if target <= 4:
                    branch.contradiction = None
                branch.resolution = None
                branch.stop_reason = ''
            retained = {world.p0.id} if world.p0 else set()
            retained.update(pid for it in world.iterations for pid in it.developing)
            if world.opposite:
                retained.add(world.opposite.id)
            if world.contradiction:
                retained.add(world.contradiction.process_id)
            for branch in world.branches:
                retained.add(branch.opposite.id)
                if branch.contradiction:
                    retained.add(branch.contradiction.process_id)
            world.processes = {pid: p for pid, p in world.processes.items() if pid in retained}
            world.development_texts = {pid: text for pid, text in world.development_texts.items() if pid in retained}
            return world

    world = ScopedWorld(domain=domain)
    if target == 1:
        return world
    # Older notes and manually authored steps have text but no engine JSON.
    # Feed that text as user-supplied data; do not invent explanations or verdicts.
    world.p0 = world.add(Process(id='P0', source='', target='',
                                statement='\n\n'.join(_content(steps, 1)), role='p0'))
    if target > 2:
        contents = _content(steps, 2)
        processes = [world.add(Process(id=f'D{i}', source='', target='', statement=content,
            role='developing', iteration=1, derived_from=['P0']))
            for i, content in enumerate(contents, 1)]
        world.iterations = [IterationRecord(n=1, developing=[p.id for p in processes],
            raw={'source': 'existing_note', 'developing_processes': [
                {'id': f'P{i}', 'process': p.statement} for i, p in enumerate(processes, 1)]})]
    if target > 3:
        for i, content in enumerate(_content(steps, 3), 1):
            opposite = world.add(Process(id=f'O{i}', source='', target='', statement=content, role='opposite'))
            world.branches.append(OppositionBranch(opposite=opposite, confirmed=False,
                explanation={'source': 'existing_note', 'process_ref': f'manual.step3.{i}', 'process': content}))
        select_branch(world, world.branches[0])
    if target > 4:
        for i, branch in enumerate(world.branches, 1):
            key = f'step4.{i}' if len(world.branches) > 1 else 'step4'
            content = (steps.get(key, {}).get('content') or '').strip()
            if not content and len(world.branches) == 1:
                content = '\n\n'.join(_content(steps, 4))
            if not content:
                raise ValueError(f'Сначала заполните {key} для соответствующей противоположности.')
            process = world.add(Process(id=f'C{i}', source='', target='', statement=content, role='contradiction'))
            branch.contradiction = Contradiction(process_id=process.id, unity='',
                raw={'source': 'existing_note', 'contradiction': content})
        select_branch(world, world.branches[0])
    return world


async def build_step(domain, ctx, state, target):
    steps = predecessor_steps(state, target)
    world = world_from_steps(domain, steps, target, reference=state.get('reference'))
    # Metadata may include a snapshot from an older full run. It is for local
    # reconstruction only, never part of the model's textual context.
    steps = clean_steps(steps)
    extra = context_text(domain, {'existing_note_steps': steps})
    if target == 1:
        rejected = []
        for _ in range(ctx.settings.p0_attempts):
            p0, explanation, verdict, reason = await find_p0(ctx, world, rejected)
            if verdict == 'not_suitable':
                rejected.append({'p0': p0.statement, 'reason': reason})
                continue
            world.p0, world.p0_explanation = p0, explanation
            world.add(p0)
            scope = await check_scope(ctx, world)
            world.scope_checks.append(scope)
            if scope['status'] == 'PRESERVED':
                world.status = 'built'
                return world
            if scope['status'] == 'INSUFFICIENT':
                world.status, world.stop_reason = 'no_opposite', 'scope_justification_insufficient'
                return world
            rejected.append({'p0': p0.statement, 'reason': scope['reason']})
            world.processes.pop(p0.id, None)
            world.p0 = None
        raise ValueError('Не удалось найти исходный процесс, сохраняющий предмет запроса. Уточните вопрос.')
    elif target == 2:
        # Review this iteration before displaying it. Comparison between
        # iterations and the search for an opposite still belong to step 3.
        world.iterations = []
        try:
            iteration = await build_development(ctx, world, 1, None,
                extra_context=extra + '\n\n' + instruction('build_iteration'))
        except DevelopmentUnavailable:
            world.status, world.stop_reason = 'no_opposite', 'development_not_established'
            return world
        world.iterations.append(iteration)
        world.status = 'built'
    elif target == 3:
        comparison = await compare_development(ctx, world, {'existing_note_steps': steps})
        if comparison is None:
            world.status, world.stop_reason = 'no_opposite', 'comparison_not_established'
            return world
        world.comparisons.append(comparison)
        if (comparison.raw['scope_review']['status'] != 'PRESERVED'
                or comparison.raw['p0_assessment']['status'] == 'REJECT'):
            raise ValueError('Проверка предыдущих шагов не пройдена. Исправьте их перед поиском противоположности.')
        if comparison.opposition_candidates:
            check = await check_opposition(ctx, world, comparison.opposition_candidates, extra_context=extra)
            world.opposition_checks.append(check)
            if check.confirmed_opposites:
                set_opposites(world, check)
                world.status = 'built'
                return world
        raise ValueError('Подтверждённая противоположность не найдена в текущем развитии. Уточните шаг 2.')
    elif target in (4, 5):
        await finish_branches(ctx, world, target, extra, preserve_predecessors=True)
    return world
