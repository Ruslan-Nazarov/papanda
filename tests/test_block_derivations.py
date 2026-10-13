import pytest


@pytest.mark.asyncio
async def test_derivations_survive_save_reload_and_version_restore(client):
    blocks = [
        {'id': 'basis', 'side': 'left', 'role': 'step1', 'is_pinned': True, 'html': '<p>Basis</p>'},
        {'id': 'result', 'side': 'right', 'html': '<p>Result</p>', 'derivations': [
            {'source_id': 'basis', 'html': '<p><strong>Because</strong></p><script>alert(1)</script>'}]},
    ]
    response = await client.post('/api/dialectics/save', json={'title': 'Derivations', 'blocks': blocks})
    assert response.status_code == 200, response.text
    note = response.json()
    expected = note['content_json'][1]['derivations']
    assert expected[0]['source_id'] == 'basis'
    assert '<strong>Because</strong>' in expected[0]['html']
    assert '<script' not in expected[0]['html']
    fetched = await client.get(f'/api/dialectics/{note["id"]}')
    assert fetched.status_code == 200, fetched.text
    assert fetched.json()['content_json'][1]['derivations'] == expected
    checkpoint = await client.post(f'/api/dialectics/{note["id"]}/checkpoint', json={'title': 'With explanation'})
    assert checkpoint.status_code == 200, checkpoint.text
    blocks[1]['derivations'] = []
    updated = await client.patch(f'/api/dialectics/{note["id"]}', json={'revision': note['revision'], 'blocks': blocks})
    assert updated.status_code == 200, updated.text
    assert updated.json()['content_json'][1]['derivations'] == []
    restored = await client.post(f'/api/dialectics/{note["id"]}/versions/{checkpoint.json()["id"]}/restore',
                                json={'revision': updated.json()['revision']})
    assert restored.status_code == 200, restored.text
    assert restored.json()['content_json'][1]['derivations'] == expected


@pytest.mark.asyncio
async def test_derivation_requires_valid_source_id(client):
    response = await client.post('/api/dialectics/save', json={'title': 'Invalid', 'blocks': [
        {'id': 'result', 'side': 'right', 'derivations': [{'source_id': '<bad>', 'html': '<p>Text</p>'}]}]})
    assert response.status_code == 422, response.text
