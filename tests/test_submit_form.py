import pytest

from fastapi_app.services.auth import COOKIE_NAME


@pytest.mark.anyio
async def test_submit_form_event_redirects(client):
    # Register
    reg_response = await client.post(
        "/register",
        data={
            "username": "submit_form_user",
            "password": "submit_form_password",
            "confirm_password": "submit_form_password",
        },
        follow_redirects=False,
    )
    assert reg_response.status_code == 302
    assert reg_response.headers["location"] == "/login"

    # Login
    login_response = await client.post(
        "/login",
        data={
            "username": "submit_form_user",
            "password": "submit_form_password",
        },
        follow_redirects=False,
    )
    assert login_response.status_code == 302
    assert login_response.headers["location"] == "/"
    assert COOKIE_NAME in login_response.cookies

    client.cookies.update(login_response.cookies)

    # Submit form (HTML form-style)
    resp = await client.post(
        "/submit_form",
        data={
            "common_text": "ntcn 2",
            "common_date": "2026-03-27",
            "common_category": "event",
        },
        follow_redirects=False,
    )

    # Handler returns RedirectResponse("/", status_code=303)
    assert resp.status_code == 303
    assert resp.headers["location"] == "/"

