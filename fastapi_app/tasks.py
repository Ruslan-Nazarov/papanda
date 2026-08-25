import asyncio
import time
import os
from fastapi_app.config import settings

async def cleanup_old_dbs():
    while True:
        try:
            if settings.DEMO_DIR.exists():
                now = time.time()
                for db_file in settings.DEMO_DIR.glob("*.db"):
                    if db_file.is_file():
                        # 30 days = 30 * 24 * 60 * 60 = 2592000 seconds
                        if now - db_file.stat().st_mtime > 2592000:
                            os.remove(db_file)
        except Exception as e:
            print(f"Cleanup error: {e}")
        await asyncio.sleep(86400) # Run once a day
