from fastapi import APIRouter, Request, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from typing import List, Any, Optional
from .. import models, schemas

from ..database import get_db
from ..services.auth import check_auth_dependency
from ..config import templates, INTERNAL_ROOT
from ..logger import logger
from ..models.dialectics import Dialectics, DialecticsCategory
from ..schemas.dialectics import DialecticsCreate, DialecticsView, DialecticsUpdate, DialecticsGuideResponse, DialecticsCategoryBase, CategoryCreate
from ..schemas import StickyNoteCreate, SuccessResponse, DialecticsIdResponse
from ..services.sticky_note_service import StickyNoteService
from ..services.settings_service import get_setting
from ..dependencies import get_sticky_note_service
import markdown
import json

router = APIRouter(
    tags=["dialectics"]
)

@router.get("/", response_class=HTMLResponse)
async def view_dialectics(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> HTMLResponse:
    """Отображает главную страницу (Диалектика)."""
    plugin_dashboard = await get_setting(db, 'plugin_dashboard', 'True') == 'True'
    show_dedications = await get_setting(db, 'show_dedications', 'True') == 'True'
    return templates.TemplateResponse(request, "index.html", {
        "plugin_dashboard": plugin_dashboard,
        "show_dedications": show_dedications
    })

def get_localized_markdown_html(prefix: str, fallback_file: str, request: Request) -> str:
    locale = request.cookies.get("locale", "en").upper()
    path = INTERNAL_ROOT / f"{prefix}_{locale}.md"
    if not path.exists():
        path = INTERNAL_ROOT / fallback_file
    if not path.exists() and prefix == "REFERENCE":
        path = INTERNAL_ROOT / "REFERENCE_RU.md"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"{prefix} file not found")
    try:
        text = path.read_text(encoding="utf-8")
        return markdown.markdown(text, extensions=['extra', 'sane_lists', 'tables'])
    except Exception as e:
        logger.error(f"Error reading {prefix}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/dialectics/guide", response_model=DialecticsGuideResponse)
async def get_dialectics_guide(
    request: Request,
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Возвращает скомпилированное руководство по диалектике в формате HTML с учетом языка."""
    return {"html": get_localized_markdown_html("DIALECTICS_GUIDE", "DIALECTICS_GUIDE.md", request)}

@router.get("/api/dialectics/reference", response_model=DialecticsGuideResponse)
async def get_dialectics_reference(
    request: Request,
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Возвращает справочник функций конспекта в формате HTML с учетом языка."""
    return {"html": get_localized_markdown_html("REFERENCE", "REFERENCE.md", request)}

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
        is_pinned=data.is_pinned,
        category_id=data.category_id
    )
    db.add(new_note)
    await db.commit()
    
    # Reload with category
    query = select(Dialectics).options(selectinload(Dialectics.category)).where(Dialectics.id == new_note.id)
    result = await db.execute(query)
    new_note = result.scalar_one()

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
    query = select(Dialectics).options(selectinload(Dialectics.category))
    if search:
        query = query.where(Dialectics.title.ilike(f"%{search}%"))
    result = await db.execute(query.order_by(func.coalesce(Dialectics.updated_at, Dialectics.created_at).desc()))
    notes = result.scalars().all()

    locale = request.cookies.get("locale", "en")
    if locale == "kk": locale = "kz"
    locale_map = {
        "en": "Example Note",
        "ru": "Пример конспекта",
        "kz": "Конспект мысалы"
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
    if locale == "kk": locale = "kz"
    
    locale_map = {
        "en": ("Example Note", "example_note_content.json"),
        "ru": ("Пример конспекта", "example_note_content_ru.json"),
        "kz": ("Конспект мысалы", "example_note_content_kz.json")
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
    query = select(Dialectics).options(selectinload(Dialectics.category)).where(Dialectics.id == id)
    result = await db.execute(query)
    note = result.scalar_one_or_none()
    
    if not note:
        raise HTTPException(status_code=404, detail="Entry not found")
        
    if note.title in ["Example Note", "Пример конспекта", "Конспект мысалы"]:
        locale = request.cookies.get("locale", "en")
        if locale == "kk": locale = "kz"
        locale_map = {
            "en": ("Example Note", "example_note_content.json"),
            "ru": ("Пример конспекта", "example_note_content_ru.json"),
            "kz": ("Конспект мысалы", "example_note_content_kz.json")
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
    query = select(Dialectics).options(selectinload(Dialectics.category)).where(Dialectics.id == id)
    result = await db.execute(query)
    note = result.scalar_one_or_none()
    
    if not note:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    # Use list for JSON column
    content_json = [b.model_dump() for b in data.blocks]
    
    note.title = data.title
    note.content_json = content_json
    
    if data.is_pinned is not None:
        note.is_pinned = data.is_pinned
        
    if hasattr(data, 'category_id'):
        note.category_id = data.category_id
    
    await db.commit()
    
    # Reload with category after commit
    query = select(Dialectics).options(selectinload(Dialectics.category)).where(Dialectics.id == note.id)
    result = await db.execute(query)
    note = result.scalar_one()

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
    result = await db.execute(select(Dialectics).options(selectinload(Dialectics.category)).where(Dialectics.is_pinned == True).limit(1))
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

@router.get("/api/dialectics/categories/all", response_model=List[DialecticsCategoryBase])
async def list_dialectics_categories(
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Возвращает список всех категорий диалектики."""
    result = await db.execute(select(DialecticsCategory).order_by(DialecticsCategory.name))
    return result.scalars().all()

@router.post("/api/dialectics/categories/new", response_model=DialecticsCategoryBase)
async def create_dialectics_category(
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Создает новую категорию для диалектики."""
    # Check if exists
    existing = await db.execute(select(DialecticsCategory).where(func.lower(DialecticsCategory.name) == data.name.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Category already exists")
        
    category = DialecticsCategory(name=data.name, color=data.color)
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category

@router.get("/api/dialectics/search/notes", response_model=List[DialecticsView])
async def search_dialectics(
    request: Request,
    q: str,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Поиск по конспектам (по заголовку и содержимому)."""
    if not q or len(q.strip()) < 2:
        return []
        
    search_term = f"%{q.strip()}%"
    
    # Simple search in title or content_json
    # Note: For SQLite, JSON searching with LIKE is possible if we cast or just search text
    # SQLAlchemy might cast JSON to text for ilike, but let's be safe and use cast to String
    from sqlalchemy import cast, String
    
    query = select(Dialectics).options(selectinload(Dialectics.category)).where(
        or_(
            Dialectics.title.ilike(search_term),
            cast(Dialectics.content_json, String).ilike(search_term)
        )
    )
    result = await db.execute(query.order_by(func.coalesce(Dialectics.updated_at, Dialectics.created_at).desc()))
    return result.scalars().all()
