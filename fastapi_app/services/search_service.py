from typing import Any
from ..logger import logger
from ..services.admin_service import AdminService

class SearchService:
    @staticmethod
    def format_record(r: Any, model_name: str, add_prefix: bool = False) -> dict[str, Any]:
        res = {"id": getattr(r, 'id', getattr(r, 'word', None)), "model": model_name}
        prefix_map = {
            'Event': '📅 [Event] ',
            'Notes': '📝 [Note] ',
            'Stickers': '📋 [Sticker] ',
            'Chronology': '🕒 [Chrono] ',
            'Habit': '🔄 [Habit] ',
            'Task': '✅ [Task] ',
            'Wink': '✨ [Wink] '
        }
        pref = prefix_map.get(model_name, "") if add_prefix else ""

        if model_name == 'Event':
            date_val = getattr(r, 'date', '')
            date_str = date_val.isoformat() if hasattr(date_val, 'isoformat') else str(date_val)
            res.update({"title": f"{pref}{getattr(r, 'title', '')}", "date": date_str})
        elif model_name == 'Notes':
            note_val = getattr(r, 'note', '') or ''
            text_val = note_val[:100] + "..." if len(note_val) > 100 else note_val
            res.update({"title": f"{pref}{getattr(r, 'category', '')}", "text": text_val})
        elif model_name == 'Stickers':
            text_val = getattr(r, 'text', '') or ''
            res.update({"title": f"{pref}{getattr(r, 'title', '')}", "text": text_val[:100]})
        elif model_name == 'Chronology':
            date_val = getattr(r, 'date', '')
            date_str = date_val.isoformat() if hasattr(date_val, 'isoformat') else str(date_val)
            res.update({"title": f"{pref}{getattr(r, 'title', '')}", "date": date_str})
        elif model_name == 'Habit':
            res.update({"title": f"{pref}{getattr(r, 'title', '')}", "text": f"Started: {getattr(r, 'start_date', '')}"})
        elif model_name == 'Task':
            created_val = getattr(r, 'created_at', None)
            created_str = created_val.strftime('%d.%m.%Y') if created_val and hasattr(created_val, 'strftime') else str(created_val)
            res.update({"title": f"{pref}{getattr(r, 'name', '')}", "text": f"Created: {created_str}"})
        elif model_name == 'Wink':
            date_val = getattr(r, 'date', '')
            date_str = date_val.isoformat() if hasattr(date_val, 'isoformat') else str(date_val)
            res.update({"title": f"{pref}{getattr(r, 'title', '')}", "date": date_str})
        else:
            res.update({"title": f"{pref}{str(r)}"})
        return res

    @classmethod
    async def global_search(
        cls, as_service: AdminService, search_query: str, model_name: str, 
        category: str | None = None, sort: str | None = None, page: int = 1
    ) -> list[dict[str, Any]]:
        results = []
        if model_name.lower() == 'all':
            models_to_search = ['Event', 'Notes', 'Stickers', 'Chronology', 'Habit', 'Task', 'Wink']
            for m in models_to_search:
                try:
                    ctx = await as_service.get_db_view_context(
                        model_name=m, search=search_query, category=category, sort=sort, page=page
                    )
                    for r in ctx["records"]:
                        results.append(cls.format_record(r, m, add_prefix=True))
                except Exception as ex:
                    logger.error(f"Error searching model {m}: {ex}")
        else:
            ctx = await as_service.get_db_view_context(
                model_name=model_name, search=search_query, category=category, sort=sort, page=page
            )
            for r in ctx["records"]:
                results.append(cls.format_record(r, model_name, add_prefix=False))
        return results
