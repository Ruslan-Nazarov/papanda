from fastapi import APIRouter, Depends, Request, Form, HTTPException, status, UploadFile, File
import shutil
import sqlite3
from fastapi.responses import RedirectResponse, StreamingResponse, JSONResponse, FileResponse

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, delete, text
from ..database import get_db, engine
import os
import csv
import io
import openpyxl
from datetime import datetime, timedelta, date

from .. import models
from ..database import get_db
from ..services.state_manager import import_excel_to_db
from ..services.settings_service import get_setting, set_setting
from ..utils import normalize_date, parse_date_input
from ..config import settings, BASE_DIR, templates, reset_secret_key
from ..services.dashboard_service import DashboardService
from ..dependencies import get_dashboard_service, get_word_service
from ..logger import logger

from ..services.auth import (
    check_auth_dependency, get_current_user_from_cookie,
    get_password_hash, create_access_token, COOKIE_NAME
)

router = APIRouter(
    tags=["settings"],
    dependencies=[Depends(check_auth_dependency)]
)

MODEL_MAP = {
    'Event': models.Event, 'Habit': models.Habit, 'Task': models.Task, 'HabitsDone': models.HabitsDone,
    'Chronology': models.Chronology, 'Notes': models.Notes, 'Wink': models.Wink, 'WordStats': models.WordStats
}

def get_model(name):
    if name == 'Habits': name = 'Habit'
    return MODEL_MAP.get(name)


async def _settings_context(request: Request, db: AsyncSession, import_result=None) -> dict:
    """Собирает контекст для шаблона settings.html. Используется в трёх хендлерах."""
    db_files = []
    if os.path.exists(settings.db_dir):
        for f in os.listdir(settings.db_dir):
            if f.endswith('.db'):
                path = settings.db_dir / f
                db_files.append({
                    'name': f,
                    'size': f"{os.path.getsize(path) // 1024} KB",
                    'is_active': f == settings.db_path.name
                })

    try:
        max_dur = int(await get_setting(db, 'max_duration', '360'))
    except (ValueError, TypeError):
        max_dur = 360

    try:
        max_rand = int(await get_setting(db, 'max_random_minutes', '60'))
    except (ValueError, TypeError):
        max_rand = 60

    today = datetime.now().date()

    chrono_res = await db.execute(select(models.Chronology).order_by(models.Chronology.id.desc()).limit(1))
    last_chrono = chrono_res.scalar_one_or_none()

    # Get last 5 winks (regardless of date) to show activity
    winks_res = await db.execute(select(models.Wink).order_by(models.Wink.id.desc()).limit(5))
    wink_last = winks_res.scalars().all()

    notes_last = None
    max_id_res = await db.execute(select(func.max(models.Notes.id)))
    max_id = max_id_res.scalar()
    if max_id:
        note_res = await db.execute(select(models.Notes).where(models.Notes.id == max_id))
        notes_last = note_res.scalar_one_or_none()

    ctx = {
        "request": request,
        "max_duration": max_dur,
        "max_random_minutes": max_rand,
        "wink_last": wink_last,
        "notes_last": notes_last,
        "last_chrono": last_chrono,
        "db_files": db_files,
        "current_user_name": get_current_user_from_cookie(request),
        "today_for_calendar": today,
    }
    if import_result is not None:
        ctx["import_result"] = import_result
    return ctx

@router.get("/settings", name="settings")
async def view_settings(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        ctx = await _settings_context(request, db)
        return templates.TemplateResponse("settings.html", ctx)
    except Exception as e:
        logger.error(f"Error in view_settings: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error")

@router.post("/settings/update_account", name="update_account")
async def update_account(
    request: Request,
    username: str = Form(None),
    password: str = Form(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        current_username = get_current_user_from_cookie(request)
        user_res = await db.execute(select(models.User).where(models.User.username == current_username))
        user = user_res.scalar_one_or_none()

        if not user:
            return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)

        response = RedirectResponse(url="/settings", status_code=status.HTTP_303_SEE_OTHER)

        if username and username != user.username:
            existing_res = await db.execute(select(models.User).where(models.User.username == username))
            existing = existing_res.scalar_one_or_none()
            if not existing:
                user.username = username
                new_token = create_access_token(data={"sub": username})
                response.set_cookie(
                    key=COOKIE_NAME,
                    value=new_token,
                    httponly=True,
                    max_age=2592000,
                    samesite="lax"
                )

        if password and len(password) >= 8:
            user.hashed_password = get_password_hash(password)

        await db.commit()
        return response
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating account: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update account")

@router.post("/settings", name="update_settings")
async def update_settings(
    request: Request,
    max_duration: str = Form(None),
    max_random_minutes: str = Form(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        if max_duration:
            await set_setting(db, 'max_duration', max_duration)
        if max_random_minutes:
            await set_setting(db, 'max_random_minutes', max_random_minutes)

        await db.commit()
        return RedirectResponse(url="/settings", status_code=status.HTTP_303_SEE_OTHER)
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to update settings")

@router.post("/delete_event_settings/{event_id}", name="delete_event_settings")
async def delete_event_settings(
    request: Request,
    event_id: int,
    db: AsyncSession = Depends(get_db),
):
    try:
        event_res = await db.execute(select(models.Event).where(models.Event.id == event_id))
        e = event_res.scalar_one_or_none()
        if e:
            await db.delete(e)
            await db.commit()
        return RedirectResponse(url="/settings", status_code=status.HTTP_303_SEE_OTHER)
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting event: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete event")

@router.get("/db_view/{model_name}", name="db_view")
async def db_view(
    request: Request, 
    model_name: str, 
    month: str = None, 
    day: str = None,
    year: str = None, 
    search: str = None,
    db: AsyncSession = Depends(get_db),
    dashboard_service: DashboardService = Depends(get_dashboard_service)
):
    try:
        # Конвертируем параметры в int, если они переданы и не пустые
        i_month = int(month) if month and month.strip() else None
        i_day = int(day) if day and day.strip() else None
        i_year = int(year) if year and year.strip() else None
        s_search = search.strip() if search and search.strip() else None

        Model = get_model(model_name)
        if not Model: return RedirectResponse(url="/")

        # Специальная обработка для событий (Event) - фильтрация по месяцу/дню
        if model_name == 'Event':
            now = datetime.now()
            if not i_month: i_month = now.month
            if not i_year: i_year = now.year

            # Обновляем повторяющиеся события перед показом на выбранный месяц
            import calendar
            last_day = calendar.monthrange(i_year, i_month)[1]
            target_horizon = date(i_year, i_month, last_day) + timedelta(days=10)
            await dashboard_service.expand_recurrence_events(horizon_date=target_horizon)
            
            from sqlalchemy import and_, or_
            # Расширяем диапазон выборки на +/- 10 дней, чтобы заполнить края сетки календаря
            start_range = datetime(i_year, i_month, 1) - timedelta(days=10)
            end_range = datetime(i_year, i_month, last_day) + timedelta(days=10)
            
            query = select(Model)
            
            if s_search:
                # Если есть поиск, ищем по всей базе без привязки к датам
                query = query.where(Model.title.ilike(f"%{s_search}%"))
            else:
                query = query.where(
                    and_(
                        Model.date >= start_range,
                        Model.date <= end_range
                    )
                )
                if i_day:
                    from sqlalchemy import extract
                    query = query.where(extract('day', Model.date) == i_day)
                
            records_res = await db.execute(query.order_by(Model.date.asc()))
            records = records_res.scalars().all()
            
            # Навигация
            prev_date = date(i_year, i_month, 1) - timedelta(days=1)
            
            ctx = {
                "request": request,
                "records": records,
                "columns": [c.name for c in Model.__table__.columns],
                "model_name": model_name,
                "current_month": i_month,
                "current_day": i_day,
                "current_year": i_year,
                "search_query": s_search,
                "month_name": date(i_year, i_month, 1).strftime('%B'),
                "prev_month": prev_date.month,
                "prev_year": prev_date.year,
                "next_month": (date(i_year, i_month, 1) + timedelta(days=32)).month,
                "next_year": (date(i_year, i_month, 1) + timedelta(days=32)).year,
                "years": [y for y in range(now.year - 5, now.year + 6)],
                "months": [(m, date(2000, m, 1).strftime('%B')) for m in range(1, 13)],
                "now_iso": datetime.now().date().isoformat(),
                "today_date": date.today()
            }
            return templates.TemplateResponse("db_view.html", ctx)

        if model_name == 'Habit':
            # Сортировка: сначала активные (read=False), потом выполненные (read=True) по дате desc
            from sqlalchemy import case
            query = select(Model).order_by(
                Model.read.asc(),  # False (0) < True (1)
                Model.start_date.desc()
            )
            records_res = await db.execute(query)
            records = records_res.scalars().all()
            
            ctx = {
                "request": request,
                "records": records,
                "columns": [c.name for c in Model.__table__.columns],
                "model_name": model_name,
                "now_iso": datetime.now().date().isoformat(),
                "today_date": date.today()
            }
            return templates.TemplateResponse("db_view.html", ctx)

        if model_name == 'Task':
            # Сортировка: сначала активные (done=False), потом выполненные (done=True) по дате создания desc
            query = select(Model).order_by(
                Model.done.asc(),  # False (0) < True (1)
                Model.created_at.desc()
            )
            records_res = await db.execute(query)
            records = records_res.scalars().all()
            
            ctx = {
                "request": request,
                "records": records,
                "columns": [c.name for c in Model.__table__.columns],
                "model_name": model_name,
                "now_iso": datetime.now().date().isoformat(),
                "today_date": date.today()
            }
            return templates.TemplateResponse("db_view.html", ctx)

        if model_name == 'Chronology':
            # Сортировка: по дате убывания
            query = select(Model)
            if s_search:
                query = query.where(Model.title.ilike(f"%{s_search}%"))
            
            records_res = await db.execute(query.order_by(Model.date.desc()))
            records = records_res.scalars().all()
            
            # Рассчитываем порог 7 дней для шаблона
            seven_days_ago = datetime.now() - timedelta(days=7)
            
            ctx = {
                "request": request,
                "records": records,
                "columns": [c.name for c in Model.__table__.columns],
                "model_name": model_name,
                "seven_days_ago": seven_days_ago,
                "search_query": s_search
            }
            return templates.TemplateResponse("db_view.html", ctx)

        if model_name == 'Notes':
            # Фильтрация по категории и сортировка
            cats_res = await db.execute(select(models.NoteCategory))
            categories = [c.name for c in cats_res.scalars().all()]
            
            selected_category = request.query_params.get("category", "").strip()
            sort_by = request.query_params.get("sort", "date").strip().lower()

            q = select(Model)
            if selected_category:
                q = q.where(Model.category == selected_category)
            
            if s_search:
                q = q.where(Model.note.ilike(f"%{s_search}%"))

            if sort_by == "category":
                q = q.order_by(Model.category.asc(), Model.created_at.desc())
            else:
                q = q.order_by(Model.created_at.desc())

            records_res = await db.execute(q)
            records = records_res.scalars().all()
            
            ctx = {
                "request": request,
                "records": records,
                "columns": [c.name for c in Model.__table__.columns],
                "model_name": model_name,
                "categories": categories,
                "selected_category": selected_category,
                "sort_by": sort_by,
                "search_query": s_search
            }
            return templates.TemplateResponse("db_view.html", ctx)

        if model_name == 'Wink':
            # Сортировка: по дате убывания
            query = select(Model).order_by(Model.date.desc())
            records_res = await db.execute(query)
            records = records_res.scalars().all()

            ctx = {
                "request": request,
                "records": records,
                "columns": [c.name for c in Model.__table__.columns],
                "model_name": model_name,
                "now_iso": datetime.now().date().isoformat()
            }
            return templates.TemplateResponse("db_view.html", ctx)

        # Обычное поведение для остальных моделей
        records_res = await db.execute(select(Model).order_by(Model.id.desc()))
        records = records_res.scalars().all()

        columns = [c.name for c in Model.__table__.columns]
        
        ctx = {
            "request": request,
            "records": records,
            "columns": columns,
            "model_name": model_name,
        }

        if model_name == 'Notes':
            cats_res = await db.execute(select(models.NoteCategory))
            ctx["categories"] = [c.name for c in cats_res.scalars().all()]

        return templates.TemplateResponse("db_view.html", ctx)
    except Exception:
        # Fallback for models without 'id' (like WordStats)
        try:
            Model = get_model(model_name)
            records_res = await db.execute(select(Model))
            records = records_res.scalars().all()
            columns = [c.name for c in Model.__table__.columns]
            return templates.TemplateResponse("db_view.html", {
                "request": request,
                "records": records,
                "columns": columns,
                "model_name": model_name,
            })
        except Exception as e:
            logger.error(f"Error viewing DB {model_name}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Internal Server Error")

@router.get("/edit_record/{model_name}/{record_id}", name="edit_record")
async def edit_record_get(request: Request, model_name: str, record_id: str, db: AsyncSession = Depends(get_db)):
    try:
        Model = get_model(model_name)
        if not Model: return RedirectResponse(url="/")

        pk_name = 'id'
        if model_name == 'WordStats': pk_name = 'word'

        pk_val = record_id
        if pk_name == 'id':
            try: pk_val = int(record_id)
            except ValueError: pass

        record_res = await db.execute(select(Model).where(getattr(Model, pk_name) == pk_val))
        record = record_res.scalar_one_or_none()
        if not record: return RedirectResponse(url=f"/db_view/{model_name}")

        columns = [c.name for c in Model.__table__.columns]
        return templates.TemplateResponse("db_edit.html", {
            "request": request,
            "record": record,
            "columns": columns,
            "model_name": model_name,
        })
    except Exception as e:
        logger.error(f"Error getting record for edit: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/edit_record/{model_name}/{record_id}")
async def edit_record_post(
    request: Request,
    model_name: str,
    record_id: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        Model = get_model(model_name)
        if not Model: return RedirectResponse(url="/")

        pk_name = 'id'
        if model_name == 'WordStats': pk_name = 'word'

        pk_val = record_id
        if pk_name == 'id':
            try: pk_val = int(record_id)
            except ValueError: pass

        record_res = await db.execute(select(Model).where(getattr(Model, pk_name) == pk_val))
        record = record_res.scalar_one_or_none()
        if not record: return RedirectResponse(url=f"/db_view/{model_name}")

        form_data = await request.form()
        columns = [c.name for c in Model.__table__.columns]

        for col in columns:
            if col in ['id', 'created_at', 'word']: continue
            if col not in form_data: continue

            val = form_data[col]
            if val and ('date' in col.lower() or 'time' in col.lower()):
                val = parse_date_input(val)

            col_attr = getattr(Model, col)
            if hasattr(col_attr.type, 'python_type'):
                col_type = col_attr.type.python_type
                if col_type == bool:
                    val = str(val).lower() in ['true', '1', 'on']

            setattr(record, col, val)

        await db.commit()
        return RedirectResponse(url=f"/db_view/{model_name}", status_code=status.HTTP_303_SEE_OTHER)
    except Exception as e:
        await db.rollback()
        logger.error(f"Error editing record {record_id} in {model_name}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to edit record")

@router.get("/settings/export/{model_name}", name="export_csv")
async def export_csv(model_name: str, db: AsyncSession = Depends(get_db)):
    try:
        Model = get_model(model_name)
        if not Model: return RedirectResponse(url="/settings")

        output = io.StringIO()
        output.write('\ufeff')
        writer = csv.writer(output, delimiter=';')

        columns = [c.name for c in Model.__table__.columns]
        writer.writerow(columns)

        records_res = await db.execute(select(Model))
        records = records_res.scalars().all()
        for rec in records:
            writer.writerow([getattr(rec, col) for col in columns])

        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8-sig')),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=papanda_{model_name.lower()}.csv"}
        )
    except Exception as e:
        logger.error(f"Error exporting CSV for {model_name}: {e}")
        raise HTTPException(status_code=500, detail="Export failed")

@router.get("/settings/export_excel/{model_name}", name="export_excel")
async def export_excel(model_name: str, db: AsyncSession = Depends(get_db)):
    try:
        Model = get_model(model_name)
        if not Model: return RedirectResponse(url="/settings")

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = model_name

        if model_name == 'WordStats':
            # Первой колонкой должен идти word (он же eng), так как импорт ожидает идентификатор в первой колонке
            columns = ['word', 'de', 'it', 'ru', 'meaning']
        else:
            columns = [c.name for c in Model.__table__.columns]
        ws.append(columns)

        records_res = await db.execute(select(Model))
        records = records_res.scalars().all()
        for rec in records:
            row = []
            for col in columns:
                val = getattr(rec, col, "")
                row.append(val if val is not None else "")
            ws.append(row)

        data_stream = io.BytesIO()
        wb.save(data_stream)
        data_stream.seek(0)
        
        filename = f"papanda_{model_name.lower()}.xlsx"
        return StreamingResponse(
            iter([data_stream.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.error(f"Error exporting Excel for {model_name}: {e}")
        raise HTTPException(status_code=500, detail="Export failed")

@router.post("/delete_record/{model_name}/{record_id}", name="delete_record")
async def delete_record(
    request: Request,
    model_name: str,
    record_id: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        # If it's an Event, we might need to handle recurrence logic
        if model_name == 'Event':
            try:
                # We reuse the logic from delete_event but as a generic record delete
                # If we don't have delete_mode/delete_future, it will default to 'only'
                # But here we are in a generic endpoint, so we might want to just redirect
                # to the specific delete_event endpoint if it's an Event.
                return RedirectResponse(url=f"/delete_event/{record_id}", status_code=status.HTTP_307_TEMPORARY_REDIRECT)
            except Exception:
                pass

        Model = get_model(model_name)
        if Model:
            pk_name = 'id'
            if model_name == 'WordStats':
                pk_name = 'word'

            pk_val = record_id
            if pk_name == 'id':
                try:
                    pk_val = int(record_id)
                except ValueError:
                    pass

            # Explicitly select the attribute from the Model
            attr = getattr(Model, pk_name)
            stmt = delete(Model).where(attr == pk_val)
            await db.execute(stmt)
            await db.commit()
        return RedirectResponse(url=f"/db_view/{model_name}", status_code=status.HTTP_303_SEE_OTHER)
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting record {record_id} from {model_name}: {e}")
        raise HTTPException(status_code=500, detail="Deletion failed")

@router.get("/settings/download_db/{filename}", name="download_db")
async def download_db(filename: str):
    try:
        file_path = settings.db_dir / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type="application/x-sqlite3"
        )
    except Exception as e:
        logger.error(f"Error downloading DB {filename}: {e}")
        raise HTTPException(status_code=500, detail="Download failed")

@router.post("/settings/upload_db", name="upload_db")
async def upload_db(db_file: UploadFile = File(...)):
    try:
        if not db_file.filename.endswith('.db'):
            raise HTTPException(status_code=400, detail="Invalid file type. Only .db allowed.")
        
        file_path = settings.db_dir / db_file.filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(db_file.file, buffer)
        
        return RedirectResponse(url="/settings", status_code=status.HTTP_303_SEE_OTHER)
    except Exception as e:
        logger.error(f"Error uploading DB: {e}")
        raise HTTPException(status_code=500, detail="Upload failed")

@router.post("/settings/delete_db/{filename}", name="delete_db_file")
async def delete_db_file(filename: str):
    try:
        if filename == settings.db_path.name:
            raise HTTPException(status_code=400, detail="Cannot delete active database")
        
        file_path = settings.db_dir / filename
        if file_path.exists():
            os.remove(file_path)
        
        return RedirectResponse(url="/settings", status_code=status.HTTP_303_SEE_OTHER)
    except Exception as e:
        logger.error(f"Error deleting DB {filename}: {e}")
        raise HTTPException(status_code=500, detail="Deletion failed")

@router.post("/settings/activate_db/{filename}", name="activate_db")
async def activate_db(filename: str):
    try:
        # 1. Освобождаем файл для прямого доступа через sqlite3
        await engine.dispose()
        
        current_db = settings.db_path
        target_db = settings.db_dir / filename
        
        if not target_db.exists():
            raise HTTPException(status_code=404, detail="Target database not found")
        
        # 2. Создаем авто-бэкап текущей базы (физическая копия файла)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"auto_backup_before_sync_{ts}.db"
        backup_path = settings.db_dir / backup_name
        if current_db.exists():
            shutil.copy2(current_db, backup_path)
        
        # 3. Список таблиц для миграции (ВСЁ КРОМЕ users)
        tables_to_sync = [
            'event', 'habits', 'habits_done', 'task', 'chronology', 
            'notes', 'wink', 'word_stats', 'dashboard', 'app_settings', 
            'language_rule', 'note_category', 'word_stats_snapshot', 
            'word_shows_daily', 'sticky_notes'
        ]
        
        # 4. Выполняем SQL-миграцию данных
        # Используем обычный sqlite3, так как это проще для ATTACH-логики
        conn = sqlite3.connect(str(current_db))
        cursor = conn.cursor()
        
        try:
            # Подключаем бэкап как вторую базу
            cursor.execute(f"ATTACH DATABASE '{str(target_db)}' AS backup_db")
            
            for table in tables_to_sync:
                # Проверяем, существует ли таблица в обеих базах
                cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
                if not cursor.fetchone(): continue
                
                cursor.execute(f"SELECT name FROM backup_db.sqlite_master WHERE type='table' AND name='{table}'")
                if not cursor.fetchone(): continue
                
                # Очищаем и копируем
                cursor.execute(f"DELETE FROM main.{table}")
                cursor.execute(f"INSERT INTO main.{table} SELECT * FROM backup_db.{table}")
            
            conn.commit()
            logger.info(f"[SETTINGS] Data migration successful from {filename}. Users table preserved.")
        finally:
            cursor.execute("DETACH DATABASE backup_db")
            conn.close()
        
        return RedirectResponse(url="/settings", status_code=status.HTTP_303_SEE_OTHER)
    except Exception as e:
        logger.error(f"Error migrating data from {filename}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to migrate data: {e}")

@router.get("/settings/categories", name="show_categories")
async def show_categories(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        cats_res = await db.execute(select(models.NoteCategory))
        categories = [c.name for c in cats_res.scalars().all()]
        return templates.TemplateResponse("edit_categories.html", {
            "request": request,
            "categories": categories,
        })
    except Exception as e:
        logger.error(f"Error fetching categories: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/settings/categories/edit", name="edit_categories")
async def edit_categories(
    request: Request,
    categories_list: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    try:
        new_categories = [c.strip() for c in categories_list.split('\n') if c.strip()]
        await db.execute(delete(models.NoteCategory))
        for cat in new_categories:
            db.add(models.NoteCategory(name=cat))
        await db.commit()
        return RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)
    except Exception as e:
        await db.rollback()
        logger.error(f"Error editing categories: {e}")
        raise HTTPException(status_code=500, detail="Failed to update categories")


@router.post("/settings/import_excel", name="import_excel")
async def import_excel(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    try:
        from ..services.state_manager import import_excel_to_db
        result = await import_excel_to_db(db, str(settings.excel_path))
        logger.info(f"[IMPORT] {result['message']}")
        ctx = await _settings_context(request, db, import_result=result)
        return templates.TemplateResponse("settings.html", ctx)
    except Exception as e:
        logger.error(f"Error importing Excel: {e}")
        raise HTTPException(status_code=500, detail="Import failed")

@router.post("/settings/sync_conflicts", name="sync_conflicts")
async def sync_conflicts_route(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    try:
        from ..services.state_manager import sync_conflicts
        form_data = await request.form()
        resolutions = {}
        for key, value in form_data.items():
            if key.startswith("action_") and value in ("to_db", "to_file"):
                word = key[len("action_"):]
                resolutions[word] = value

        result = await sync_conflicts(db, str(settings.excel_path), resolutions)
        logger.info(f"[SYNC CONFLICTS] {result.get('message', '')}")
        ctx = await _settings_context(request, db, import_result=result)
        return templates.TemplateResponse("settings.html", ctx)
    except Exception as e:
        logger.error(f"Error syncing conflicts: {e}")
        raise HTTPException(status_code=500, detail="Sync failed")


@router.post("/edit_event_inline", name="edit_event_inline")
async def edit_event_inline(
    request: Request, 
    db: AsyncSession = Depends(get_db),
    dashboard_service: DashboardService = Depends(get_dashboard_service)
):
    """
    Редактирует событие прямо из виджета Today (без перехода на другую страницу).
    Принимает JSON: {id, title, date, recurrence_rule, recurrence_end, edit_mode, recurrence_id}
    Возвращает JSON: {status, message}
    """
    try:
        data = await request.json()
        event_id = data.get("id")
        if not event_id:
            return JSONResponse(status_code=400, content={"status": "error", "message": "Missing event id"})

        res = await db.execute(select(models.Event).where(models.Event.id == int(event_id)))
        event = res.scalar_one_or_none()
        if not event:
            return JSONResponse(status_code=404, content={"status": "error", "message": "Event not found"})

        edit_mode = data.get("edit_mode", "only") # 'only' | 'this_and_future' | 'all'
        rec_id = data.get("recurrence_id")

        new_title = data.get("title", "").strip()
        new_dt = None
        if "date" in data and data["date"]:
            new_dt = parse_date_input(data["date"])
            if isinstance(new_dt, date) and not isinstance(new_dt, datetime):
                new_dt = datetime.combine(new_dt, datetime.min.time())
        
        new_rec_rule = data.get("recurrence_rule")
        new_rec_end = None
        if "recurrence_end" in data and data["recurrence_end"]:
            try:
                new_rec_end = date.fromisoformat(data["recurrence_end"])
            except ValueError:
                new_rec_end = None

        if rec_id and edit_mode in ("this_and_future", "all"):
            # Массовое обновление
            from sqlalchemy import update
            
            # 1. Находим все события серии
            stmt = select(models.Event).where(models.Event.recurrence_id == rec_id)
            if edit_mode == "this_and_future":
                stmt = stmt.where(models.Event.date >= event.date)
            
            res_all = await db.execute(stmt)
            related_events = res_all.scalars().all()
            
            for e in related_events:
                if new_title:
                    e.title = new_title
                
                # Если меняем время для всей серии
                if new_dt:
                    # Сохраняем дату текущего экземпляра, но меняем время на новое
                    e.date = datetime.combine(e.date.date(), new_dt.time())
                
                # Правило повторения и дату окончания обновляем только у "шаблона" (где rule не null)
                # или у текущего редактируемого, если мы хотим сделать его новым шаблоном.
                if e.recurrence_rule is not None or e.id == event.id:
                    if "recurrence_rule" in data:
                        e.recurrence_rule = new_rec_rule
                    if "recurrence_end" in data:
                        e.recurrence_end = new_rec_end
        else:
            # Одиночное обновление
            if new_title:
                event.title = new_title
            if new_dt:
                event.date = new_dt
            if "recurrence_rule" in data:
                event.recurrence_rule = new_rec_rule
            if "recurrence_end" in data:
                event.recurrence_end = new_rec_end

        await db.commit()
        
        # Генерируем новые экземпляры, если есть правила
        await dashboard_service.expand_recurrence_events()

        logger.info(f"[EDIT_EVENT_INLINE] Updated event id={event_id}, mode={edit_mode}")
        return JSONResponse(status_code=200, content={"status": "success", "message": "Event updated"})
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in edit_event_inline: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


@router.post("/edit_note_inline", name="edit_note_inline")
async def edit_note_inline(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Редактирует заметку прямо из таблицы управления (без перехода на другую страницу).
    Принимает JSON: {id, category, note}
    """
    try:
        data = await request.json()
        note_id = data.get("id")
        if not note_id:
            return JSONResponse(status_code=400, content={"status": "error", "message": "Missing note id"})

        res = await db.execute(select(models.Notes).where(models.Notes.id == int(note_id)))
        note_obj = res.scalar_one_or_none()
        if not note_obj:
            return JSONResponse(status_code=404, content={"status": "error", "message": "Note not found"})

        if "category" in data:
            note_obj.category = data["category"].strip()

        if "note" in data:
            note_obj.note = data["note"].strip()

        await db.commit()
        logger.info(f"[EDIT_NOTE_INLINE] Updated note id={note_id}")
        return JSONResponse(status_code=200, content={"status": "success", "message": "Note updated"})
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in edit_note_inline: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


@router.post("/edit_chrono_inline", name="edit_chrono_inline")
async def edit_chrono_inline(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Редактирует запись хронологии прямо из таблицы управления или дашборда.
    Принимает JSON: {id, title, date}
    """
    try:
        data = await request.json()
        chrono_id = data.get("id")
        if not chrono_id:
            return JSONResponse(status_code=400, content={"status": "error", "message": "Missing chronology id"})

        res = await db.execute(select(models.Chronology).where(models.Chronology.id == int(chrono_id)))
        chrono_obj = res.scalar_one_or_none()
        if not chrono_obj:
            return JSONResponse(status_code=404, content={"status": "error", "message": "Chronology record not found"})

        if "title" in data:
            chrono_obj.title = data["title"].strip()

        if "date" in data:
            try:
                dt = parse_date_input(data["date"])
                if isinstance(dt, date) and not isinstance(dt, datetime):
                    dt = datetime.combine(dt, datetime.min.time())
                chrono_obj.date = dt
            except Exception:
                pass

        await db.commit()
        logger.info(f"[EDIT_CHRONO_INLINE] Updated chronology id={chrono_id}")
        return JSONResponse(status_code=200, content={"status": "success", "message": "Chronology updated"})
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in edit_chrono_inline: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


@router.post("/edit_habit_inline", name="edit_habit_inline")
async def edit_habit_inline(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Редактирует привычку прямо из карточки управления.
    Принимает JSON: {id, title, start_date, read}
    """
    try:
        data = await request.json()
        habit_id = data.get("id")
        if not habit_id:
            return JSONResponse(status_code=400, content={"status": "error", "message": "Missing habit id"})

        res = await db.execute(select(models.Habit).where(models.Habit.id == int(habit_id)))
        habit_obj = res.scalar_one_or_none()
        if not habit_obj:
            return JSONResponse(status_code=404, content={"status": "error", "message": "Habit not found"})

        if "title" in data:
            habit_obj.title = data["title"].strip()

        if "start_date" in data:
            try:
                dt = parse_date_input(data["start_date"])
                if isinstance(dt, datetime):
                    dt = dt.date()
                habit_obj.start_date = dt
            except Exception:
                pass

        if "read" in data:
            old_read = habit_obj.read
            new_read = bool(data["read"])
            habit_obj.read = new_read
            
            # Если помечаем как выполненную и даты завершения еще нет - ставим сегодня
            if new_read and not old_read and not habit_obj.end_date:
                habit_obj.end_date = date.today()
            # Если возвращаем в активные - очищаем дату завершения
            elif not new_read and old_read:
                habit_obj.end_date = None

        if "end_date" in data:
            try:
                if data["end_date"]:
                    dt = parse_date_input(data["end_date"])
                    if isinstance(dt, datetime):
                        dt = dt.date()
                    habit_obj.end_date = dt
                else:
                    habit_obj.end_date = None
            except Exception:
                pass

        await db.commit()
        logger.info(f"[EDIT_HABIT_INLINE] Updated habit id={habit_id}")
        return JSONResponse(status_code=200, content={"status": "success", "message": "Habit updated"})
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in edit_habit_inline: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


@router.post("/edit_task_inline", name="edit_task_inline")
async def edit_task_inline(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Редактирует задачу прямо из карточки управления.
    Принимает JSON: {id, name, done}
    """
    try:
        data = await request.json()
        task_id = data.get("id")
        if not task_id:
            return JSONResponse(status_code=400, content={"status": "error", "message": "Missing task id"})

        res = await db.execute(select(models.Task).where(models.Task.id == int(task_id)))
        task_obj = res.scalar_one_or_none()
        if not task_obj:
            return JSONResponse(status_code=404, content={"status": "error", "message": "Task not found"})

        if "name" in data:
            task_obj.name = data["name"].strip()

        if "done" in data:
            task_obj.done = bool(data["done"])

        await db.commit()
        logger.info(f"[EDIT_TASK_INLINE] Updated task id={task_id}")
        return JSONResponse(status_code=200, content={"status": "success", "message": "Task updated"})
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in edit_task_inline: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


@router.post("/edit_wink_inline", name="edit_wink_inline")
async def edit_wink_inline(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Редактирует Wink прямо из календаря.
    Принимает JSON: {id, title, date}
    """
    try:
        data = await request.json()
        wink_id = data.get("id")
        if not wink_id:
            return JSONResponse(status_code=400, content={"status": "error", "message": "Missing wink id"})

        res = await db.execute(select(models.Wink).where(models.Wink.id == int(wink_id)))
        wink = res.scalar_one_or_none()
        if not wink:
            return JSONResponse(status_code=404, content={"status": "error", "message": "Wink not found"})

        if "title" in data:
            wink.title = (data["title"] or "").strip()

        if "date" in data and data["date"]:
            new_dt = parse_date_input(data["date"])
            if isinstance(new_dt, date) and not isinstance(new_dt, datetime):
                new_dt = datetime.combine(new_dt, datetime.min.time())
            wink.date = new_dt

        await db.commit()
        logger.info(f"[EDIT_WINK_INLINE] Updated wink id={wink_id}")
        return JSONResponse(status_code=200, content={"status": "success", "message": "Wink updated"})
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in edit_wink_inline: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


@router.post("/settings/deep_clean", name="deep_clean")
async def deep_clean(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Sharing Preparation (Deep Clean)
    Очищает базу данных (все 18 моделей), удаляет дополнительные .db файлы и словарь translate.xlsx.
    Перенаправляет на регистрацию нового пользователя.
    """
    try:
        # 1. Список всех моделей для полной очистки
        models_to_clear = [
            models.Event, models.Habit, models.Task, models.Chronology,
            models.Notes, models.HabitsDone, models.Dashboard, models.WordStats,
            models.WordStatsSnapshot, models.LanguageRule, models.NoteCategory,
            models.Wink, models.AppSettings, models.WordShowsDaily,
            models.StickyNote, models.User, models.Observation, models.ObservationLog
        ]
        
        for Model in models_to_clear:
            await db.execute(delete(Model))
        
        # 2. Восстанавливаем базовые настройки (Factory Defaults)
        db.add(models.AppSettings(key='max_duration', value='360'))
        db.add(models.AppSettings(key='max_random_minutes', value='60'))
        
        await db.commit()

        # 3. Удаление дополнительных .db файлов в папке данных (бэкапы и прочее)
        db_dir = settings.db_dir
        if db_dir.exists():
            for f in os.listdir(db_dir):
                if f.endswith(".db") and f != settings.db_path.name:
                    try:
                        os.remove(db_dir / f)
                        logger.info(f"[DEEP CLEAN] Deleted backup DB: {f}")
                    except Exception as e:
                        logger.error(f"[DEEP CLEAN] Failed to delete {f}: {e}")

        # 4. Удаление файла словаря translate.xlsx
        if settings.excel_path.exists():
            try:
                os.remove(settings.excel_path)
                logger.info("[DEEP CLEAN] Deleted translate.xlsx")
            except Exception as e:
                logger.error(f"[DEEP CLEAN] Failed to delete translate.xlsx: {e}")

        # 5. Удаление файлов логов
        log_dir = BASE_DIR / "logs"
        if log_dir.exists():
            for f in os.listdir(log_dir):
                if f.endswith(".log"):
                    try:
                        os.remove(log_dir / f)
                        logger.info(f"[DEEP CLEAN] Deleted log file: {f}")
                    except Exception as e:
                        logger.error(f"[DEEP CLEAN] Failed to delete log {f}: {e}")

        # 5. Сжатие базы (VACUUM) - физически удаляет данные из файла
        try:
            await db.execute(text("VACUUM"))
            logger.info("[DEEP CLEAN] Database VACUUM completed.")
        except Exception as e:
            logger.warning(f"[DEEP CLEAN] VACUUM failed (possibly file is locked): {e}")

        # 6. Сброс SECRET_KEY в .env
        try:
            reset_secret_key()
            logger.info("[DEEP CLEAN] SECRET_KEY has been reset in .env")
        except Exception as e:
            logger.error(f"[DEEP CLEAN] Failed to reset SECRET_KEY: {e}")

        logger.warning("[SETTINGS] DEEP CLEAN performed. System reset to factory state.")
        
        # 7. Перенаправляем на РЕГИСТРАЦИЮ и удаляем куку
        response = RedirectResponse(url="/register", status_code=status.HTTP_302_FOUND)
        response.delete_cookie(COOKIE_NAME)
        return response
    except Exception as e:
        await db.rollback()
        logger.error(f"Error during deep clean: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Deep clean failed")

@router.post("/settings/shutdown_app", name="shutdown_app")
async def shutdown_app():
    """
    Завершает работу сервера. 
    Полезно для экзешника без консоли.
    """
    logger.warning("[SYSTEM] Shutdown requested via UI.")
    
    import os
    import signal
    import threading
    import time

    def kill_self():
        time.sleep(0.5)
        # Отправляем сигнал завершения самому себе
        os.kill(os.getpid(), signal.SIGINT)

    threading.Thread(target=kill_self, daemon=True).start()
    return JSONResponse(content={"status": "success", "message": "Приложение завершает работу. Можете закрыть вкладку."})
