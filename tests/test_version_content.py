import pytest


@pytest.mark.asyncio
async def test_all_document_fields_survive_initial_checkpoint_restore_and_safety_copy(client):
    payload = {
        "title": "Document", "note_notice": "Notice",
        "blocks": [{"id": "block", "side": "center", "html": "<p>Content</p>"}],
        "stickers": [{"id": "sticker", "title": "Title", "text": "Text", "color": "#abcdef"}],
        "dictionary": [{"word": "x", "definition": "Number", "tags": ["tag"]}],
        "dictionary_tags": [{"id": "tag", "name": "Algebra", "color": "#abcdef"}],
        "math_symbols": [{"symbol": "x", "definition": "Number"}],
    }
    response = await client.post("/api/dialectics/save", json=payload)
    assert response.status_code == 200, response.text
    original = response.json()
    url = f"/api/dialectics/{original['id']}"
    fields = ("note_notice", "content_json", "stickers", "dictionary", "dictionary_tags", "math_symbols")
    initial = (await client.get(url + "/versions")).json()[0]
    checkpoint_response = await client.post(url + "/checkpoint", json={"title": "Checkpoint"})
    assert checkpoint_response.status_code == 200, checkpoint_response.text
    checkpoint = checkpoint_response.json()
    for field in fields:
        assert initial[field] == checkpoint[field] == original[field]
    changed_response = await client.patch(url, json={
        "revision": original["revision"], "note_notice": "Changed", "blocks": [],
        "stickers": [], "dictionary": [], "dictionary_tags": [], "math_symbols": [],
    })
    assert changed_response.status_code == 200
    changed = changed_response.json()
    restore = url + f"/versions/{checkpoint['id']}/restore"
    restored_response = await client.post(restore, json={"revision": changed["revision"]})
    assert restored_response.status_code == 200, restored_response.text
    restored = restored_response.json()
    versions = (await client.get(url + "/versions")).json()
    safety = next(item for item in versions if item["id"] not in (initial["id"], checkpoint["id"]))
    for field in fields:
        assert restored[field] == original[field]
        assert safety[field] == changed[field]
    again = await client.post(restore, json={"revision": restored["revision"]})
    assert again.status_code == 200
    assert again.json()["revision"] == restored["revision"]
    assert len((await client.get(url + "/versions")).json()) == len(versions)
