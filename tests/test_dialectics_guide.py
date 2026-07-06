import pytest

@pytest.mark.anyio
async def test_get_dialectics_guide_unauthorized(client):
    """Проверяет, что неавторизованный пользователь не может получить руководство."""
    resp = await client.get("/api/dialectics/guide")
    assert resp.status_code in [302, 401]

@pytest.mark.anyio
async def test_get_dialectics_guide_success(client):
    """Проверяет успешное получение руководства по диалектике авторизованным пользователем."""
    # Register and Login
    await client.post("/register", data={
        "username": "guide_test_user",
        "password": "password123",
        "confirm_password": "password123",
    })
    login_resp = await client.post("/login", data={
        "username": "guide_test_user",
        "password": "password123",
    })
    client.cookies.update(login_resp.cookies)

    resp = await client.get("/api/dialectics/guide")
    assert resp.status_code == 200
    data = resp.json()
    assert "html" in data
    assert "Руководство" in data["html"] or "Guide" in data["html"] or "Диалект" in data["html"] or "Smart Notes Guide" in data["html"]

@pytest.mark.anyio
async def test_get_dialectics_reference_success_all_locales(client):
    """Проверяет успешное получение справочника по функционалу авторизованным пользователем на всех языках."""
    # Register and Login
    await client.post("/register", data={
        "username": "ref_test_user",
        "password": "password123",
        "confirm_password": "password123",
    })
    login_resp = await client.post("/login", data={
        "username": "ref_test_user",
        "password": "password123",
    })
    client.cookies.update(login_resp.cookies)

    # Test RU
    client.cookies.set("locale", "ru")
    resp = await client.get("/api/dialectics/reference")
    assert resp.status_code == 200
    data = resp.json()
    assert "html" in data
    assert "Главное меню" in data["html"] or "справочник" in data["html"].lower()

    # Test EN
    client.cookies.set("locale", "en")
    resp = await client.get("/api/dialectics/reference")
    assert resp.status_code == 200
    data = resp.json()
    assert "Top Menu" in data["html"] or "Guide" in data["html"]

    # Test KZ
    client.cookies.set("locale", "kz")
    resp = await client.get("/api/dialectics/reference")
    assert resp.status_code == 200
    data = resp.json()
    assert "Жоғарғы мәзір" in data["html"] or "анықтамалық" in data["html"].lower()

