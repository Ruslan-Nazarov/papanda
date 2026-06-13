from fastapi import APIRouter, Depends, Request, status, UploadFile, File, HTTPException
from fastapi.responses import RedirectResponse, FileResponse, JSONResponse
import os
import shutil
from typing import Any
from pathlib import Path
from ...config import settings
from ...services.auth import check_auth_dependency, COOKIE_NAME
from ...services.maintenance_service import MaintenanceService
from ...dependencies import get_maintenance_service
from ...logger import logger

router = APIRouter(
    dependencies=[Depends(check_auth_dependency)]
)


def _safe_db_path(filename: str) -> Path:
    """
    Возвращает безопасный путь к файлу .db внутри db_dir.
    Вызывает HTTPException(400) при попытке path traversal или неверном расширении.
    """
    safe_name = os.path.basename(filename)  # убираем любые ../
    if not safe_name.endswith(".db"):
        raise HTTPException(status_code=400, detail="Only .db files are allowed")
    resolved = (settings.db_dir / safe_name).resolve()
    db_dir_resolved = settings.db_dir.resolve()
    if not str(resolved).startswith(str(db_dir_resolved)):
        raise HTTPException(status_code=400, detail="Invalid filename")
    return resolved

@router.get("/settings/download_db/{filename}", name="download_db")
async def download_db(filename: str) -> FileResponse:
    """Позволяет скачать файл базы данных."""
    file_path = _safe_db_path(filename)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path=file_path, filename=file_path.name, media_type="application/x-sqlite3")

@router.post("/settings/upload_db", name="upload_db")
async def upload_db(db_file: UploadFile = File(...)) -> RedirectResponse:
    """Загружает файл базы данных."""
    # Безопасное имя файла — только basename, без ../ 
    safe_name = os.path.basename(db_file.filename or "")
    if not safe_name.endswith(".db"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only .db allowed.")
    
    # Проверяем SQLite magic bytes
    header = await db_file.read(16)
    if not header.startswith(b"SQLite format 3\x00"):
        raise HTTPException(status_code=400, detail="Invalid SQLite file format")
    await db_file.seek(0)
    
    file_path = settings.db_dir / safe_name
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(db_file.file, buffer)
    
    return RedirectResponse(url="/settings", status_code=status.HTTP_303_SEE_OTHER)

@router.post("/settings/delete_db/{filename}", name="delete_db_file")
async def delete_db_file(
    filename: str,
    ms: MaintenanceService = Depends(get_maintenance_service)
) -> RedirectResponse:
    """Удаляет файл базы данных."""
    try:
        await ms.delete_backup(filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return RedirectResponse(url="/settings", status_code=status.HTTP_303_SEE_OTHER)

@router.post("/settings/activate_db/{filename}", name="activate_db")
async def activate_db(
    filename: str,
    ms: MaintenanceService = Depends(get_maintenance_service)
) -> RedirectResponse:
    """Активирует базу данных (миграция)."""
    try:
        await ms.sync_data_from_file(filename)
    except Exception as e:
        logger.error(f"Data migration failed: {e}")
        raise HTTPException(status_code=500, detail=f"Data migration failed: {e}")
    return RedirectResponse(url="/settings", status_code=status.HTTP_303_SEE_OTHER)

@router.post("/settings/deep_clean", name="deep_clean")
async def deep_clean(
    ms: MaintenanceService = Depends(get_maintenance_service)
) -> RedirectResponse:
    """Полная очистка приложения (Deep Clean)."""
    try:
        await ms.deep_clean()
    except Exception as e:
        logger.error(f"Deep clean failed: {e}")
    
    response = RedirectResponse(url="/register", status_code=status.HTTP_302_FOUND)
    response.delete_cookie(COOKIE_NAME)
    return response

@router.post("/settings/start_sandbox", name="start_sandbox")
async def start_sandbox() -> RedirectResponse:
    """Включает режим песочницы."""
    response = RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)
    response.set_cookie(key="papanda_mode", value="sandbox", httponly=True, max_age=3600)
    return response

@router.post("/settings/exit_sandbox", name="exit_sandbox")
async def exit_sandbox() -> RedirectResponse:
    """Выключает режим песочницы."""
    response = RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)
    response.delete_cookie("papanda_mode")
    return response

from ... import schemas

@router.post("/settings/shutdown_app", response_model=schemas.SuccessResponse)
async def shutdown_app() -> Any:
    """Завершает работу сервера."""
    import threading
    import time
    import signal
    
    def kill_self():
        time.sleep(1)
        os.kill(os.getpid(), signal.SIGTERM)
        
    threading.Thread(target=kill_self, daemon=True).start()
    return schemas.SuccessResponse(message="Приложение завершает работу.")
