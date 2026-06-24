from fastapi import APIRouter, Request, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Any, Optional
from .. import models, schemas

from ..database import get_db
from ..services.auth import check_auth_dependency
from ..config import templates, INTERNAL_ROOT
from ..logger import logger
from ..models.dialectics import Dialectics
from ..schemas import DialecticsCreate, DialecticsView, DialecticsUpdate, StickyNoteCreate, SuccessResponse, DialecticsGuideResponse, DialecticsIdResponse
from ..services.sticky_note_service import StickyNoteService
from ..dependencies import get_sticky_note_service
import markdown
import json

router = APIRouter(
    tags=["dialectics"]
)

from ..services.settings_service import get_setting

@router.get("/", response_class=HTMLResponse)
async def view_dialectics(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> HTMLResponse:
    """Отображает главную страницу (Диалектика)."""
    plugin_dashboard = await get_setting(db, 'plugin_dashboard', 'True') == 'True'
    return templates.TemplateResponse(request, "index.html", {
        "plugin_dashboard": plugin_dashboard
    })

@router.get("/api/dialectics/guide", response_model=DialecticsGuideResponse)
async def get_dialectics_guide(
    request: Request,
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Возвращает скомпилированное руководство по диалектике в формате HTML с учетом языка."""
    locale = request.cookies.get("locale", "en").upper()
    guide_path = INTERNAL_ROOT / f"DIALECTICS_GUIDE_{locale}.md"
    
    if not guide_path.exists():
        guide_path = INTERNAL_ROOT / "DIALECTICS_GUIDE.md"
        
    if not guide_path.exists():
        raise HTTPException(status_code=404, detail="Guide file not found")
    try:
        text = guide_path.read_text(encoding="utf-8")
        html_content = markdown.markdown(text, extensions=['extra', 'sane_lists', 'tables'])
        return {"html": html_content}
    except Exception as e:
        logger.error(f"Error reading guide: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/dialectics/save", response_model=DialecticsView)
async def save_dialectics(
    data: DialecticsCreate,
    db: AsyncSession = Depends(get_db),
    sns: StickyNoteService = Depends(get_sticky_note_service),
    user: Any = Depends(check_auth_dependency)
) -> Dialectics:
    """Сохраняет новую запись 'Диалектики'."""
    # Convert blocks back to standard dicts
    content_json = [b.model_dump() for b in data.blocks]
    new_note = Dialectics(
        title=data.title or "",
        content_json=content_json,
        is_pinned=data.is_pinned
    )
    db.add(new_note)
    await db.commit()
    await db.refresh(new_note)

    # Handle sticker
    if data.sticker_text or data.sticker_title:
        await sns.upsert_for_dialectics(
            dialectics_id=new_note.id,
            text=data.sticker_text or "",
            title=data.sticker_title,
            color=data.sticker_color or "#fff9c4",
            type=data.sticker_type or "text"
        )

    return new_note

@router.get("/api/dialectics", response_model=List[DialecticsView])
async def list_dialectics(
    request: Request,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Возвращает список записей 'Диалектики'."""
    query = select(Dialectics)
    if search:
        query = query.where(Dialectics.title.ilike(f"%{search}%"))
    result = await db.execute(query.order_by(func.coalesce(Dialectics.updated_at, Dialectics.created_at).desc()))
    notes = result.scalars().all()

    locale = request.cookies.get("locale", "en")
    locale_map = {
        "en": "Example Note",
        "ru": "Пример конспекта",
        "kk": "Конспект мысалы"
    }
    target_title = locale_map.get(locale, "Example Note")

    for note in notes:
        if note.title in ["Example Note", "Пример конспекта", "Конспект мысалы"]:
            note.title = target_title

    return notes

@router.get("/api/dialectics/example/get_or_create_id", response_model=DialecticsIdResponse)
async def get_example_note_id(request: Request, db: AsyncSession = Depends(get_db)):
    """Находит или создаёт пример конспекта под текущий язык и возвращает его ID."""
    locale = request.cookies.get("locale", "en")
    
    locale_map = {
        "en": ("Example Note", "example_note_content.json"),
        "ru": ("Пример конспекта", "example_note_content_ru.json"),
        "kk": ("Конспект мысалы", "example_note_content_kk.json")
    }
    
    target_title, json_file = locale_map.get(locale, locale_map["en"])
    
    stmt = select(Dialectics).where(Dialectics.title.in_(["Example Note", "Пример конспекта", "Конспект мысалы"]))
    res = await db.execute(stmt)
    existing = res.scalars().first()
    
    if existing:
        return {"id": existing.id}
    else:
        json_path = INTERNAL_ROOT / "fastapi_app" / "static" / json_file
        if not json_path.exists():
            json_path = INTERNAL_ROOT / "fastapi_app" / "static" / "example_note_content.json"
            
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        new_note = Dialectics(
            title=data.get("title", target_title),
            content_json=data.get("content_json", []),
            is_pinned=data.get("is_pinned", False)
        )
        db.add(new_note)
        await db.commit()
        return {"id": new_note.id}

@router.get("/api/dialectics/{id}", response_model=DialecticsView)
async def get_dialectics(
    id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Dialectics:
    """Возвращает содержимое конкретной записи."""
    note = await db.get(Dialectics, id)
    if not note:
        raise HTTPException(status_code=404, detail="Entry not found")
        
    if note.title in ["Example Note", "Пример конспекта", "Конспект мысалы"]:
        locale = request.cookies.get("locale", "en")
        locale_map = {
            "en": ("Example Note", "example_note_content.json"),
            "ru": ("Пример конспекта", "example_note_content_ru.json"),
            "kk": ("Конспект мысалы", "example_note_content_kk.json")
        }
        target_title, json_file = locale_map.get(locale, locale_map["en"])
        json_path = INTERNAL_ROOT / "fastapi_app" / "static" / json_file
        if not json_path.exists():
            json_path = INTERNAL_ROOT / "fastapi_app" / "static" / "example_note_content.json"
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            # Temporarily modify title and content in memory for the response,
            # but do not commit these changes to the database.
            note.title = data.get("title", target_title)
            note.content_json = data.get("content_json", [])
        except Exception as e:
            logger.error(f"Error loading localized example note: {e}")
                
    return note

@router.patch("/api/dialectics/{id}", response_model=DialecticsView)
async def update_dialectics(
    id: int,
    data: DialecticsUpdate,
    db: AsyncSession = Depends(get_db),
    sns: StickyNoteService = Depends(get_sticky_note_service),
    user: Any = Depends(check_auth_dependency)
) -> Dialectics:
    """Обновляет существующую запись 'Диалектики'."""
    note = await db.get(Dialectics, id)
    if not note:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    # Use list for JSON column
    content_json = [b.model_dump() for b in data.blocks]
    
    note.title = data.title
    note.content_json = content_json
    
    if data.is_pinned is not None:
        note.is_pinned = data.is_pinned
    
    await db.commit()
    await db.refresh(note)

    # Handle sticker
    if data.sticker_text or data.sticker_title:
        await sns.upsert_for_dialectics(
            dialectics_id=note.id,
            text=data.sticker_text or "",
            title=data.sticker_title,
            color=data.sticker_color or "#fff9c4",
            type=data.sticker_type or "text"
        )

    return note

@router.get("/api/dialectics/pinned/active", response_model=Optional[DialecticsView])
async def get_pinned_dialectics(
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Optional[Dialectics]:
    """Возвращает закрепленную запись."""
    result = await db.execute(select(Dialectics).where(Dialectics.is_pinned == True).limit(1))
    return result.scalar_one_or_none()

@router.post("/api/dialectics/{id}/pin", response_model=DialecticsView)
async def pin_dialectics(
    id: int,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Dialectics:
    """Закрепляет запись."""
    note = await db.get(Dialectics, id)
    if not note:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    note.is_pinned = True
    await db.commit()
    await db.refresh(note)
    return note

@router.post("/api/dialectics/{id}/unpin", response_model=DialecticsView)
async def unpin_dialectics(
    id: int,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Dialectics:
    """Открепляет запись."""
    note = await db.get(Dialectics, id)
    if not note:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    note.is_pinned = False
    await db.commit()
    await db.refresh(note)
    return note

@router.delete("/api/dialectics/{id}", response_model=schemas.SuccessResponse)
async def delete_dialectics(
    id: int,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
):
    """Удаляет запись."""
    note = await db.get(Dialectics, id)
    if not note:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    await db.delete(note)
    await db.commit()
    return schemas.SuccessResponse(message="Dialectics entry deleted")
