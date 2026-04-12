import pytest
from fastapi_app.services.auth import COOKIE_NAME

@pytest.mark.anyio
async def test_unauthenticated_redirect(client):
    # Should redirect from /
    response = await client.get("/", follow_redirects=False)
    assert response.status_code == 302
    assert response.headers["location"] == "/login"

@pytest.mark.anyio
async def test_full_auth_flow(client):
    # 1. Register a user
    reg_response = await client.post("/register", data={
        "username": "testuser",
        "password": "testpassword",
        "confirm_password": "testpassword"
    }, follow_redirects=False)
    assert reg_response.status_code == 302
    assert reg_response.headers["location"] == "/login"
    
    # 2. Login with this user
    login_response = await client.post("/login", data={
        "username": "testuser",
        "password": "testpassword"
    }, follow_redirects=False)
    assert login_response.status_code == 302
    assert login_response.headers["location"] == "/"
    assert COOKIE_NAME in login_response.cookies
    
    # 3. Access protected page with cookie
    client.cookies.update(login_response.cookies)
    index_response = await client.get("/", follow_redirects=False)
    assert index_response.status_code == 200

@pytest.mark.anyio
async def test_login_failed_wrong_password(client):
    # 1. Register
    await client.post("/register", data={
        "username": "user2",
        "password": "correct",
        "confirm_password": "correct"
    })
    
    # 2. Login with wrong password
    response = await client.post("/login", data={
        "username": "user2",
        "password": "wrong"
    }, follow_redirects=False)
    assert response.status_code == 200 # Returns login page with error
    assert "Неверный логин или пароль" in response.text

@pytest.mark.anyio
async def test_register_password_mismatch(client):
    response = await client.post("/register", data={
        "username": "user3",
        "password": "pass1",
        "confirm_password": "pass2"
    }, follow_redirects=False)
    assert response.status_code == 200
    assert "Пароли не совпадают" in response.text
