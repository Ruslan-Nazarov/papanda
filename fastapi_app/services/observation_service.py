from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from .. import models
from ..logger import logger

class ObservationService:
    """Service for managing observation logs, sets and status tracking."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def ensure_active_set(self) -> models.ObservationSet:
        """Гарантирует существование активного набора наблюдений."""
        res = await self.db.execute(select(models.ObservationSet).where(models.ObservationSet.is_active == True))
        active_set = res.scalar_one_or_none()
        if not active_set:
            res_any = await self.db.execute(select(models.ObservationSet).order_by(models.ObservationSet.id.asc()))
            first_set = res_any.scalars().first()
            if first_set:
                first_set.is_active = True
                await self.db.commit()
                return first_set
            else:
                new_set = models.ObservationSet(name="Основной", is_active=True)
                self.db.add(new_set)
                await self.db.flush()
                # Привязываем существующие наблюдения без набора к этому набору
                res_obs = await self.db.execute(select(models.Observation).where(models.Observation.set_id == None))
                for obs in res_obs.scalars().all():
                    obs.set_id = new_set.id
                await self.db.commit()
                return new_set
        return active_set

    async def get_all_sets(self) -> List[models.ObservationSet]:
        """Возвращает список всех наборов наблюдений."""
        await self.ensure_active_set()
        res = await self.db.execute(select(models.ObservationSet).order_by(models.ObservationSet.id.asc()))
        return list(res.scalars().all())

    async def create_set(self, name: str, clone_from_active: bool = False) -> models.ObservationSet:
        """Создает новый набор наблюдений и опционально копирует элементы из активного."""
        active_set = await self.ensure_active_set()
        
        # Деактивируем текущие наборы
        res_all = await self.db.execute(select(models.ObservationSet))
        for s in res_all.scalars().all():
            s.is_active = False
            
        new_set = models.ObservationSet(name=name, is_active=True)
        self.db.add(new_set)
        await self.db.flush()
        
        if clone_from_active and active_set:
            res_obs = await self.db.execute(select(models.Observation).where(models.Observation.set_id == active_set.id))
            for obs in res_obs.scalars().all():
                clone_obs = models.Observation(
                    text=obs.text,
                    priority=obs.priority,
                    is_main=obs.is_main,
                    status=obs.status,
                    created_at=obs.created_at,
                    end_time=obs.end_time,
                    no_time=obs.no_time,
                    task_id=obs.task_id,
                    set_id=new_set.id
                )
                self.db.add(clone_obs)
                
        await self.db.commit()
        return new_set

    async def activate_set(self, set_id: int) -> Optional[models.ObservationSet]:
        """Делает указанный набор активным."""
        res = await self.db.execute(select(models.ObservationSet).where(models.ObservationSet.id == set_id))
        target_set = res.scalar_one_or_none()
        if not target_set:
            return None
            
        res_all = await self.db.execute(select(models.ObservationSet))
        for s in res_all.scalars().all():
            s.is_active = (s.id == set_id)
            
        await self.db.commit()
        return target_set

    async def get_dashboard_observations(self, today_obj: date, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Fetches active observations for the current active set and calculates completion status.
        """
        try:
            active_set = await self.ensure_active_set()
            
            # Fetch active observations for current set
            query = select(models.Observation).where(models.Observation.set_id == active_set.id).order_by(models.Observation.created_at.asc(), models.Observation.id.asc())
            if limit:
                query = query.limit(limit)
                
            obs_res = await self.db.execute(query)
            all_observations = obs_res.scalars().all()
            
            # Start of the current week (Monday)
            start_of_week_dt = datetime.combine(today_obj - timedelta(days=today_obj.weekday()), datetime.min.time())
            
            observations_data = []
            if all_observations:
                logs_res = await self.db.execute(
                    select(models.ObservationLog)
                    .where(
                        models.ObservationLog.observation_id.in_([o.id for o in all_observations]), 
                        models.ObservationLog.done_at >= start_of_week_dt
                    )
                )
                
                logs_by_obs = {}
                for log in logs_res.scalars().all():
                    logs_by_obs.setdefault(log.observation_id, []).append(log.done_at.weekday())
 
                for obs in all_observations:
                    observations_data.append({
                        "id": obs.id,
                        "text": obs.text,
                        "created_at": obs.created_at,
                        "no_time": obs.no_time,
                        "task_id": obs.task_id,
                        "done_days": logs_by_obs.get(obs.id, [])
                    })
            return observations_data
        except Exception as e:
            logger.error(f"Error fetching observation data: {e}", exc_info=True)
            return []
