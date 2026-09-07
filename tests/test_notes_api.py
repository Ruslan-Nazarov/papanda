import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_categories_crud(client: AsyncClient):
    # 1. Create Category
    res = await client.post("/api/dialectics/categories/new", json={"name": "Философия", "color": "#3b82f6"})
    assert res.status_code == 200, res.text
    cat = res.json()
    assert cat["name"] == "Философия"
    assert cat["color"] == "#3b82f6"
    cat_id = cat["id"]

    # 2. Get All Categories
    res = await client.get("/api/dialectics/categories/all")
    assert res.status_code == 200
    categories = res.json()
    assert any(c["id"] == cat_id and c["name"] == "Философия" for c in categories)

    # 3. Update Category
    res = await client.put(f"/api/dialectics/categories/{cat_id}", json={"name": "Диалектическая философия"})
    assert res.status_code == 200
    assert res.json()["name"] == "Диалектическая философия"

    # 4. Delete Category
    res = await client.delete(f"/api/dialectics/categories/{cat_id}")
    assert res.status_code == 200
    assert res.json()["status"] == "deleted"


@pytest.mark.asyncio
async def test_notes_crud_and_search(client: AsyncClient):
    # Create category first
    res_cat = await client.post("/api/dialectics/categories/new", json={"name": "Диалектика", "color": "#10b981"})
    cat_id = res_cat.json()["id"]

    # 1. Create Note with blocks
    payload = {
        "title": "Гегель и диалектический метод",
        "blocks": [
            {
                "id": "block-1",
                "side": "left",
                "role": "anchor",
                "title": "Исходный вопрос",
                "html": "<p>Что такое бытие?</p>",
                "status": "ready"
            },
            {
                "id": "block-2",
                "side": "left",
                "role": "step1",
                "title": "Тезис",
                "html": "<p>Чистое бытие есть ничто.</p>",
                "status": "ready"
            }
        ],
        "category_id": cat_id,
        "is_pinned": True,
        "status": "in_progress",
        "sticker_text": "Важная заметка",
        "sticker_color": "#fff9c4"
    }
    res = await client.post("/api/dialectics/save", json=payload)
    assert res.status_code == 200, res.text
    note = res.json()
    assert note["id"] is not None
    assert note["title"] == "Гегель и диалектический метод"
    assert len(note["content_json"]) == 2
    note_id = note["id"]

    # 2. Get Note by ID
    res = await client.get(f"/api/dialectics/{note_id}")
    assert res.status_code == 200
    note_fetched = res.json()
    assert note_fetched["id"] == note_id
    assert note_fetched["title"] == "Гегель и диалектический метод"
    assert note_fetched["category_id"] == cat_id
    assert note_fetched["is_pinned"] is True

    # 3. Search note by text
    res_search = await client.get("/api/dialectics?search=Гегель")
    assert res_search.status_code == 200
    notes = res_search.json()
    assert len(notes) >= 1
    assert any(n["id"] == note_id for n in notes)

    # 4. Filter note by category
    res_filter = await client.get(f"/api/dialectics?category_id={cat_id}")
    assert res_filter.status_code == 200
    notes = res_filter.json()
    assert len(notes) >= 1
    assert any(n["id"] == note_id for n in notes)

    # 5. Update Note (PATCH)
    update_payload = {
        "title": "Гегель: Логика и метод (обновлено)",
        "blocks": [
            {
                "id": "block-1",
                "side": "left",
                "role": "anchor",
                "title": "Исходный вопрос",
                "html": "<p>Что такое бытие и ничто?</p>",
                "status": "ready"
            }
        ],
        "status": "ready"
    }
    res_update = await client.patch(f"/api/dialectics/{note_id}", json=update_payload)
    assert res_update.status_code == 200
    updated_note = res_update.json()
    assert updated_note["title"] == "Гегель: Логика и метод (обновлено)"
    assert updated_note["status"] == "ready"
    assert len(updated_note["content_json"]) == 1

    # 6. Update Status endpoint
    res_status = await client.post(f"/api/dialectics/{note_id}/status?status=in_progress")
    assert res_status.status_code == 200
    assert res_status.json()["status"] == "in_progress"


@pytest.mark.asyncio
async def test_trash_and_restore(client: AsyncClient):
    # Create note
    res = await client.post("/api/dialectics/save", json={"title": "Заметка для удаления", "blocks": []})
    note_id = res.json()["id"]

    # 1. Soft Delete
    res_del = await client.delete(f"/api/dialectics/{note_id}")
    assert res_del.status_code == 200

    # Verify not in regular list
    res_list = await client.get("/api/dialectics")
    assert not any(n["id"] == note_id for n in res_list.json())

    # 2. Check in Trash List
    res_trash = await client.get("/api/dialectics/trash/list")
    assert res_trash.status_code == 200
    trash_notes = res_trash.json()
    assert any(n["id"] == note_id for n in trash_notes)

    # 3. Restore from Trash
    res_restore = await client.post(f"/api/dialectics/{note_id}/restore")
    assert res_restore.status_code == 200
    assert res_restore.json()["is_deleted"] is False

    # Verify back in regular list
    res_list2 = await client.get("/api/dialectics")
    assert any(n["id"] == note_id for n in res_list2.json())

    # 4. Soft Delete again and Permanent Delete
    await client.delete(f"/api/dialectics/{note_id}")
    res_perm = await client.delete(f"/api/dialectics/{note_id}/permanent")
    assert res_perm.status_code == 200

    # Verify gone from trash
    res_trash2 = await client.get("/api/dialectics/trash/list")
    assert not any(n["id"] == note_id for n in res_trash2.json())


@pytest.mark.asyncio
async def test_note_versions_and_checkpoints(client: AsyncClient):
    # Create initial note
    res = await client.post("/api/dialectics/save", json={
        "title": "Конспект по физике",
        "blocks": [{"id": "b1", "side": "left", "html": "<p>Версия 1</p>", "status": "ready"}]
    })
    note_id = res.json()["id"]

    # 1. Create a named checkpoint
    res_cp = await client.post(f"/api/dialectics/{note_id}/checkpoint", json={
        "title": "Черновик v1.0",
        "is_manual": True
    })
    assert res_cp.status_code == 200
    cp = res_cp.json()
    assert cp["title"] == "Черновик v1.0"
    version_id = cp["id"]

    # 2. Modify the note to create a newer state
    await client.patch(f"/api/dialectics/{note_id}", json={
        "title": "Конспект по физике (измененный)",
        "blocks": [{"id": "b1", "side": "left", "html": "<p>Версия 2 (измененная)</p>", "status": "ready"}]
    })

    # 3. Get all versions
    res_versions = await client.get(f"/api/dialectics/{note_id}/versions")
    assert res_versions.status_code == 200
    versions = res_versions.json()
    assert len(versions) >= 1
    assert any(v["id"] == version_id for v in versions)

    # 4. Pin version
    res_pin = await client.post(f"/api/dialectics/{note_id}/versions/{version_id}/pin")
    assert res_pin.status_code == 200
    assert res_pin.json()["is_manual"] is True

    # 5. Restore old version
    res_restore = await client.post(f"/api/dialectics/{note_id}/versions/{version_id}/restore")
    assert res_restore.status_code == 200
    restored_note = res_restore.json()
    assert restored_note["content_json"][0]["html"] == "<p>Версия 1</p>"

    # 6. Delete version
    res_del_ver = await client.delete(f"/api/dialectics/{note_id}/versions/{version_id}")
    assert res_del_ver.status_code == 200


@pytest.mark.asyncio
async def test_note_connections(client: AsyncClient):
    # Create two notes
    res1 = await client.post("/api/dialectics/save", json={"title": "Тема А", "blocks": []})
    res2 = await client.post("/api/dialectics/save", json={"title": "Тема Б", "blocks": []})
    id1 = res1.json()["id"]
    id2 = res2.json()["id"]

    # 1. Create connection from A to B
    res_conn = await client.post(f"/api/dialectics/{id1}/connections", json={
        "note_id_to": id2,
        "label": "предшествует"
    })
    assert res_conn.status_code == 200
    conn = res_conn.json()
    assert conn["note_id_from"] == id1
    assert conn["note_id_to"] == id2
    assert conn["label"] == "предшествует"
    conn_id = conn["id"]

    # 2. Get connections for note 1
    res_get_conns = await client.get(f"/api/dialectics/{id1}/connections")
    assert res_get_conns.status_code == 200
    connections = res_get_conns.json()
    assert any(c["id"] == conn_id for c in connections)

    # 3. Delete connection
    res_del_conn = await client.delete(f"/api/dialectics/connections/{conn_id}")
    assert res_del_conn.status_code == 200

    # Verify deleted
    res_get_conns2 = await client.get(f"/api/dialectics/{id1}/connections")
    assert not any(c["id"] == conn_id for c in res_get_conns2.json())


@pytest.mark.asyncio
async def test_note_not_found_returns_404(client: AsyncClient):
    """Проверяет что несуществующие ресурсы возвращают 404."""
    # Non-existent note
    res = await client.get("/api/dialectics/999999")
    assert res.status_code == 404

    # Non-existent note PATCH
    res = await client.patch("/api/dialectics/999999", json={"title": "test"})
    assert res.status_code == 404

    # Non-existent note DELETE
    res = await client.delete("/api/dialectics/999999")
    assert res.status_code == 404

    # Non-existent note restore from trash
    res = await client.post("/api/dialectics/999999/restore")
    assert res.status_code == 404

    # Non-existent note versions
    res = await client.get("/api/dialectics/999999/versions")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_note_block_extra_fields_preserved(client: AsyncClient):
    """Проверяет что новые поля NoteBlock (border_color, is_pinned) сохраняются и возвращаются корректно."""
    payload = {
        "title": "Заметка с кастомными полями блока",
        "blocks": [
            {
                "id": "blk-custom",
                "side": "left",
                "role": "step1",
                "title": "Блок с рамкой",
                "html": "<p>Контент</p>",
                "status": "ready",
                "border_color": "#ef4444",
                "is_pinned": True,
            }
        ]
    }
    res = await client.post("/api/dialectics/save", json=payload)
    assert res.status_code == 200, res.text
    note = res.json()
    note_id = note["id"]

    # Fetch note back and check block fields
    res_get = await client.get(f"/api/dialectics/{note_id}")
    assert res_get.status_code == 200
    block = res_get.json()["content_json"][0]
    assert block.get("border_color") == "#ef4444"
    assert block.get("is_pinned") is True



@pytest.mark.asyncio
async def test_note_sharing_public_link(client: AsyncClient):
    """POST /{id}/share выдаёт токен; GET /shared/{token} и страница /s/{token}
    отдают конспект без привязки к сессии; XSS в html вычищается."""
    payload = {
        "title": "Почему небо голубое",
        "blocks": [
            {"side": "left", "role": "step1", "title": "Свет и воздух",
             "html": "<p>Рассеяние <strong>Рэлея</strong>.</p><script>alert(1)</script>"},
        ],
    }
    res = await client.post("/api/dialectics/save", json=payload)
    assert res.status_code == 200, res.text
    note_id = res.json()["id"]

    sh = await client.post(f"/api/dialectics/{note_id}/share")
    assert sh.status_code == 200
    token = sh.json()["token"]
    assert token and sh.json()["path"] == f"/s/{token}"

    # повторный вызов — тот же токен
    assert (await client.post(f"/api/dialectics/{note_id}/share")).json()["token"] == token

    api = await client.get(f"/api/dialectics/shared/{token}")
    assert api.status_code == 200
    assert api.json()["title"] == "Почему небо голубое"

    page = await client.get(f"/s/{token}")
    assert page.status_code == 200
    assert "Рассеяние" in page.text
    assert "<script>alert(1)" not in page.text  # вычищено

    # неизвестный токен — 404
    assert (await client.get("/s/nope-nope-nope")).status_code == 404

    # отзыв доступа
    assert (await client.delete(f"/api/dialectics/{note_id}/share")).status_code == 200
    assert (await client.get(f"/api/dialectics/shared/{token}")).status_code == 404
