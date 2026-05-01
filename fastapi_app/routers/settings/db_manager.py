from fastapi import APIRouter, Depends, Request, status, HTMLResponse
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from datetime import datetime, date
from typing import Optional, Any, Union
import calendar

from ...database import get_db
from ... import models
from ...services.auth import check_auth_dependency
from ...services.admin_service import AdminService
from ...dependencies import get_admin_service
from ...utils import is_ajax_request
from ...config import templates

router = APIRouter(
    dependencies=[Depends(check_auth_dependency)]
)

@router.get("/db_view/{model_name}", name="db_view", response_class=HTMLResponse)
async def db_view(
    request: Request,
    model_name: str,
    month: Optional[str] = None,
    day: Optional[str] = None,
    year: Optional[str] = None,
    search: Optional[str] = None,
    category: Optional[str] = None,
    sort: Optional[str] = None,
    page: int = 1,
    as_service: AdminService = Depends(get_admin_service)
) -> Any:
    """Просмотрщик таблиц БД."""
    i_month = int(month) if month and month.strip() else None
    i_day = int(day) if day and day.strip() else None
    i_year = int(year) if year and year.strip() else None
    s_search = search.strip() if search and search.strip() else None

    try:
        ctx = await as_service.get_db_view_context(
            model_name=model_name, month=i_month, day=i_day, year=i_year,
            search=s_search, category=category, sort=sort, page=page
        )
    except ValueError:
        return RedirectResponse(url="/")

    ctx["request"] = request
    return templates.TemplateResponse(request, "db_view.html", ctx)

@router.get("/edit_record/{model_name}/{record_id}", name="edit_record", response_class=HTMLResponse)
async def edit_record_get(
    request: Request, 
    model_name: str, 
    record_id: str, 
    db: AsyncSession = Depends(get_db),
    as_service: AdminService = Depends(get_admin_service)
) -> Any:
    """Форма редактирования записи."""
    Model = as_service.get_model(model_name)
    if not Model: return RedirectResponse(url="/")

    pk_name = 'word' if model_name == 'WordStats' else 'id'
    pk_val: Union[str, int] = int(record_id) if pk_name == 'id' and record_id.isdigit() else record_id

    record_res = await db.execute(select(Model).where(getattr(Model, pk_name) == pk_val))
    record = record_res.scalar_one_or_none()
    if not record: return RedirectResponse(url=f"/db_view/{model_name}")

    columns = [c.name for c in Model.__table__.columns]
    return templates.TemplateResponse(request, "db_edit.html", {
        "request": request, "record": record, "columns": columns, "model_name": model_name
    })

@router.post("/edit_record/{model_name}/{record_id}")
async def edit_record_post(
    request: Request,
    model_name: str,
    record_id: str,
    as_service: AdminService = Depends(get_admin_service)
) -> RedirectResponse:
    """Сохранение изменений записи."""
    form_data = await request.form()
    data = {k: v for k, v in form_data.items() if k not in ['id', 'created_at', 'word']}
    await as_service.update_item(model_name, record_id, data)
    return RedirectResponse(url=f"/db_view/{model_name}", status_code=status.HTTP_303_SEE_OTHER)

@router.post("/delete_record/{model_name}/{record_id}", name="delete_record")
async def delete_record(
    request: Request,
    model_name: str,
    record_id: str,
    db: AsyncSession = Depends(get_db),
    as_service: AdminService = Depends(get_admin_service),
) -> Any:
    """Удаление записи."""
    if model_name == 'Event':
        return RedirectResponse(url=f"/delete_event/{record_id}", status_code=status.HTTP_307_TEMPORARY_REDIRECT)

    Model = as_service.get_model(model_name)
    if Model:
        pk_name = 'word' if model_name == 'WordStats' else 'id'
        pk_val: Union[str, int] = int(record_id) if pk_name == 'id' and record_id.isdigit() else record_id
        await db.execute(delete(Model).where(getattr(Model, pk_name) == pk_val))
        await db.commit()
        
    if is_ajax_request(request):
        return JSONResponse(content={"status": "success", "message": f"{model_name} deleted"})
    return RedirectResponse(url=f"/db_view/{model_name}", status_code=status.HTTP_303_SEE_OTHER)

@router.post("/delete_event_settings/{event_id}", name="delete_event_settings")
async def delete_event_settings(
    event_id: int,
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """Удаляет событие из списка настроек."""
    await db.execute(delete(models.Event).where(models.Event.id == event_id))
    await db.commit()
    return RedirectResponse(url="/settings", status_code=status.HTTP_303_SEE_OTHER)
