from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from .. import models
from ..logger import logger

class ObservationService:
    """Service for managing observation logs and status tracking."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_dashboard_observations(self, today_obj: date) -> List[Dict[str, Any]]:
        """
        Fetches all active observations and calculates completion status for the current week.
        """
        try:
            # Fetch all active observations
            obs_res = await self.db.execute(
                select(models.Observation)
                .order_by(models.Observation.priority.desc(), models.Observation.created_at.asc())
            )
            all_observations = obs_res.scalars().all()
            
            # Start of the current week (Monday)
            start_of_week_dt = datetime.combine(today_obj - timedelta(days=today_obj.weekday()), datetime.min.time())
            
            observations_data = []
            if all_observations:
                # Fetch logs for the current week
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
                        "priority": obs.priority,
                        "is_main": obs.is_main,
                        "status": getattr(obs, "status", "periodic"),
                        "created_at": obs.created_at,
                        "done_days": logs_by_obs.get(obs.id, [])
                    })
            return observations_data
        except Exception as e:
            logger.error(f"Error fetching observation data: {e}", exc_info=True)
            return []

    async def log_observation(self, observation_id: int, done_at: Optional[datetime] = None) -> bool:
        """Logs a completion for an observation."""
        try:
            log = models.ObservationLog(
                observation_id=observation_id,
                done_at=done_at or datetime.now()
            )
            self.db.add(log)
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error logging observation {observation_id}: {e}")
            return False
