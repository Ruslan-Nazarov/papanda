from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse, StreamingResponse, HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
import io
from typing import Any

from ...database import get_db
from ...services.auth import check_auth_dependency
from ...services.admin_service import AdminService
from ...services.export_service import ExportService
from ...services.state_manager import StateManager
from ...services.settings_service import get_settings_context
from ...dependencies import get_admin_service, get_export_service, get_state_manager
from ...config import settings, templates
from ...logger import logger
from ... import schemas

router = APIRouter(
    dependencies=[Depends(check_auth_dependency)]
)

@router.get("/settings/export/{model_name}", name="export_csv")
async def export_csv(
    model_name: str, 
    as_service: AdminService = Depends(get_admin_service),
    export_service: ExportService = Depends(get_export_service)
) -> Any:
    """Экспорт в CSV."""
    Model = as_service.get_model(model_name)
    if not Model: return RedirectResponse(url="/settings")
    content = await export_service.export_to_csv(Model)
    return StreamingResponse(
        io.BytesIO(content),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=papanda_{model_name.lower()}.csv"}
    )

@router.get("/settings/export_excel/{model_name}", name="export_excel")
async def export_excel(
    model_name: str, 
    as_service: AdminService = Depends(get_admin_service),
    export_service: ExportService = Depends(get_export_service)
) -> Any:
    """Экспорт в Excel."""
    Model = as_service.get_model(model_name)
    if not Model: return RedirectResponse(url="/settings")
    content = await export_service.export_model_to_excel(Model)
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=papanda_{model_name.lower()}.xlsx"}
    )

@router.post("/settings/import_excel", name="import_excel", response_class=HTMLResponse)
async def import_excel_route(
    request: Request,
    db: AsyncSession = Depends(get_db),
    state_manager: StateManager = Depends(get_state_manager),
) -> Any:
    """Импорт из Excel."""
    # Этот эндпоинт не имеет тела, но мы можем добавить пустую схему если нужно.
    # Но для POST без тела Pydantic не обязателен в аргументах если он не ожидается.
    result = await state_manager.import_excel_to_db(str(settings.excel_path))
    ctx = await get_settings_context(db, request, import_result=result)
    return templates.TemplateResponse(request, "settings.html", ctx)


@router.post("/settings/sync_conflicts", name="sync_conflicts", response_class=HTMLResponse)
async def sync_conflicts_route(
    request: Request,
    data: schemas.ConflictResolutionSchema = Depends(schemas.ConflictResolutionSchema.as_form),
    db: AsyncSession = Depends(get_db),
    state_manager: StateManager = Depends(get_state_manager),
) -> Any:
    """Разрешение конфликтов синхронизации."""
    extra_fields = data.model_extra or {}
    resolutions = {k[len("action_"):]: str(v) for k, v in extra_fields.items() if k.startswith("action_") and v in ("to_db", "to_file")}
    result = await state_manager.sync_conflicts(str(settings.excel_path), resolutions)
    ctx = await get_settings_context(db, request, import_result=result)
    return templates.TemplateResponse(request, "settings.html", ctx)
