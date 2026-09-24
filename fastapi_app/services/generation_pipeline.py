"""Compatibility entry point; operation orchestration lives in generation/."""
from fastapi_app.services.generation.orchestrator import GenerationPipeline
from fastapi_app.services.generation.common import (
    _MAX_TOKENS, _MAX_GENERATION_ATTEMPTS, _base_of, _fix_math,
)
