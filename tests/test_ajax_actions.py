import pytest
from fastapi_app.services.auth import COOKIE_NAME

@pytest.fixture
async def auth_client(client):
    """Фикстура для авторизованного клиента."""
    # Register and Login
    await client.post("/register", data={
        "username": "ajax_test_user",
        "password": "password123",
        "confirm_password": "password123",
    })
    login_resp = await client.post("/login", data={
        "username": "ajax_test_user",
        "password": "password123",
    })
    client.cookies.update(login_resp.cookies)
    return client

@pytest.mark.anyio
async def test_submit_chrono_json_success(auth_client):
    """Проверяет успешное сохранение хронологии через JSON эндпоинт."""
    payload = {
        "chrono_text": "Test AJAX Chronology Entry",
        "chrono_date": "2026-04-11"
    }
    # Используем multipart/form-data как в браузере (через FormData)
    resp = await auth_client.post("/submit_chrono_json", data=payload)
    
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert "id" in data
    assert data["message"] == "Хронология успешно сохранена"

@pytest.mark.anyio
async def test_add_note_json_success(auth_client, db_session):
    """Проверяет успешное сохранение заметки через JSON эндпоинт."""
    from fastapi_app import models
    # Создаем категорию, так как она нужна для автоматического выбора если не передана
    cat = models.NoteCategory(name="personal")
    db_session.add(cat)
    await db_session.commit()
    
    payload = {
        "note": "Test AJAX Note",
        "category": "personal"
    }
    resp = await auth_client.post("/add_note", data=payload)
    
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert "id" in data
    assert "успешно сохранена" in data["message"]

@pytest.mark.anyio
async def test_submit_chrono_unauthorized(client):
    """Проверяет, что неавторизованный пользователь получает 401 или ошибку (в зависимости от middleware)."""
    payload = {
        "chrono_text": "Unauthorized Entry",
        "chrono_date": "2026-04-11"
    }
    resp = await client.post("/submit_chrono_json", data=payload)
    # В Papanda AuthMiddleware обычно возвращает редирект на логин (302)
    # но для JSON эндпоинтов это может быть иначе. Проверим текущее поведение.
    assert resp.status_code in [302, 401]
