import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, date

from ..utils import normalize_date
from .. import models

logger = logging.getLogger(__name__)

class HistoryService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_recent_for_model(self, model_class, date_col_name: str, target_d: date, is_today_mode: bool, current_year: int):
        """Ищет записи для модели: либо за конкретный день, либо ближайшие."""
        date_col = getattr(model_class, date_col_name)

        if is_today_mode:
            # Режим "В этот день" — ищем за это число в прошлые годы
            md = target_d.strftime("%m-%d")
            year_str = str(current_year)

            res = await self.db.execute(select(model_class).where(
                func.strftime("%m-%d", date_col) == md,
                func.strftime("%Y", date_col) != year_str
            ).order_by(date_col.desc()))
            items = res.scalars().all()

            if not items:
                # Если за это число ничего нет — ищем ближайшую запись ВООБЩЕ в прошлом (до сегодняшнего дня)
                res = await self.db.execute(select(model_class).where(
                    func.date(date_col) < func.date(target_d)
                ).order_by(date_col.desc()).limit(1))
                last_item = res.scalar_one_or_none()
                if last_item:
                    last_d_raw = getattr(last_item, date_col_name)
                    # Нормализуем через нашу утилиту
                    last_d_dt = normalize_date(last_d_raw)
                    if last_d_dt:
                        last_d = last_d_dt.date() if isinstance(last_d_dt, datetime) else last_d_dt
                        start_dt = datetime.combine(last_d, datetime.min.time())
                        end_dt = datetime.combine(last_d, datetime.max.time())
                        res = await self.db.execute(select(model_class).where(
                            date_col >= start_dt, date_col <= end_dt
                        ).order_by(date_col.desc()))
                        items = res.scalars().all()
        else:
            # Режим конкретной даты
            start_dt = datetime.combine(target_d, datetime.min.time())
            end_dt = datetime.combine(target_d, datetime.max.time())

            res = await self.db.execute(select(model_class).where(
                date_col >= start_dt, date_col <= end_dt
            ).order_by(date_col.desc()))
            items = res.scalars().all()

            if not items:
                # Если за этот день пусто — ищем ближайшую запись (в прошлом или будущем)
                # 1. Ближайшая в прошлом
                res_past = await self.db.execute(select(model_class).where(
                    func.date(date_col) < func.date(target_d)
                ).order_by(date_col.desc()).limit(1))
                item_past = res_past.scalar_one_or_none()

                # 2. Ближайшая в будущем
                res_future = await self.db.execute(select(model_class).where(
                    func.date(date_col) > func.date(target_d)
                ).order_by(date_col.asc()).limit(1))
                item_future = res_future.scalar_one_or_none()

                best_item = None
                if item_past and item_future:
                    d_past_dt = normalize_date(getattr(item_past, date_col_name))
                    d_future_dt = normalize_date(getattr(item_future, date_col_name))

                    if d_past_dt and d_future_dt:
                        if isinstance(d_past_dt, date) and not isinstance(d_past_dt, datetime):
                            d_past_dt = datetime.combine(d_past_dt, datetime.min.time())
                        if isinstance(d_future_dt, date) and not isinstance(d_future_dt, datetime):
                            d_future_dt = datetime.combine(d_future_dt, datetime.min.time())

                        target_dt = datetime.combine(target_d, datetime.min.time())
                        if (target_dt - d_past_dt) <= (d_future_dt - target_dt):
                            best_item = item_past
                        else:
                            best_item = item_future
                    else:
                        best_item = item_past or item_future
                else:
                    best_item = item_past or item_future

                if best_item:
                    best_d_raw = getattr(best_item, date_col_name)
                    best_d_dt = normalize_date(best_d_raw)
                    if best_d_dt:
                        best_d = best_d_dt.date() if isinstance(best_d_dt, datetime) else best_d_dt
                        s_dt = datetime.combine(best_d, datetime.min.time())
                        e_dt = datetime.combine(best_d, datetime.max.time())
                        res = await self.db.execute(select(model_class).where(
                            date_col >= s_dt, date_col <= e_dt
                        ).order_by(date_col.desc()))
                        items = res.scalars().all()

        return items

    async def get_history_for_date(self, target_date: date, is_today_in_history: bool):
        current_year = datetime.now().date().year
        events = await self.get_recent_for_model(models.Event, "date", target_date, is_today_in_history, current_year)
        chronology = await self.get_recent_for_model(models.Chronology, "date", target_date, is_today_in_history, current_year)
        notes = await self.get_recent_for_model(models.Notes, "created_at", target_date, is_today_in_history, current_year)
        wink = await self.get_recent_for_model(models.Wink, "date", target_date, is_today_in_history, current_year)
        return events, chronology, notes, wink
