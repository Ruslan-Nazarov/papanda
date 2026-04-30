
import asyncio
import os
import sys

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi_app.database import get_session_maker
from fastapi_app.services.word_service import WordService
from fastapi_app.services.settings_service import set_settings_batch

async def sync():
    session_maker = get_session_maker("default")
    async with session_maker() as db:
        ws = WordService(db)
        metrics = await ws.get_current_metrics()
        
        print(f"Final Metrics after restoration: {metrics}")
        
        await set_settings_batch(db, {
            'total_words_count': str(metrics['total_count']),
            'current_coverage_cache': str(metrics['coverage']),
            'current_imw_cache': str(metrics['imw'])
        })
        await db.commit()
        print("Settings cache updated successfully.")

if __name__ == "__main__":
    asyncio.run(sync())
