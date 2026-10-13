"""Full author-selected notes bundled with Git, one identity per bilingual note."""
from copy import deepcopy
from functools import lru_cache
import json
import os
from pathlib import Path
import re
from uuid import uuid4
from fastapi import HTTPException
from sqlalchemy import select
from fastapi_app.models.notes import Note
from fastapi_app.schemas.notes import NoteCreate
from fastapi_app.services.note_transactions import commit

LIBRARY_PATH = Path(os.getenv('PAPANDA_LIBRARY_FILE', str(Path(__file__).resolve().parents[1] / 'data/library_notes.json')))
DOCUMENT_FIELDS = ('title', 'note_notice', 'content_json', 'stickers', 'dictionary')

@lru_cache(maxsize=2)
def _read(path, stamp):
    bundle = json.loads(Path(path).read_text(encoding='utf-8'))
    if bundle.get('schema_version') != 1:
        raise RuntimeError('Unsupported deployed library format')
    seen = set()
    for item in bundle['notes']:
        if not re.fullmatch(r'[a-z0-9][a-z0-9_-]{0,127}', item['slug']) or item['slug'] in seen:
            raise RuntimeError('Invalid or duplicate library identity')
        seen.add(item['slug'])
        if 'ru' not in item['languages']:
            raise RuntimeError('A library note requires its Russian source')
        for document in item['languages'].values():
            NoteCreate.model_validate({**document, 'blocks': document['content_json']})
    return bundle

def read_library():
    return _read(str(LIBRARY_PATH), LIBRARY_PATH.stat().st_mtime_ns) if LIBRARY_PATH.exists() else {'schema_version': 1, 'notes': []}

def find_note(slug):
    item = next((note for note in read_library()['notes'] if note['slug'] == slug), None)
    if not item:
        raise HTTPException(404, 'Library note not found')
    return item

def prepare_open_note(note):
    """Permanent links start with all blocks open and use the destination's title."""
    catalog = {item['slug']: item for item in read_library()['notes']}
    def notice_links(text):
        def rename(match):
            target = catalog.get(match['slug'])
            if not target:
                return match[0]
            document = target['languages'].get(match['lang'], target['languages']['ru'])
            return '[' + document['title'] + '](' + match['url'] + ')'
        return re.sub(r'\[[^\]\n]+\]\((?P<url>/\?conspect=(?P<slug>[a-z0-9_-]+)&lang=(?P<lang>ru|en))\)', rename, text or '')

    if any(block.get('collapsed') for block in note._content_json):
        note._content_json = [{**block, 'collapsed': False} for block in note._content_json]
    notice = notice_links(note._note_notice)
    if notice != note._note_notice:
        note._note_notice = notice
    translations = deepcopy(note.translations or {})
    for document in translations.values():
        for block in document.get('content_json', []):
            block['collapsed'] = False
        document['note_notice'] = notice_links(document.get('note_notice', ''))
    if translations != note.translations:
        note.translations = translations

def list_notes(locale):
    return [{'id': item['slug'], 'title': item['languages'].get(locale, item['languages']['ru'])['title'],
             'description': item.get('description', {}).get(locale, ''), 'languages': list(item['languages']),
             'language': locale, 'url': f"/?conspect={item['slug']}&lang={locale}", 'updated_at': ''}
            for item in read_library()['notes']]

async def seed_library(session):
    """Each visitor receives normal editable notes; both languages share the same row."""
    changed = False
    created = []
    for item in read_library()['notes']:
        sync_id = item['source_sync_id']
        exists = (await session.execute(select(Note.id).where(Note.sync_id == sync_id))).scalar_one_or_none()
        if exists is not None:
            continue
        source = item['languages']['ru']
        validated = NoteCreate.model_validate({**source, 'blocks': source['content_json']})
        note = Note(title=validated.title, note_notice=validated.note_notice,
            content_json=[block.model_dump(mode='json') for block in validated.blocks],
            stickers=[sticker.model_dump(mode='json') for sticker in validated.stickers],
            dictionary=[word.model_dump() for word in validated.dictionary],
            status=validated.status, is_pinned=validated.is_pinned,
            sticker_text=validated.sticker_text, sticker_color=validated.sticker_color,
            translations={lang: deepcopy(document) for lang, document in item['languages'].items() if lang != 'ru'},
            library_slug=item['slug'], sync_id=sync_id)
        session.add(note)
        created.append(note)
        changed = True
    if changed:
        await commit(session, flush_only=True)
        # Internal links use the visitor's IDs, while block IDs remain unchanged.
        identities = {}
        for item in read_library()['notes']:
            if item.get('source_note_id') is not None:
                local_id = (await session.execute(select(Note.id).where(Note.sync_id == item['source_sync_id']))).scalar_one()
                identities[str(item['source_note_id'])] = str(local_id)
        def relocate(document):
            encoded = json.dumps(document, ensure_ascii=False)
            encoded = re.sub(r'internal://note/([0-9]+)(?=/|[^a-zA-Z0-9_-]|$)',
                lambda match: 'internal://note/' + identities.get(match[1], match[1]), encoded)
            return json.loads(encoded)
        for note in created:
            note.content_json = relocate(note.content_json)
            note.translations = relocate(note.translations)
        await commit(session)

def publication_state(note):
    item = next((item for item in read_library()['notes'] if item['source_sync_id'] == note.sync_id), None)
    slug = item['slug'] if item else 'note-' + (note.sync_id or str(uuid4()))
    return {'id': slug, 'included': item is not None, 'url': f'/?conspect={slug}&lang=ru',
            'languages': list(item['languages']) if item else ['ru']}

def write_selection(note, included):
    bundle = deepcopy(read_library())
    item = next((item for item in bundle['notes'] if item['source_sync_id'] == note.sync_id), None)
    if included:
        state = publication_state(note)
        languages = {'ru': {key: deepcopy(getattr(note, '_' + key)) for key in DOCUMENT_FIELDS}}
        languages['ru'].update(status=note.status, is_pinned=note.is_pinned,
            sticker_text=note.sticker_text, sticker_color=note.sticker_color)
        languages.update(deepcopy(note.translations or {}))
        entry = {**(item or {}), 'slug': state['id'], 'source_sync_id': note.sync_id,
            'source_note_id': (item or {}).get('source_note_id', note.id), 'languages': languages}
        bundle['notes'] = [entry if old is item else old for old in bundle['notes']] if item else [*bundle['notes'], entry]
    else:
        bundle['notes'] = [old for old in bundle['notes'] if old is not item]
    LIBRARY_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary = LIBRARY_PATH.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(LIBRARY_PATH)
    _read.cache_clear()
    return publication_state(note)
