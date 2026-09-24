import os
from pathlib import Path
from dotenv import load_dotenv
import uvicorn
from fastapi_app.observability import LOG_CONFIG

if __name__ == "__main__":
    # Explicit process environment wins over the local/shared configuration file.
    load_dotenv(os.getenv('PAPANDA_ENV_FILE', str(Path(__file__).with_name('.env'))))
    reload = os.getenv("UVICORN_RELOAD", "0") != "0"
    uvicorn.run(
        "fastapi_app.main:app",
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "8080")),
        reload=reload,
        workers=None if reload else int(os.getenv("WEB_CONCURRENCY", "1")),
        proxy_headers=False,  # Trust is checked against the socket peer by the application.
        access_log=False,
        log_config=LOG_CONFIG,
    )
