import asyncio
from fastapi.testclient import TestClient
from fastapi_app.main import app

def test_route():
    with TestClient(app) as client:
        response = client.get("/api/words/stats_modal")
        print(response.status_code)
        print(response.text)

test_route()
