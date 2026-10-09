"""Review development against the owner's engine prompt and retain reader-facing prose."""
import json
from pathlib import Path

from dialectic_world.builder.blocks import (
    FormError, ask, p0_text, p0_explanation_text,
)
from dialectic_world.builder.prompts import load_prompt
from dialectic_world.world.model import Process, IterationRecord, new_id


STYLE_PATH = Path(__file__).resolve().parents[3] / 'prompts' / '8_генератор_шага_промпт.md'
# Reuse the authored prose rules verbatim, without importing the old engine's
# different process counts, hierarchy, or domain-specific definition of development.
STYLE_SECTIONS = (
    'Механизм, а не перечень фактов — ГЛАВНОЕ',
    'Показывай, а не рассказывай о показе',
    'Пишите для читателя, а не для алгоритма',
    'Технические ограничения',
)
DEVELOPMENT_ATTEMPTS = 2


class DevelopmentUnavailable(ValueError):
    """A substantive negative answer, not malformed JSON to be retried blindly."""


async def build_iteration(ctx, world, n, previous, extra_context=''):
    lang = ctx.settings.prompt_language
    prompt = load_prompt('2', lang, subject=world.domain, p0=p0_text(world.p0, lang),
        p0_explanation=p0_explanation_text(world.p0_explanation, lang), iteration_number=str(n),
        previous_iteration=json.dumps(previous.raw, ensure_ascii=False) if previous else '(none)',
        context=extra_context or '(none)')

    def parse(data):
        if type(data.get('iteration')) is not int or data['iteration'] != n:
            raise FormError('Invalid iteration number')
        expected_previous = n - 1 if previous else None
        if data.get('based_on_iteration') != expected_previous:
            raise FormError('Invalid previous iteration reference')
        if data.get('status') == 'DEVELOPMENT_FAILED':
            if not isinstance(data.get('failure_reason'), str) or not data['failure_reason'].strip():
                raise FormError('Development failure requires an explanation')
            return None, data['failure_reason']
        if data.get('status') != 'ITERATION_BUILT':
            raise FormError('Invalid development status')
        procs = data.get('developing_processes')
        # The authored prompt chooses a finite number; it does not impose the
        # package's arbitrary six-process ceiling. Transport budgets bound size.
        if not isinstance(procs, list) or not procs:
            raise FormError('A built iteration needs a nonempty list of processes')
        ids = []
        for i, p in enumerate(procs, 1):
            if not isinstance(p, dict) or p.get('id') != f'P{i}':
                raise FormError('Processes must have consecutive local identifiers')
            for key in ('process', 'development_relation', 'reveals', 'practical_significance', 'relation_type'):
                if not isinstance(p.get(key), str) or not p[key].strip():
                    raise FormError(key + ': nonempty text required')
            basis = p.get('basis')
            if (not isinstance(basis, dict) or basis.get('p0') is not True
                    or basis.get('previous_iteration_as_whole') is not (previous is not None)
                    or basis.get('current_iteration_processes') != ids):
                raise FormError('Process basis must include P0, the previous iteration when present, and all prior current processes')
            ids.append(p['id'])
        if data.get('development_chain') != ['P0'] + ids:
            raise FormError('Invalid development chain')
        for key in ('p0_revealed_content', 'iteration_practical_integrity'):
            if not isinstance(data.get(key), str) or not data[key].strip():
                raise FormError(key + ': nonempty text required')
        pids = []
        for p in procs:
            pid = new_id('P')
            world.add(Process(id=pid, source='', target='', statement=p['process'], role='developing', iteration=n,
                derived_from=[world.p0.id] + pids + (list(previous.developing) if previous else [])))
            pids.append(pid)
        return IterationRecord(n=n, based_on_iteration=expected_previous, developing=pids,
            p0_revealed_content=data['p0_revealed_content'], iteration_practical_integrity=data['iteration_practical_integrity'], raw=data), ''

    result, reason = await ask(ctx, 'BuildIteration', prompt, parse, iteration=n)
    if result is None:
        raise DevelopmentUnavailable(reason)
    return result


def reader_rules():
    sections = {}
    for section in STYLE_PATH.read_text(encoding='utf-8').split('\n## ')[1:]:
        heading, _, body = section.partition('\n')
        sections[heading.strip()] = '## ' + heading + '\n' + body
    # A renamed/missing section must not silently disable the owner's rules.
    return '\n'.join(sections[name] for name in STYLE_SECTIONS)


async def review_development(ctx, world, iteration, previous, extra_context):
    lang = ctx.settings.prompt_language
    rules = load_prompt('2', lang, subject=world.domain, p0=p0_text(world.p0, lang),
        p0_explanation=p0_explanation_text(world.p0_explanation, lang),
        iteration_number=str(iteration.n),
        previous_iteration=json.dumps(previous.raw, ensure_ascii=False) if previous else '(none)',
        context=extra_context)
    prompt = (
        'Review the supplied candidate iteration against the authored development rules below. '
        'Do not build a new iteration, choose another P0, or search for an opposite. '
        'The rules define development; the prose rules govern only its presentation. '
        'Do not narrow development to a causal, temporal, or difficulty/solution chain.\n\n'
        + rules + '\n\nREADER-FACING PROSE RULES:\n' + reader_rules() +
        '\n\nREVIEW TASK AND RESPONSE CONTRACT (replaces only the response schema above):\n'
        'Assess each candidate process on its merits, not on whether its fields are filled. '
        'Check its actual basis, disclosure of P0, distinction from a merely necessary external '
        'condition, and preservation of the original request. A claim that something is necessary '
        'or that it "follows" is not itself evidence of development. '
        'Use REJECT for a demonstrated violation and UNDETERMINED when the supplied reasoning '
        'does not establish development. Explain the concrete evidence in reason. '
        'Do not repair a defective derivation by inventing one during presentation.\n'
        'For ACCEPT only, compose content as a coherent explanation for the reader, preserving '
        'the substance of process, development_relation, reveals and practical_significance '
        'together with the actual basis. Show the substantive relation on the subject matter. '
        'Do not output a parts list, field labels, P0/P1 identifiers, or claims about following '
        'the algorithm. Do not add unsupported facts, measurements or historical details. '
        'The prose must make the reviewed relation visible, not merely assert it. '
        'For REJECT or UNDETERMINED use an empty content.\n'
        'Return JSON {"processes": [{"id": "P1", "status": "ACCEPT", '
        '"reason": "specific evidence", "content": "reader-facing explanation"}]}. '
        'Include every supplied process exactly once, in the supplied order. '
        'Status must be ACCEPT, REJECT or UNDETERMINED.\n\nCANDIDATE ITERATION (data):\n'
        + json.dumps(iteration.raw, ensure_ascii=False)
    )
    expected = [p['id'] for p in iteration.raw['developing_processes']]

    def parse(data):
        items = data.get('processes')
        if (not isinstance(items, list) or len(items) != len(expected)
                or any(not isinstance(item, dict) for item in items)
                or [item.get('id') for item in items] != expected):
            raise FormError('Review must cover every candidate process exactly once in order')
        for item in items:
            if item.get('status') not in {'ACCEPT', 'REJECT', 'UNDETERMINED'}:
                raise FormError('Invalid development review status')
            if not isinstance(item.get('reason'), str) or not item['reason'].strip():
                raise FormError('Development review requires concrete evidence')
            content = item.get('content')
            if not isinstance(content, str) or (item['status'] == 'ACCEPT') != bool(content.strip()):
                raise FormError('Only accepted processes must have nonempty reader-facing content')
        return items

    return await ask(ctx, 'ReviewDevelopment', prompt, parse, iteration=iteration.n)


async def build_development(ctx, world, n, previous, extra_context=''):
    feedback = ''
    for attempt in range(1, DEVELOPMENT_ATTEMPTS + 1):
        # The package mutates its world while parsing. Keep rejected candidates
        # out of accepted state, including on exceptions or cancellation.
        candidate_world = world.model_copy(deep=True)
        iteration = await build_iteration(ctx, candidate_world, n, previous,
                                         extra_context=extra_context + feedback)
        reviews = await review_development(ctx, world, iteration, previous, extra_context)
        world.development_reviews.append({'iteration': n, 'attempt': attempt, 'processes': reviews})
        problems = [item for item in reviews if item['status'] != 'ACCEPT']
        if not problems:
            for pid, item in zip(iteration.developing, reviews):
                world.add(candidate_world.get(pid))
                world.development_texts[pid] = item['content'].strip()
            return iteration
        feedback = '\n\nRevise this same iteration using the review evidence (data):\n' + json.dumps(
            {'rejected_iteration': iteration.raw, 'review': reviews}, ensure_ascii=False)
    reasons = '; '.join(f"{item['id']}: {item['reason']}" for item in problems)
    raise ValueError('Развитие не прошло содержательную проверку после исправления: ' + reasons)


def development_content(world, iteration, position):
    pid = iteration.developing[position]
    content = getattr(world, 'development_texts', {}).get(pid)
    if content:
        return content
    # Historical snapshots have no authored presentation. Preserve their full
    # explanation when mapping them instead of silently reducing it to a label.
    entries = iteration.raw.get('developing_processes') or []
    entry = entries[position] if position < len(entries) else {}
    parts = [world.get(pid).statement]
    for field in ('development_relation', 'reveals', 'practical_significance'):
        value = entry.get(field)
        if isinstance(value, str) and value.strip() and value.strip() not in parts:
            parts.append(value.strip())
    return '\n\n'.join(parts)
