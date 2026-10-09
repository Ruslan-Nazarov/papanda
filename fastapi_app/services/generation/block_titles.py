"""Content headings for generated cards, using the existing authored title rules."""
import asyncio
import json
from pathlib import Path

from dialectic_world.builder.blocks import extract_json
from fastapi_app.services.generation.runtime import current_run


TITLE_RULES = Path(__file__).resolve().parents[3] / 'prompts' / 'заголовки_и_итог_промпт.md'


def fallback_titles(steps):
    # A heading failure must not discard a successfully generated process.
    return {key.removeprefix('step'): ' '.join(value['content'].splitlines()[0].split()[:12]).rstrip('.,;:')
            for key, value in steps.items()}


async def generate_titles(ctx, steps):
    if not steps:
        return {}
    titles = fallback_titles(steps)
    rules = TITLE_RULES.read_text(encoding='utf-8').split('## Название конспекта')[0]
    content = {key.removeprefix('step'): value['content'] for key, value in steps.items()}
    prompt = (rules + '\n\nFor this request, return only the content headings for the supplied blocks. '
              'Do not generate any other steps, a note title, or an overall conclusion. '
              'Return JSON {"titles": {"block_key": "heading"}} with exactly the supplied keys.\n'
              + json.dumps(content, ensure_ascii=False))
    llm = ctx.llm
    old_context = llm.context
    limits = []
    try:
        # Heading synthesis needs only the new texts and the original language rule.
        llm.context = None
        for provider in llm.chain:
            if hasattr(provider, 'max_tokens'):
                limits.append((provider, provider.max_tokens))
                provider.max_tokens = min(provider.max_tokens, 1500)
        async with asyncio.timeout(min(45, current_run.get().remaining())):
            raw = await llm.generate([{'role': 'user', 'content': prompt}])
        parsed = extract_json(raw).get('titles')
        if not isinstance(parsed, dict) or set(parsed) != set(content):
            raise ValueError('Heading keys must match the generated blocks')
        for key, value in parsed.items():
            if not isinstance(value, str) or not value.strip() or len(value.split()) > 15:
                raise ValueError('Expected a short nonempty heading')
        titles = {key: value.strip() for key, value in parsed.items()}
    except Exception:
        # Cancellation (BaseException) still propagates. Titles are optional decoration.
        pass
    finally:
        llm.context = old_context
        for provider, limit in limits:
            provider.max_tokens = limit
    return titles
