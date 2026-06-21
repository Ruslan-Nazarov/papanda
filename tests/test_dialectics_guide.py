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
    assert "Smart Notes Guide" in data["html"]
