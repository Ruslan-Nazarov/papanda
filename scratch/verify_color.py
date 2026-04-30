import asyncio
import os
import sys
from datetime import datetime, timedelta

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi_app.database import get_session_maker
from fastapi_app.services.dashboard_service import DashboardService
from fastapi_app import models

async def verify_color_propagation():
    session_maker = get_session_maker("default")
    async with session_maker() as db:
        service = DashboardService(db)
        
        test_title = "Color Propagation Test"
        test_color = "#ff5733" # Some specific color
        
        # 1. Create a recurring event
        # _add_event(self, text: str, dt: datetime, is_important: bool, repeat: str, repeat_end: str, sticker_data=None, color=None)
        event_id = await service._add_event(
            text=test_title,
            dt=datetime.now(),
            is_important=False,
            repeat="daily",
            repeat_end=(datetime.now() + timedelta(days=5)).date().isoformat(),
            color=test_color
        )
        
        print(f"Created template event id: {event_id} with color {test_color}")
        
        # 2. Fetch all instances with this recurrence_id (except the template)
        from sqlalchemy import select
        res = await db.execute(select(models.Event).where(models.Event.id == event_id))
        template = res.scalar_one()
        rec_id = template.recurrence_id
        
        res = await db.execute(
            select(models.Event).where(models.Event.recurrence_id == rec_id)
        )
        all_instances = res.scalars().all()
        
        print(f"Total instances found for recurrence_id {rec_id}: {len(all_instances)}")
        
        failed = False
        for inst in all_instances:
            if inst.color != test_color:
                print(f"FAIL: Event id={inst.id}, date={inst.date} has color {inst.color}, expected {test_color}")
                failed = True
            else:
                print(f"SUCCESS: Event id={inst.id}, date={inst.date} has correct color {inst.color}")
        
        if failed:
            print("\nVERIFICATION FAILED: Some instances did not receive the correct color.")
        else:
            print("\nVERIFICATION SUCCESSFUL: All instances have the correct color.")
            
        # Clean up
        await service.delete_event(event_id, mode="all")
        print("Cleanup done.")

if __name__ == "__main__":
    asyncio.run(verify_color_propagation())
