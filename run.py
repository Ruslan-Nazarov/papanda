import os
import uvicorn

if __name__ == "__main__":
    # Дев по умолчанию (reload). Прод обычно запускается через systemd напрямую
    # uvicorn/gunicorn'ом; но если через run.py — переопредели env-переменными:
    #   PORT, HOST, UVICORN_RELOAD=0, WEB_CONCURRENCY=<workers>
    reload = os.getenv("UVICORN_RELOAD", "1") != "0"
    uvicorn.run(
        "fastapi_app.main:app",
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "8080")),
        reload=reload,
        workers=None if reload else int(os.getenv("WEB_CONCURRENCY", "1")),
        proxy_headers=False,  # Trust is checked against the socket peer by the application.
    )
