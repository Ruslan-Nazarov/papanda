"""Import English copies and stage four local public snapshots; --publish sends them."""
import argparse
import asyncio
from copy import deepcopy
from hashlib import sha256
import json
from pathlib import Path
import sqlite3
import httpx
from scripts.translate_ecg_showcase import OUT, write_json
from fastapi_app.routers.library import Publication, snapshot
from fastapi_app.services import library_store
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]


def call(client, method, path, **kwargs):
    response = client.request(method, path, **kwargs)
    response.raise_for_status()
    return response.json()


def main(publish=False):
    mapping_path = OUT / 'publication-map.json'
    mapping = json.loads(mapping_path.read_text(encoding='utf-8')) if mapping_path.exists() else {}
    backup = ROOT / 'backups/before-english-ecg-import-20261013.db'
    if not backup.exists():
        backup.parent.mkdir(exist_ok=True)
        with sqlite3.connect(ROOT / 'data/db/papanda.db') as source, sqlite3.connect(backup) as target:
            source.backup(target)
            if target.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                raise RuntimeError('Backup validation failed')
    manifest = json.loads((OUT / 'source-manifest.json').read_text(encoding='utf-8'))
    with httpx.Client(base_url='http://127.0.0.1:8080', timeout=45, trust_env=False) as client:
        for source in manifest['notes']:
            note = call(client, 'GET', f"/api/dialectics/{source['note_id']}")
            if note['revision'] != source['revision']:
                raise RuntimeError('Russian source changed since translation')
            mapping[f"ru-{source['note_id']}"] = {'note_id': note['id'], 'revision': note['revision']}
        notes = call(client, 'GET', '/api/dialectics')
        for source_id in (23, 24):
            key = f'en-{source_id}'
            document = json.loads((OUT / f'{key}.json').read_text(encoding='utf-8'))
            payload = {k: document[k] for k in ('title', 'note_notice', 'stickers', 'dictionary')}
            payload['blocks'] = [{k: v for k, v in b.items() if k != 'inline_notes'} for b in document['blocks']]
            if key in mapping:
                note = call(client, 'GET', f"/api/dialectics/{mapping[key]['note_id']}")
            else:
                matches = [n for n in notes if n['title'] == payload['title']]
                if len(matches) > 1:
                    raise RuntimeError('Ambiguous English note title')
                note = matches[0] if matches else call(client, 'POST', '/api/dialectics/save', json=payload)
            if (note['title'] != payload['title'] or note['note_notice'] != payload['note_notice']
                    or note['stickers'] != payload['stickers'] or note['dictionary'] != payload['dictionary']):
                raise RuntimeError('English note differs; preserve author edits before proceeding')
            public = asyncio.run(snapshot(SimpleNamespace(**{**note, 'content_json': note['content_json']}), language='en'))
            if public['blocks'] != document['blocks']:
                raise RuntimeError('English block content changed during import')
            mapping[key] = {'note_id': note['id'], 'revision': note['revision']}
            write_json(mapping_path, mapping)
        for key, item in mapping.items():
            state = call(client, 'GET', f"/api/author/library/{item['note_id']}")
            item.update({'publication_id': state['id'], 'url': state['url']})
        write_json(mapping_path, mapping)
        for key, item in mapping.items():
            lang, source_id = key.split('-')
            initial = source_id == '23'
            other_id = '24' if initial else '23'
            other_language = 'en' if lang == 'ru' else 'ru'
            ru = lang == 'ru'
            resources = [
                {'title': 'Первоначальный ответ ИИ · PDF' if ru else 'Original AI answer · PDF',
                 'url': f'/static/showcase/ecg/original-ai-{lang}.pdf'},
                {'title': 'Техническое задание' if ru else 'Technical specification',
                 'url': f"/static/showcase/ecg/technical-requirements-{lang}.{'docx' if ru else 'pdf'}"},
                {'title': ('Окончательный конспект' if initial else 'Первоначальный конспект с замечаниями') if ru
                    else ('Final learning guide' if initial else 'Initial annotated notes'),
                 'url': f"/library/{mapping[f'{lang}-{other_id}']['publication_id']}"},
                {'title': 'English version' if ru else 'Русская версия',
                 'url': f"/library/{mapping[f'{other_language}-{source_id}']['publication_id']}"},
            ]
            description = ('Первоначальный конспект с авторскими замечаниями и отклонёнными формулировками.' if initial
                else 'Окончательный учебный разбор сборки одноканального ЭКГ.') if ru else (
                'Initial annotated notes with author comments and rejected formulations.' if initial
                else 'Final learning guide explaining how to build a single-channel ECG device.')
            document = deepcopy(json.loads((OUT / f'{key}.json').read_text(encoding='utf-8')))
            document.update(language=lang, resources=resources, description=description)
            document = Publication.model_validate(document).model_dump(mode='json')
            library_store.put_publication(item['publication_id'], document)
            write_json(OUT / f'publication-{key}.json', document)
            item.update(resources=resources, description=description)
            if publish:
                result = call(client, 'PUT', f"/api/author/library/{item['note_id']}", json={
                    'revision': item['revision'], 'language': lang, 'description': description, 'resources': resources})
                print(json.dumps({'key': key, 'published': result['url']}), flush=True)
            else:
                print(json.dumps({'key': key, 'staged': item['publication_id'], 'note_id': item['note_id']}), flush=True)
        write_json(mapping_path, mapping)
    page_path = ROOT / 'fastapi_app/data/ecg_showcase.json'
    page = json.loads(page_path.read_text(encoding='utf-8'))
    for lang in ('ru', 'en'):
        page['languages'][lang]['publications'] = {name: mapping[f'{lang}-{note_id}']['publication_id']
            for name, note_id in (('initial', 23), ('final', 24))}
    write_json(page_path, page)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--publish', action='store_true')
    main(parser.parse_args().publish)
