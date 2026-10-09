"""Shared boundaries for note context, source identity and replacement families."""
import hashlib
import json
from pathlib import Path
from dialectic_world.builder.prompts import PROMPTS_DIR


def base(key):
    return int(key.removeprefix('step').split('.')[0])


def clean_steps(steps):
    return {key: {field: value for field, value in step.items() if field != 'generation_data'}
            for key, step in steps.items()}


def predecessor_steps(state, target):
    return {key: value for key, value in state.get('steps', {}).items() if base(key) < target}


def current_steps(state, target):
    return {key: value for key, value in state.get('steps', {}).items() if base(key) == target}


def source_signature(domain, reference):
    return hashlib.sha256(json.dumps([domain, reference], ensure_ascii=False).encode('utf-8')).hexdigest()


def prompt_signature():
    app_prompts = Path(__file__).resolve().parents[3] / 'prompts'
    paths = [PROMPTS_DIR / f'prompt_{i}.en.md' for i in range(1, 7)]
    paths += [app_prompts / '8_генератор_шага_промпт.md']
    paths += sorted((app_prompts / 'engine_scope').glob('*.en.md'))
    digest = hashlib.sha256(b'application-contracts-v2')
    for path in paths:
        digest.update(path.name.encode('utf-8') + b'\0' + path.read_bytes() + b'\0')
    return digest.hexdigest()


def replacement_bases(target=None):
    return [str(target)] if target is not None else ['1', '2', '3', '4', '5']
