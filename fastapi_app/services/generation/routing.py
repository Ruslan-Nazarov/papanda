from dataclasses import dataclass


def model_identity(model):
    # The same model served by Groq/Cerebras must not count as independent.
    return (model or '').lower().removeprefix('openai/').removesuffix(':free')


@dataclass(frozen=True)
class RoutePolicy:
    preferred: tuple[str, ...] = ()
    allowed: tuple[str, ...] | None = None
    excluded_models: tuple[str, ...] = ()


TASK_ROUTES = {
    'step_stream': ('GigaChat', 'Cerebras', 'Gemini', 'Groq'),
    'skeleton': ('Cerebras', 'Gemini', 'GigaChat', 'Groq'),
    'plan_validate': ('Gemini', 'GigaChat', 'Groq'),
    'judge': ('Gemini', 'Cerebras', 'Groq'),
    'history': ('GigaChat', 'Gemini', 'Groq'),
    **{task: ('GigaChat', 'Groq', 'Cerebras', 'Gemini')
       for task in ('what_is', 'formula', 'check', 'article', 'tiny')},
}


def route_for(task=None, prefer=None, allowed=None, exclude_models=()):
    preferred = (prefer,) if isinstance(prefer, str) else tuple(TASK_ROUTES.get(task, ()) if prefer is None else prefer)
    permitted = (allowed,) if isinstance(allowed, str) else tuple(allowed) if allowed is not None else None
    return RoutePolicy(preferred, permitted,
                       tuple(sorted({model_identity(m) for m in exclude_models if m})))
