from fastapi import APIRouter, Depends, HTTPException, Request, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
import random

from ..database import get_db
from .. import models
from ..services.auth import check_auth_dependency
from ..logger import logger

router = APIRouter(
    prefix="/api/observations",
    tags=["observations"]
)

@router.get("/active-tasks")
async def get_active_tasks(
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> List[Dict[str, Any]]:
    """Возвращает список невыполненных задач."""
    res = await db.execute(
        select(models.Task.id, models.Task.name)
        .where(models.Task.done == False)
        .order_by(models.Task.position.asc())
    )
    tasks = [{"id": r[0], "name": r[1]} for r in res.all()]
    return tasks

@router.post("/")
async def create_observation(
    data: Dict[str, Any] = Body(...),
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Dict[str, Any]:
    """
    Создает новое наблюдение (задачу).
    
    Args:
        data: Данные наблюдения (text, priority, is_main, status, created_at, end_time, no_time, done_days).
        db: Асинхронная сессия БД.
        user: Текущий пользователь.
        
    Returns:
        Dict[str, Any]: Статус и ID созданного объекта.
    """
    text = data.get("text")
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    
    no_time_val = bool(data.get("no_time", False))
    now = datetime.now()
    
    hr, mn = 0, 0
    if not no_time_val:
        time_str = data.get("created_at")
        if time_str and isinstance(time_str, str) and ':' in time_str:
            try:
                parts = time_str.split(':')
                if len(parts) >= 2:
                    hr, mn = int(parts[0]), int(parts[1])
            except (ValueError, TypeError):
                logger.warning(f"Invalid time format received: {time_str}")
    else:
        # For "no_time", we use a very late time or just rely on sorting
        hr, mn = 23, 59 # Put them at the end of the day by default
        
    created_at = now.replace(hour=hr, minute=mn, second=0, microsecond=0)
    
    obs = models.Observation(
        text=text,
        created_at=created_at,
        no_time=no_time_val,
        task_id=data.get("task_id")
    )
    if obs.task_id:
        obs.priority = 5 # Force high priority (bright) for tasks
        
    try:
        db.add(obs)
        await db.flush()
        
        obs_id = obs.id

        if "done_days" in data:
            new_days = set(data["done_days"])
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
        logger.error(f"OBS CREATION ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.patch("/{obs_id}")
async def update_observation(
    obs_id: int,
    data: Dict[str, Any] = Body(...),
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Dict[str, str]:
    """
    Обновляет существующее наблюдение.
    
    Args:
        obs_id: ID наблюдения.
        data: Новые данные.
        db: Асинхронная сессия БД.
        user: Текущий пользователь.
        
    Returns:
        Dict[str, str]: Статус операции.
    """
    res = await db.execute(select(models.Observation).where(models.Observation.id == obs_id))
    obs = res.scalar_one_or_none()
    if not obs:
        raise HTTPException(status_code=404, detail="Observation not found")
    
    if "text" in data:
        obs.text = data["text"]
    if "no_time" in data:
        obs.no_time = bool(data["no_time"])
        if obs.no_time:
            obs.created_at = (obs.created_at or datetime.now()).replace(hour=23, minute=59)
            
    if "task_id" in data:
        obs.task_id = data["task_id"]
        if obs.task_id:
            obs.priority = 5
        else:
            obs.priority = 1

    if "created_at" in data and not obs.no_time:
        time_str = data["created_at"]
        if time_str:
            try:
                time_parts = time_str.split(':')
                hr = int(time_parts[0])
                mn = int(time_parts[1])
                existing = obs.created_at or datetime.now()
                obs.created_at = existing.replace(hour=hr, minute=mn, second=0)
            except Exception as e:
                logger.warning(f"Failed to parse time {time_str}: {e}")

    if "done_days" in data:
        new_days = set(data["done_days"])
        now = datetime.now()
        start_of_week = now - timedelta(days=now.weekday())
        start_of_week_dt = datetime.combine(start_of_week.date(), datetime.min.time())
        
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
        
        for day_idx in new_days - existing_days:
            diff = day_idx - now.weekday()
            log_date = now + timedelta(days=diff)
            log_time = obs.created_at.time() if obs.created_at else now.time()
            done_at = datetime.combine(log_date.date(), log_time)
            db.add(models.ObservationLog(observation_id=obs_id, done_at=done_at))
        
        for day_idx in existing_days - new_days:
            await db.delete(existing_days_map[day_idx])

    await db.commit()
    return {"status": "success"}

@router.delete("/{obs_id}")
async def delete_observation(
    obs_id: int,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Dict[str, str]:
    """Удаляет наблюдение."""
    await db.execute(delete(models.Observation).where(models.Observation.id == obs_id))
    await db.commit()
    return {"status": "success"}



@router.get("/full-tree")
async def get_full_tree(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
):
    """Возвращает HTML-разметку ПОЛНОГО дерева наблюдений."""
    from ..services.observation_service import ObservationService
    from ..config import templates
    from datetime import datetime
    
    service = ObservationService(db)
    today = datetime.now().date()
    observations = await service.get_dashboard_observations(today) # No limit
    
    return templates.TemplateResponse("observation_widget.html", {
        "request": request, 
        "observations": observations
    })
