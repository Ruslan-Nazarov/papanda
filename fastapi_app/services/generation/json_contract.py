"""Accept a JSON object or a single fenced JSON object, never embedded error text."""
import json
import re


def parse_object(raw):
    if not isinstance(raw, str):
        raise ValueError('Expected JSON text')
    text = raw.strip()
    fenced = re.fullmatch(r'```(?:json)?\s*\n?(.*?)\n?```', text, re.DOTALL | re.IGNORECASE)
    if fenced:
        text = fenced.group(1).strip()
    value = json.loads(text)
    if not isinstance(value, dict):
        raise ValueError('Expected a JSON object')
    return value
