import asyncio
import sys
import os
from datetime import datetime, timedelta

sys.path.append(os.getcwd())

from fastapi_app.database import get_session_maker
from fastapi_app.models.vocabulary import WordStatsSnapshot, WordShowsDaily
from sqlalchemy import select, delete

async def reset_stats():
    session_maker = get_session_maker("default")
    async with session_maker() as db:
        today = datetime.now().date()
        yesterday = today - timedelta(days=1)
        target_dates = [today, yesterday]
        
        print(f"Resetting stats for: {target_dates}")
        
        for d in target_dates:
            # Reset snapshots
            res = await db.execute(select(WordStatsSnapshot).where(WordStatsSnapshot.date == d))
            snap = res.scalar_one_or_none()
            if snap:
                print(f"Resetting snapshot for {d}")
                snap.test_total = 0
                snap.test_success = 0
                snap.test_stats_json = {}
            
            # Reset daily shows
            res_shows = await db.execute(select(WordShowsDaily).where(WordShowsDaily.date == d))
            show_row = res_shows.scalar_one_or_none()
            if show_row:
                print(f"Resetting daily shows for {d}")
                show_row.shows_count = 0
        
        await db.commit()
        print("Done. Stats cleared for yesterday and today.")

if __name__ == '__main__':
    asyncio.run(reset_stats())
