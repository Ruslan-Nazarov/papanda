from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import Dict, Any, List
from datetime import datetime, timezone, timedelta

from ..database import get_db
from .. import models
from ..services.auth import check_auth_dependency
from ..logger import logger

router = APIRouter(
    prefix="/api/observations",
    tags=["observations"]
)

@router.post("/")
async def create_observation(
    data: Dict[str, Any] = Body(...),
    db: AsyncSession = Depends(get_db),
    user=Depends(check_auth_dependency)
):
    try:
        text = data.get("text")
        if not text:
            raise HTTPException(status_code=400, detail="Text is required")
        
        no_time_val = bool(data.get("no_time", False))
        
        import random
        
        if no_time_val:
            # Трюк: назначаем случайное время в течение дня для равномерного распределения в дереве
            now = datetime.now()
            hr = random.randint(6, 23) # Распределяем в активное время суток
            mn = random.randint(0, 59)
            created_at = now.replace(hour=hr, minute=mn, second=0, microsecond=0)
        else:
            time_str = data.get("created_at")
            hr, mn = 0, 0
            if time_str and isinstance(time_str, str) and ':' in time_str:
                try:
                    parts = time_str.split(':')
                    if len(parts) >= 2:
                        hr, mn = int(parts[0]), int(parts[1])
                except (ValueError, TypeError):
                    logger.warning(f"Invalid time format received: {time_str}")
            
            now = datetime.now()
            created_at = now.replace(hour=hr, minute=mn, second=0, microsecond=0)
        
        no_time_val = bool(data.get("no_time", False))
        obs = models.Observation(
            text=text,
            priority=int(data.get("priority", 1)),
            is_main=bool(data.get("is_main", False)),
            status=data.get("status", "periodic"),
            created_at=created_at,
            end_time=data.get("end_time"),
            no_time=no_time_val
        )
        if obs.is_main:
            obs.priority = 5
            
        db.add(obs)
        await db.flush() # Get obs.id
        
        obs_id = obs.id # Store ID to avoid accessing obs object later

        # Handle done_days
        if "done_days" in data:
            new_days = set(data["done_days"])
            start_of_week = now - timedelta(days=now.weekday())
            
            for day_idx in new_days:
                diff = day_idx - now.weekday()
                log_date = now + timedelta(days=diff)
                log_time = created_at.time() if not no_time_val else now.time()
                done_at = datetime.combine(log_date.date(), log_time)
                db.add(models.ObservationLog(observation_id=obs_id, done_at=done_at))
        
        await db.commit()
        return {"status": "success", "id": obs_id}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating observation: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.patch("/{obs_id}")
async def update_observation(
    obs_id: int,
    data: Dict[str, Any] = Body(...),
    db: AsyncSession = Depends(get_db),
    user=Depends(check_auth_dependency)
):
    try:
        res = await db.execute(select(models.Observation).where(models.Observation.id == obs_id))
        obs = res.scalar_one_or_none()
        if not obs:
            raise HTTPException(status_code=404, detail="Observation not found")
        
        if "text" in data:
            obs.text = data["text"]
        if "priority" in data:
            obs.priority = int(data["priority"])
        if "is_main" in data:
            obs.is_main = bool(data["is_main"])
            if obs.is_main:
                obs.priority = 5 # Auto-set max priority for main tasks
        if "status" in data:
            obs.status = data["status"]
        if "end_time" in data:
            obs.end_time = data["end_time"]
        if "no_time" in data:
            obs.no_time = bool(data["no_time"])
        if "created_at" in data:
            # Assuming created_at comes as "HH:MM", we apply it to today's date or similar.
            # To be safe, parse it and replace the time part of the existing created_at.
            time_str = data["created_at"]
            if time_str:
                try:
                    time_parts = time_str.split(':')
                    hr = int(time_parts[0])
                    mn = int(time_parts[1])
                    existing = obs.created_at or datetime.now(timezone.utc)
                    obs.created_at = existing.replace(hour=hr, minute=mn, second=0)
                except Exception as e:
                    logger.warning(f"Failed to parse time {time_str}: {e}")

        if "done_days" in data:
            # data["done_days"] is a list of integers (0-6)
            new_days = set(data["done_days"])
            
            # 1. Get current week's logs
            now = datetime.now()
            start_of_week = now - timedelta(days=now.weekday())
            start_of_week_dt = datetime.combine(start_of_week.date(), datetime.min.time())
            
            # 2. Fetch existing logs for this week
            logs_res = await db.execute(
                select(models.ObservationLog)
                .where(
                    models.ObservationLog.observation_id == obs_id,
                    models.ObservationLog.done_at >= start_of_week_dt
                )
            )
            existing_logs = logs_res.scalars().all()
            existing_days_map = {log.done_at.weekday(): log for log in existing_logs}
            existing_days = set(existing_days_map.keys())
            
            # 3. Add missing logs
            for day_idx in new_days - existing_days:
                diff = day_idx - now.weekday()
                log_date = now + timedelta(days=diff)
                # Keep original time if possible, or use current time
                log_time = obs.created_at.time() if obs.created_at else now.time()
                done_at = datetime.combine(log_date.date(), log_time)
                
                db.add(models.ObservationLog(observation_id=obs_id, done_at=done_at))
            
            # 4. Remove unchecked logs
            for day_idx in existing_days - new_days:
                db.delete(existing_days_map[day_idx])

        await db.commit()
        return {"status": "success"}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating observation {obs_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{obs_id}")
async def delete_observation(
    obs_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(check_auth_dependency)
):
    try:
        await db.execute(delete(models.Observation).where(models.Observation.id == obs_id))
        await db.commit()
        return {"status": "success"}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting observation {obs_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/{obs_id}/log")
async def log_observation(
    obs_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(check_auth_dependency)
):
    try:
        obs_res = await db.execute(select(models.Observation).where(models.Observation.id == obs_id))
        if not obs_res.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Observation not found")
        
        log = models.ObservationLog(
            observation_id=obs_id,
            done_at=datetime.now()
        )
        db.add(log)
        await db.commit()
        return {"status": "success"}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error logging observation {obs_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
