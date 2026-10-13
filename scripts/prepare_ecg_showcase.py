"""Freeze the reader-facing ECG examples and inventory their annotations."""
import asyncio
from collections import Counter
from datetime import datetime, timezone
from hashlib import sha256
from html.parser import HTMLParser
import json
from pathlib import Path
import sqlite3
from types import SimpleNamespace

from fastapi_app.routers.library import snapshot

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'showcase' / 'ecg'


class PlainText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, data):
        self.parts.append(data)


def text(html):
    parser = PlainText()
    parser.feed(html or '')
    return ' '.join(' '.join(parser.parts).split())


async def prepare():
    OUT.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(f'file:{ROOT / "data/db/papanda.db"}?mode=ro', uri=True)
    connection.row_factory = sqlite3.Row
    manifest = {'created_at': datetime.now(timezone.utc).isoformat(), 'notes': []}
    for note_id in (23, 24):
        row = dict(connection.execute('SELECT * FROM notes WHERE id=?', (note_id,)).fetchone())
        for key in ('content_json', 'stickers', 'dictionary'):
            row[key] = json.loads(row[key])
        note = SimpleNamespace(**row)
        payload = await snapshot(note)
        serialized = json.dumps(payload, ensure_ascii=False, indent=2) + '\n'
        path = OUT / f'ru-{note_id}.json'
        if path.exists() and path.read_text(encoding='utf-8') != serialized:
            raise RuntimeError(f'Frozen source changed: {path.name}; preserve the previous snapshot first')
        path.write_text(serialized, encoding='utf-8')
        blocks = payload['blocks']
        record = {
            'note_id': note_id, 'title': note.title, 'revision': note.revision,
            'file': path.name, 'sha256': sha256(serialized.encode()).hexdigest(),
            'blocks': len(blocks), 'note_stickers': len(payload['stickers']),
            'block_stickers': sum(len(b['stickers']) for b in blocks),
            'inline_annotations': sum(len(b['inline_notes']) for b in blocks),
            'sources': sum(len(b['sources']) for b in blocks),
            'dictionary': len(payload['dictionary']),
            'rejected_drafts': sum(len(b['rejected_drafts']) for b in blocks),
            'authors': dict(Counter(b['author'] or 'unmarked' for b in blocks)),
            'statuses': dict(Counter(b['status'] or 'none' for b in blocks)),
            'heading_only_blocks': [b['id'] for b in blocks if b['role'] == 'section' and not text(b['html'])],
            'empty_content_blocks': [b['id'] for b in blocks if b['role'] != 'section' and not text(b['html'])],
        }
        manifest['notes'].append(record)
        excerpts = [{
            'id': b['id'], 'role': b['role'], 'side': b['side'], 'title': b['title'],
            'text': text(b['html']), 'stickers': b['stickers'],
            'inline_notes': b['inline_notes'], 'rejected_drafts': b['rejected_drafts'],
        } for b in blocks]
        (OUT / f'audit-ru-{note_id}.json').write_text(
            json.dumps(excerpts, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(json.dumps(record, ensure_ascii=False))
    (OUT / 'source-manifest.json').write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    connection.close()


if __name__ == '__main__':
    asyncio.run(prepare())
