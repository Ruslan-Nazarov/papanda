from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, date
from typing import Optional, List, Dict, Any, Union, Type

from .. import models
from .admin.view_builders import ViewBuilders
from ..logger import logger

class AdminService:
    """Сервис для административных функций. Делегирует построение вьюх ViewBuilders."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.builders = ViewBuilders(db)
        self.MODEL_MAP = {
            'Event': models.Event, 'Habit': models.Habit, 'Task': models.Task, 
            'HabitsDone': models.HabitsDone, 'Chronology': models.Chronology, 
            'Notes': models.Notes, 'Wink': models.Wink, 'WordStats': models.WordStats,
            'Stickers': models.StickyNote
        }

    def get_model(self, name: str) -> Optional[Type[Any]]:
        if name == 'Habits': name = 'Habit'
        return self.MODEL_MAP.get(name)

    async def update_item(self, model_name: str, item_id: Union[int, str], data: Dict[str, Any]) -> bool:
        """Универсальное обновление записи в БД с приведением типов."""
        from ..utils import parse_date_input

        Model = self.get_model(model_name)
        if not Model: return False
            
        pk_name = 'word' if model_name == 'WordStats' else 'id'
        res = await self.db.execute(select(Model).where(getattr(Model, pk_name) == item_id))
        item = res.scalar_one_or_none()
        if not item: return False
            
        for col in [c.name for c in Model.__table__.columns]:
            if col in [pk_name, 'created_at'] or col not in data: continue
            val = data[col]
            col_attr = getattr(Model, col)
            if hasattr(col_attr.type, 'python_type'):
                col_type = col_attr.type.python_type
                if issubclass(col_type, (date, datetime)) and val:
                    val = parse_date_input(str(val))
                    if col_type == date and isinstance(val, datetime): val = val.date()
                elif col_type == bool: val = str(val).lower() in ['true', '1', 'on']
                elif col_type == int and val:
                    try: val = int(val)
                    except: pass
            setattr(item, col, val)

        if model_name == 'Habit' and 'read' in data:
            item.end_date = date.today() if item.read and not item.end_date else (None if not item.read else item.end_date)

        await self.db.commit()
        logger.info(f"[AdminService] Updated {model_name} {pk_name}={item_id}")
        return True

    async def get_db_view_context(self, model_name: str, **kwargs) -> Dict[str, Any]:
        """Собирает контекст для универсального просмотрщика таблиц."""
        Model = self.get_model(model_name)
        if not Model: raise ValueError(f"Model {model_name} not found")

        now = datetime.now()
        month, year, day = kwargs.get('month') or now.month, kwargs.get('year') or now.year, kwargs.get('day')
        search, category, sort = kwargs.get('search'), kwargs.get('category'), kwargs.get('sort')
        page, page_size = kwargs.get('page', 1), kwargs.get('page_size', 20)

        records, extra_ctx = [], {}

        if model_name == 'Event':
            records, extra_ctx = await self.builders.get_events_view(Model, month, year, day, search)
        elif model_name == 'Habit':
            records, extra_ctx = await self.builders.get_habits_view(Model, search)
        elif model_name == 'Task':
            records, extra_ctx = await self.builders.get_tasks_view(Model, search)
        elif model_name == 'Chronology':
            records, extra_ctx = await self.builders.get_chronology_view(Model, search)
        elif model_name == 'Notes':
            records, extra_ctx = await self.builders.get_notes_view(Model, category, sort, search)
        elif model_name == 'Wink':
            records, extra_ctx = await self.builders.get_wink_view(Model, search)
        elif model_name == 'Stickers':
            records, extra_ctx = await self.builders.get_stickers_view(Model, category, sort, search, page, page_size)
        else:
            query = select(Model)
            if hasattr(Model, 'id'): query = query.order_by(Model.id.desc())
            records = list((await self.db.execute(query)).scalars().all())

        total_in_db = (await self.db.execute(select(func.count()).select_from(Model))).scalar() or 0

        return {
            "records": records, "columns": [c.name for c in Model.__table__.columns],
            "model_name": model_name, "total_in_db": total_in_db,
            "now_iso": now.date().isoformat(), "today_date": now.date(), **extra_ctx
        }
