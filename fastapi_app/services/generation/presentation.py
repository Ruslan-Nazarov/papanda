"""Keep structured reasoning and reader-facing text separate for every note stage."""
import json

from dialectic_world.builder.blocks import FormError, ask
from fastapi_app.services.generation.development import reader_rules


def final_sources(world):
    sources = {}
    branches = getattr(world, 'branches', [])
    confirmed = (all(b.resolution and b.resolution.kind == 'replacement' for b in branches) if branches
                 else bool(world.resolution and world.resolution.kind == 'replacement'))
    if world.p0:
        sources['step1'] = {'process': world.p0.statement, **world.p0_explanation,
                            'p0_confirmed': confirmed}
    if not branches and world.opposite:
        from fastapi_app.services.generation.engine_contracts import OppositionBranch
        branches = [OppositionBranch(opposite=world.opposite, explanation=world.opposite_explanation,
                                     contradiction=world.contradiction, resolution=world.resolution)]
    for i, branch in enumerate(branches, 1):
        suffix = f'.{i}' if len(branches) > 1 else ''
        sources['step3' + suffix] = {**branch.explanation, 'process': branch.opposite.statement}
        if branch.contradiction:
            c = branch.contradiction
            sources['step4' + suffix] = {'process': world.get(c.process_id).statement,
                                         'unity': c.unity, 'reasoning': c.raw}
        if branch.resolution:
            r = branch.resolution
            sources['step5' + suffix] = {'process': world.get(r.process_id).statement,
                'kind': r.kind, 'explanation': r.explanation, 'reasoning': r.raw}
    return sources


def explanation_paragraphs(data):
    """Lossless prose fallback for historical worlds; keep service identifiers out."""
    fields = {'process', 'practical_link', 'why_initial', 'resolution_trace', 'development_potential',
        'shared_content_with_p0', 'difference_from_p0', 'replacement_of_p0', 'exclusion_of_p0',
        'origin', 'development', 'emergence_of_opposite', 'shared_content', 'practical_basis',
        'description', 'not_destruction', 'contradiction', 'practical_manifestation',
        'emerges_from_contradiction', 'p0_content_transformed', 'opposite_content_transformed',
        'new_unity', 'unity', 'explanation', 'preserves_p0', 'preserves_opposite', 'changes_contradiction',
        'enables_further_development'}
    parts = []
    def visit(value):
        for key, item in value.items():
            if isinstance(item, dict):
                visit(item)
            elif key in fields and isinstance(item, str) and item.strip() and item.strip() not in parts:
                parts.append(item.strip())
    visit(data)
    return '\n\n'.join(parts)


async def present(ctx, world, keys):
    sources = {key: value for key, value in final_sources(world).items() if key in keys}
    if not sources:
        return {}
    prompt = (reader_rules() + '\n\n'
        'Write reader-facing explanations for the supplied accepted results. This is presentation, '
        'not a new dialectical analysis. Preserve each result and all its substantive reasoning: '
        'how it arises, what is preserved or transformed, and its practical manifestation. '
        'Do not reduce the result to its process label or a list of components. '
        'Do not invent missing links, facts, proofs or measured results. Keep uncertainty. '
        'P0 remains a candidate unless a complete REPLACEMENT establishes it; MEDIATION does '
        'not mean complete replacement or a confirmed P0. Preserve separate opposite branches. '
        'Do not force relations into a causal or difficulty/solution sequence. '
        'Return JSON {"texts": {"step1": "explanation", ...}} with exactly the supplied keys. '
        'Use connected prose without methodological field labels or process identifiers.\n'
        + json.dumps({'original_request': world.domain, 'results': sources}, ensure_ascii=False))

    def parse(data):
        texts = data.get('texts')
        if not isinstance(texts, dict) or set(texts) != set(sources):
            raise FormError('Presentation must cover exactly the supplied blocks')
        if any(not isinstance(text, str) or not text.strip() for text in texts.values()):
            raise FormError('Every block needs a nonempty explanation')
        return {key: text.strip() for key, text in texts.items()}
    return await ask(ctx, 'PresentNote', prompt, parse)
