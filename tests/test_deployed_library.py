from copy import deepcopy
import json
from httpx import AsyncClient, ASGITransport
import pytest
from fastapi_app.main import app
from fastapi_app.config import settings
from fastapi_app.services import deployed_library


def write_bundle():
    notes = []
    for slug in ('initial', 'final'):
        ru = {'title': 'ЭКГ ' + slug, 'note_notice': 'Ссылка [PDF](/static/showcase/ecg/original-ai-ru.pdf)',
            'content_json': [{'id': 'step', 'role': 'step1', 'side': 'left', 'title': 'Процесс',
                'html': '<p><span data-hint="Пояснение" data-type="hidden-phrase">Текст</span></p>',
                'status': 'ready', 'author': 'ai_checked', 'is_pinned': True,
                'stickers': [{'id': 'remark', 'title': 'Замечание', 'text': 'Почему?', 'color': '#fef9c3'}]}],
            'stickers': [], 'dictionary': [{'word': 'ЭКГ', 'definition': 'Описание'}]}
        en = deepcopy(ru)
        en.update(title='ECG ' + slug, note_notice='Read [PDF](/static/showcase/ecg/original-ai-en.pdf)')
        en['content_json'][0].update(title='Process', html='<p><span data-hint="Explanation" data-type="hidden-phrase">Text</span></p>')
        en['content_json'][0]['stickers'][0].update(title='Remark', text='Why?')
        en['dictionary'] = [{'word': 'ECG', 'definition': 'Description'}]
        notes.append({'slug': slug, 'source_sync_id': slug, 'languages': {'ru': ru, 'en': en}})
    deployed_library.LIBRARY_PATH.write_text(json.dumps({'schema_version': 1, 'notes': notes}), encoding='utf-8')


@pytest.mark.asyncio
async def test_two_bilingual_notes_keep_identity_and_all_editor_data(file_client, monkeypatch):
    write_bundle()
    monkeypatch.setattr(settings, 'DEMO_MODE', True)
    page = await file_client.get('/?conspect=final&lang=en')
    assert '<html lang="en">' in page.text and 'id="btn-save"' in page.text
    assert 'public-conspect' not in page.text
    en = (await file_client.get('/api/dialectics/library/final/open', headers={'x-note-language': 'en'})).json()
    assert en['title'] == 'ECG final' and en['library_slug'] == 'final'
    assert en['content_json'][0]['is_pinned'] is True
    assert en['content_json'][0]['stickers'][0]['text'] == 'Why?'
    assert 'Explanation' in en['content_json'][0]['html']
    assert en['dictionary'][0]['word'] == 'ECG'
    ru = (await file_client.get('/api/dialectics/library/final/open', headers={'x-note-language': 'ru'})).json()
    assert ru['id'] == en['id'] and ru['title'] == 'ЭКГ final'
    en_edit = await file_client.patch(f"/api/dialectics/{en['id']}", headers={'x-note-language': 'en'},
        json={'revision': en['revision'], 'title': 'My English edit', 'note_notice': 'My English notice'})
    assert en_edit.status_code == 200 and en_edit.json()['title'] == 'My English edit'
    ru_again = (await file_client.get(f"/api/dialectics/{en['id']}", headers={'x-note-language': 'ru'})).json()
    assert ru_again['title'] == ru['title'] and ru_again['note_notice'] == ru['note_notice']
    en_again = (await file_client.get(f"/api/dialectics/{en['id']}", headers={'x-note-language': 'en'})).json()
    assert en_again['title'] == 'My English edit'
    version = await file_client.post(f"/api/dialectics/{en['id']}/versions", headers={'x-note-language': 'en'}, json={'title':'EN checkpoint'})
    assert version.status_code == 200 and 'Explanation' in version.json()['content_json'][0]['html']
    for language in ('ru', 'en'):
        notes = (await file_client.get('/api/dialectics', headers={'x-note-language': language})).json()
        assert len(notes) == 2 and len({note['id'] for note in notes}) == 2
    # Opening a permanent link from a second visitor starts with the author's content.
    async with AsyncClient(transport=ASGITransport(app), base_url='http://127.0.0.1') as other:
        other_en = (await other.get('/api/dialectics/library/final/open?lang=en')).json()
        assert other_en['title'] == 'ECG final'
    library = await file_client.get('/library?lang=en')
    assert library.text.count('class="library-card"') == 2
    assert '/?conspect=final&amp;lang=en' in library.text
    assert (await file_client.get('/showcase/ecg')).status_code == 404


@pytest.mark.asyncio
async def test_author_selection_keeps_full_note_and_both_languages(file_client):
    write_bundle()
    note = (await file_client.get('/api/dialectics/library/final/open?lang=ru')).json()
    result = await file_client.put(f"/api/author/deployment/{note['id']}", json={'revision':note['revision']})
    assert result.status_code == 200 and result.json()['languages'] == ['ru', 'en']
    bundled = deployed_library.find_note('final')
    assert bundled['languages']['ru']['content_json'][0]['is_pinned']
    assert 'Explanation' in bundled['languages']['en']['content_json'][0]['html']
    assert (await file_client.delete(f"/api/author/deployment/{note['id']}")).status_code == 200
    assert len(deployed_library.read_library()['notes']) == 1
    assert (await file_client.get(f"/api/dialectics/{note['id']}")).status_code == 200
