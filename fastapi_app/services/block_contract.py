"""Deterministic adaptation of legacy persisted blocks; never rewrite their text."""
import re
import uuid

SCHEMA_VERSION = 1
_ID = re.compile(r'^[A-Za-z0-9_-]{1,128}$')


def normalize_legacy_blocks(blocks, note_id):
    if not isinstance(blocks, list) or any(not isinstance(b, dict) for b in blocks):
        raise ValueError('Stored content_json must be a list of blocks')
    result, seen = [], set()
    for index, original in enumerate(blocks):
        block = dict(original)
        if block.get('schema_version') not in (None, SCHEMA_VERSION):
            raise ValueError('Unsupported stored block schema version')
        identifier = block.get('id')
        if not isinstance(identifier, str) or not _ID.fullmatch(identifier) or identifier in seen:
            identifier = str(uuid.uuid5(uuid.NAMESPACE_URL, f'papanda:{note_id}:block:{index}'))
            collision = 0
            while identifier in seen:
                collision += 1
                identifier = str(uuid.uuid5(uuid.NAMESPACE_URL, f'papanda:{note_id}:block:{index}:{collision}'))
        seen.add(identifier)
        block['id'] = identifier
        block['schema_version'] = SCHEMA_VERSION
        block['side'] = block.get('side') if block.get('side') in {'left', 'right', 'center'} else 'center'
        status = {'draft': 'in_progress', 'done': 'ready'}.get(block.get('status'), block.get('status'))
        block['status'] = status if status in {'none', 'in_progress', 'ready'} else 'none'
        result.append(block)
    return result
