from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import RedirectResponse, JSONResponse, HTMLResponse
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
from ... import schemas

router = APIRouter(
    dependencies=[Depends(check_auth_dependency)]
)

@router.get("/api/db/search/{model_name}", name="api_db_search")
async def api_db_search(
    model_name: str,
    search: Optional[str] = None,
    category: Optional[str] = None,
    sort: Optional[str] = None,
    page: int = 1,
    as_service: AdminService = Depends(get_admin_service)
):
    """API эндпоинт для поиска (AJAX)."""
    if not search:
        return JSONResponse(content={"status": "success", "data": []})
        
    try:
        from ...logger import logger
        search_query = search.strip()
        results = []

        if model_name.lower() == 'all':
            models_to_search = ['Event', 'Notes', 'Stickers', 'Chronology', 'Habit', 'Task', 'Wink']
            for m in models_to_search:
                try:
                    ctx = await as_service.get_db_view_context(
                        model_name=m, search=search_query, category=category, sort=sort, page=page
                    )
                    for r in ctx["records"]:
                        res = {"id": getattr(r, 'id', getattr(r, 'word', None)), "model": m}
                        if m == 'Event':
                            res.update({"title": f"📅 [Event] {r.title}", "date": r.date.isoformat() if hasattr(r.date, 'isoformat') else str(r.date)})
                        elif m == 'Notes':
                            res.update({"title": f"📝 [Note] {r.category}", "text": r.note[:100] + "..." if r.note and len(r.note) > 100 else r.note})
                        elif m == 'Stickers':
                            res.update({"title": f"📋 [Sticker] {r.title}", "text": r.text[:100] if r.text else ""})
                        elif m == 'Chronology':
                            res.update({"title": f"🕒 [Chrono] {r.title}", "date": r.date.isoformat() if hasattr(r.date, 'isoformat') else str(r.date)})
                        elif m == 'Habit':
                            res.update({"title": f"🔄 [Habit] {r.title}", "text": f"Started: {r.start_date}"})
                        elif m == 'Task':
                            res.update({"title": f"✅ [Task] {r.name}", "text": f"Created: {r.created_at.strftime('%d.%m.%Y')}"})
                        elif m == 'Wink':
                            res.update({"title": f"✨ [Wink] {r.title}", "date": r.date.isoformat() if hasattr(r.date, 'isoformat') else str(r.date)})
                        results.append(res)
                except Exception as ex:
                    logger.error(f"Error searching model {m}: {ex}")
        else:
            ctx = await as_service.get_db_view_context(
                model_name=model_name, search=search_query, category=category, sort=sort, page=page
            )
            for r in ctx["records"]:
                res = {"id": getattr(r, 'id', getattr(r, 'word', None)), "model": model_name}
                if model_name == 'Event':
                    res.update({"title": r.title, "date": r.date.isoformat() if hasattr(r.date, 'isoformat') else str(r.date)})
                elif model_name == 'Notes':
                    res.update({"title": r.category, "text": r.note[:100] + "..." if r.note and len(r.note) > 100 else r.note})
                elif model_name == 'Stickers':
                    res.update({"title": r.title, "text": r.text[:100] if r.text else ""})
                elif model_name == 'Chronology':
                    res.update({"title": r.title, "date": r.date.isoformat() if hasattr(r.date, 'isoformat') else str(r.date)})
                elif model_name == 'Habit':
                    res.update({"title": r.title, "text": f"Started: {r.start_date}"})
                elif model_name == 'Task':
                    res.update({"title": r.name, "text": f"Created: {r.created_at.strftime('%d.%m.%Y')}"})
                elif model_name == 'Wink':
                    res.update({"title": r.title, "date": r.date.isoformat() if hasattr(r.date, 'isoformat') else str(r.date)})
                else:
                    res.update({"title": str(r)})
                results.append(res)
            
        return JSONResponse(content={"status": "success", "data": results})
    except Exception as e:
        from ...logger import logger
        logger.error(f"Global search error: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"status": "error", "message": "Internal server error"})

@router.get("/api/db/get_record/{model_name}/{record_id}", name="api_db_get_record")
async def api_db_get_record(
    model_name: str,
    record_id: str,
    db: AsyncSession = Depends(get_db),
    as_service: AdminService = Depends(get_admin_service)
):
    """Эндпоинт для получения полной информации об одной записи (AJAX)."""
    try:
        Model = as_service.get_model(model_name)
        if not Model: return JSONResponse(status_code=404, content={"status": "error", "message": "Model not found"})

        pk_name = 'word' if model_name == 'WordStats' else 'id'
        pk_val: Union[str, int] = int(record_id) if record_id.isdigit() else record_id
        
        res = await db.execute(select(Model).where(getattr(Model, pk_name) == pk_val))
        r = res.scalar_one_or_none()
        if not r: return JSONResponse(status_code=404, content={"status": "error", "message": "Record not found"})

        # Формируем данные в зависимости от модели
        data = {"id": getattr(r, pk_name)}
        if model_name == 'Event':
            data.update({
                "title": r.title,
                "date": r.date.isoformat() if r.date else None,
                "color": r.color,
                "important": r.important,
                "done": r.done,
                "recurrence_id": r.recurrence_id,
                "rule": r.recurrence_rule,
                "end": r.recurrence_end.isoformat() if r.recurrence_end else None
            })
        elif model_name == 'Note' or model_name == 'Notes':
            data.update({
                "category": r.category,
                "note": r.note
            })
        elif model_name == 'Chronology':
             data.update({
                "title": r.title,
                "date": r.date.isoformat() if r.date else None,
                "text": r.text
            })
        
        return JSONResponse(content={"status": "success", "data": data})
    except Exception as e:
        from ...logger import logger
        logger.error(f"DB record error for {model_name}/{record_id}: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"status": "error", "message": "Internal server error"})

@router.get("/db_view/{model_name}", name="db_view")
async def db_view(model_name: str) -> RedirectResponse:
    """Fallback route that redirects to main dashboard."""
    return RedirectResponse(url="/")

@router.get("/api/ui/db_view/{model_name}", name="api_ui_db_view", response_class=HTMLResponse)
async def api_ui_db_view(
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
    """Возвращает только HTML-контент для отображения в модальном окне (без base.html)."""
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
        return HTMLResponse("<div style='padding:20px; color:red;'>Invalid model</div>", status_code=400)

    ctx["request"] = request
    ctx["is_modal"] = True
    
    partial_map = {
        'Event': 'partials/db_event_view.html',
        'Notes': 'partials/db_note_view.html',
        'Stickers': 'partials/db_sticker_view.html',
        'Habit': 'partials/db_habit_view.html',
        'Task': 'partials/db_task_view.html',
        'Chronology': 'partials/db_chrono_view.html',
        'Wink': 'partials/db_wink_view.html'
    }
    
    template_name = partial_map.get(model_name)
    if not template_name:
        return HTMLResponse("<div style='padding:20px;'>Model not supported in modal view.</div>", status_code=400)
        
    return templates.TemplateResponse(request, template_name, ctx)




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
        return schemas.SuccessResponse(message=f"{model_name} deleted")
    return RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/delete_event_settings/{event_id}", name="delete_event_settings")
async def delete_event_settings(
    event_id: int,
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """Удаляет событие из списка настроек."""
    await db.execute(delete(models.Event).where(models.Event.id == event_id))
    await db.commit()
    return RedirectResponse(url="/settings", status_code=status.HTTP_303_SEE_OTHER)
