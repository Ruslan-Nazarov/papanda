
import asyncio
import os
import sys
from datetime import datetime

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi_app.database import get_session_maker, Base
from fastapi_app import models
from fastapi_app.services.word_service import WordService
from fastapi_app.services.settings_service import set_setting

async def verify():
    session_maker = get_session_maker("default")
    async with session_maker() as db:

        ws = WordService(db)
        
        # 1. Setup mock data
        # Let's assume we have 10 words
        # and active languages are 'en, it'
        await set_setting(db, 'active_languages', 'en,it')
        
        # Clear existing stats for consistency in test
        await ws.reset_all_stats()
        
        # Add some mock words if not present
        from sqlalchemy import select, func
        res = await db.execute(select(func.count(models.WordStats.word)))
        count = res.scalar() or 0
        if count < 5:
            db.add(models.WordStats(word="apple", eng="apple", ru="яблоко", it="mela", translations={"en": "apple", "it": "mela"}))
            db.add(models.WordStats(word="bread", eng="bread", ru="хлеб", it="pane", translations={"en": "bread", "it": "pane"}))
            await db.commit()
        
        # Record some shows for 'it' but not 'en'
        words_res = await db.execute(select(models.WordStats).limit(5))
        words = words_res.scalars().all()
        
        # Mock shows for 'it'
        for w in words[:2]:
            stats = dict(w.show_stats or {})
            stats['it'] = 10
            w.show_stats = stats
        
        await db.commit()
        
        # 2. Test metrics
        metrics = await ws.get_current_metrics()
        print(f"Metrics (en, it): {metrics}")
        # Coverage for it should be (2/total), for en 0. Average coverage: (2/total + 0)/2
        
        # 3. Test distribution
        dist = await ws.get_distribution_stats()
        print(f"Distribution: {dist}")
        
        # 4. Test Top words
        top = await ws.get_top_encountered_words(5)
        print(f"Top Encountered: {[w.word for w in top]}")

if __name__ == "__main__":
    asyncio.run(verify())
