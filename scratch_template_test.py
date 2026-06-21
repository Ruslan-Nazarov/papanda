import asyncio
import os
from fastapi.templating import Jinja2Templates
from fastapi_app.database import get_session_maker
from fastapi_app.services.dashboard_service import DashboardService
from fastapi_app.config import templates

async def run():
    session_maker = get_session_maker("default")
    async with session_maker() as session:
        dash = DashboardService(session)
        tasks = await dash.tasks.get_active_tasks()
        
        # Test jinja render directly
        for t in tasks:
            print(f"Task {t.id} - name: {t.name}, stickers_count: {getattr(t, 'stickers_count', 'missing')}")
            
        # Render template fragment
        from jinja2 import Environment, FileSystemLoader
        env = Environment(loader=FileSystemLoader("fastapi_app/templates"))
        
        # We need to mock `_` function
        env.globals['_'] = lambda x: x
        template = env.get_template("partials/tasks_widget.html")
        rendered = template.render(
            tasks=tasks,
            now_utc=__import__("datetime").datetime.now(__import__("datetime").timezone.utc).replace(tzinfo=None),
            one_thing="test",
            one_thing_date=1,
            one_thing_replacement="test2"
        )
        print("\nRendered HTML snippet for task 69:")
        for line in rendered.split('\n'):
            if "sticker-count" in line or "sticker-icon-mini" in line or "task 69" in line:
                print(line.strip())

if __name__ == "__main__":
    asyncio.run(run())
