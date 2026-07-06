from fastapi import APIRouter, Request, Depends, HTTPException, status, Query
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, delete
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.attributes import flag_modified
from typing import List, Any, Optional
from .. import models, schemas

from ..database import get_db
from ..services.auth import check_auth_dependency
from ..config import templates, INTERNAL_ROOT
from ..logger import logger
from ..models.dialectics import Dialectics, DialecticsCategory, DialecticsVersion
from ..schemas.dialectics import DialecticsCreate, DialecticsView, DialecticsUpdate, DialecticsGuideResponse, DialecticsCategoryBase, CategoryCreate, DialecticsVersionView, DialecticsVersionCreate
from ..schemas import StickyNoteCreate, SuccessResponse, DialecticsIdResponse
from datetime import datetime, timezone, timedelta
from ..services.sticky_note_service import StickyNoteService
from ..services.settings_service import get_setting
from ..dependencies import get_sticky_note_service
import markdown
import json
import copy

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
    if not path.exists() and prefix == "DIALECTICS_GUIDE":
        path = INTERNAL_ROOT / "docs" / "about_dialectics" / "guide" / f"GUIDE_{locale}.md"
        if not path.exists():
            path = INTERNAL_ROOT / "docs" / "about_dialectics" / "guide" / "GUIDE_RU.md"
    if not path.exists() and prefix == "REFERENCE":
        path = INTERNAL_ROOT / "docs" / "about_dialectics" / "reference" / f"REFERENCE_{locale}.md"
        if not path.exists():
            path = INTERNAL_ROOT / "docs" / "about_dialectics" / "reference" / "REFERENCE_RU.md"
        if not path.exists():
            path = INTERNAL_ROOT / "REFERENCE_RU.md"
    if not path.exists() and prefix == "DASHBOARD_GUIDE":
        path = INTERNAL_ROOT / "docs" / "about_dashboard" / f"GUIDE_{locale}.md"
        if not path.exists():
            path = INTERNAL_ROOT / "docs" / "about_dashboard" / "GUIDE_RU.md"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"{prefix} file not found")
    try:
        text = path.read_text(encoding="utf-8")
        return markdown.markdown(text, extensions=['extra', 'tables'])
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

@router.get("/api/dashboard/guide", response_model=DialecticsGuideResponse)
async def get_dashboard_guide(
    request: Request,
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Возвращает руководство по дашборду и виджетам в формате HTML с учетом языка."""
    return {"html": get_localized_markdown_html("DASHBOARD_GUIDE", "GUIDE_RU.md", request)}

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
    
    # Create initial version
    initial_ver = DialecticsVersion(
        dialectics_id=new_note.id,
        title="Создание конспекта",
        content_json=content_json,
        is_manual=True
    )
    db.add(initial_ver)
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
    category_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Возвращает список записей 'Диалектики'."""
    query = select(Dialectics).options(selectinload(Dialectics.category)).outerjoin(Dialectics.category).where(Dialectics.is_deleted == False)
    if category_id is not None:
        query = query.where(Dialectics.category_id == category_id)
    if search:
        query = query.where(
            or_(
                Dialectics.title.ilike(f"%{search}%"),
                DialecticsCategory.name.ilike(f"%{search}%")
            )
        )
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
        elif note.title in ["Summation", "Суммирование", "Суммалау"]:
            sum_map = {
                "en": "Summation",
                "ru": "Суммирование",
                "kz": "Суммалау"
            }
            note.title = sum_map.get(locale, "Summation")

    return notes

@router.get("/api/dialectics/example/get_or_create_id", response_model=DialecticsIdResponse)
async def get_example_note_id(request: Request, type: str = "pythagoras", db: AsyncSession = Depends(get_db)):
    """Находит или создаёт пример конспекта под текущий язык и возвращает его ID."""
    locale = request.cookies.get("locale", "en")
    if locale == "kk": locale = "kz"
    
    if type == "summation":
        locale_map = {
            "en": ("Summation", "summation_note_content.json"),
            "ru": ("Суммирование", "summation_note_content_ru.json"),
            "kz": ("Суммалау", "summation_note_content_kz.json")
        }
    else:
        locale_map = {
            "en": ("Example Note", "example_note_content.json"),
            "ru": ("Пример конспекта", "example_note_content_ru.json"),
            "kz": ("Конспект мысалы", "example_note_content_kz.json")
        }
    
    target_title, json_file = locale_map.get(locale, locale_map["ru" if type == "summation" else "en"])
    
    titles_to_check = [val[0] for val in locale_map.values()]
    stmt = select(Dialectics).where(Dialectics.title.in_(titles_to_check))
    res = await db.execute(stmt)
    existing = res.scalars().first()
    
    if existing:
        return {"id": existing.id}
    else:
        json_path = INTERNAL_ROOT / "fastapi_app" / "static" / json_file
        if not json_path.exists():
            fallback_file = "summation_note_content_ru.json" if type == "summation" else "example_note_content.json"
            json_path = INTERNAL_ROOT / "fastapi_app" / "static" / fallback_file
            
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
    query = select(Dialectics).options(selectinload(Dialectics.category)).where(Dialectics.id == id, Dialectics.is_deleted == False)
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
    elif note.title in ["Summation", "Суммирование", "Суммалау"]:
        locale = request.cookies.get("locale", "en")
        if locale == "kk": locale = "kz"
        sum_map = {
            "en": ("Summation", "summation_note_content.json"),
            "ru": ("Суммирование", "summation_note_content_ru.json"),
            "kz": ("Суммалау", "summation_note_content_kz.json")
        }
        target_title, json_file = sum_map.get(locale, sum_map["en"])
        json_path = INTERNAL_ROOT / "fastapi_app" / "static" / json_file
        if not json_path.exists():
            json_path = INTERNAL_ROOT / "fastapi_app" / "static" / "summation_note_content_ru.json"
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            note.title = data.get("title", target_title)
            note.content_json = data.get("content_json", [])
        except Exception as e:
            logger.error(f"Error loading localized summation note: {e}")
                
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
    note.updated_at = datetime.now(timezone.utc)
    flag_modified(note, "content_json")
    
    if data.is_pinned is not None:
        note.is_pinned = data.is_pinned
        
    if hasattr(data, 'category_id'):
        note.category_id = data.category_id
    
    await db.commit()
    
    # Handle versioning with 15 min cooldown and max 30 auto versions limit
    ver_query = select(DialecticsVersion).where(
        DialecticsVersion.dialectics_id == note.id,
        DialecticsVersion.is_manual == False
    ).order_by(DialecticsVersion.created_at.desc()).limit(1)
    ver_res = await db.execute(ver_query)
    latest_ver = ver_res.scalar_one_or_none()
    
    now_utc = datetime.now(timezone.utc)
    if latest_ver and (now_utc - latest_ver.created_at) < timedelta(minutes=15):
        latest_ver.content_json = copy.deepcopy(content_json)
        latest_ver.created_at = now_utc
        flag_modified(latest_ver, "content_json")
    else:
        new_ver = DialecticsVersion(
            dialectics_id=note.id,
            title="Автосохранение",
            content_json=copy.deepcopy(content_json),
            is_manual=False
        )
        db.add(new_ver)
        await db.commit()
        
        # Enforce limit of 30 auto versions
        count_query = select(DialecticsVersion).where(
            DialecticsVersion.dialectics_id == note.id,
            DialecticsVersion.is_manual == False
        ).order_by(DialecticsVersion.created_at.desc())
        all_auto_res = await db.execute(count_query)
        all_auto_vers = all_auto_res.scalars().all()
        if len(all_auto_vers) > 30:
            for old_ver in all_auto_vers[30:]:
                await db.delete(old_ver)
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
    result = await db.execute(select(Dialectics).options(selectinload(Dialectics.category)).where(Dialectics.is_pinned == True, Dialectics.is_deleted == False).limit(1))
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
    """Удаляет запись в корзину (soft delete)."""
    note = await db.get(Dialectics, id)
    if not note:
        raise HTTPException(status_code=404, detail="Entry not found")
    clean_title = (note.title or "").strip().lower()
    if clean_title and (clean_title in ["example note", "пример конспекта", "конспект мысалы", "summation", "суммирование", "суммалау"] or "сумм" in clean_title or "summation" in clean_title or "пример конспекта" in clean_title):
        raise HTTPException(status_code=400, detail="Cannot delete default note")
    
    note.is_deleted = True
    note.deleted_at = datetime.now(timezone.utc)
    note.is_pinned = False
    await db.commit()
    return schemas.SuccessResponse(message="Dialectics entry moved to trash")

@router.get("/api/dialectics/trash/list", response_model=List[DialecticsView])
async def list_trash_dialectics(
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Возвращает список удалённых в корзину конспектов."""
    query = select(Dialectics).options(selectinload(Dialectics.category)).where(Dialectics.is_deleted == True).order_by(Dialectics.deleted_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/api/dialectics/{id}/restore", response_model=DialecticsView)
async def restore_dialectics(
    id: int,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Dialectics:
    """Восстанавливает конспект из корзины."""
    note = await db.get(Dialectics, id)
    if not note:
        raise HTTPException(status_code=404, detail="Entry not found")
    note.is_deleted = False
    note.deleted_at = None
    await db.commit()
    query = select(Dialectics).options(selectinload(Dialectics.category)).where(Dialectics.id == id)
    result = await db.execute(query)
    return result.scalar_one()

@router.delete("/api/dialectics/{id}/permanent", response_model=schemas.SuccessResponse)
async def permanent_delete_dialectics(
    id: int,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
):
    """Окончательно удаляет запись из базы данных."""
    note = await db.get(Dialectics, id)
    if not note:
        raise HTTPException(status_code=404, detail="Entry not found")
    await db.delete(note)
    await db.commit()
    return schemas.SuccessResponse(message="Dialectics entry permanently deleted")



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
    
    query = select(Dialectics).options(selectinload(Dialectics.category)).outerjoin(Dialectics.category).where(
        Dialectics.is_deleted == False,
        or_(
            Dialectics.title.ilike(search_term),
            cast(Dialectics.content_json, String).ilike(search_term),
            DialecticsCategory.name.ilike(search_term)
        )
    )
    result = await db.execute(query.order_by(func.coalesce(Dialectics.updated_at, Dialectics.created_at).desc()))
    return result.scalars().all()

@router.get("/api/dialectics/{id}/versions", response_model=List[DialecticsVersionView])
async def list_dialectics_versions(
    id: int,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Возвращает историю версий конспекта."""
    query = select(DialecticsVersion).where(DialecticsVersion.dialectics_id == id).order_by(DialecticsVersion.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/api/dialectics/{id}/versions", response_model=DialecticsVersionView)
async def create_dialectics_version(
    id: int,
    data: DialecticsVersionCreate,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Создает ручную сохраненную версию конспекта."""
    note = await db.get(Dialectics, id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    version = DialecticsVersion(
        dialectics_id=id,
        title=data.title or "Ручное сохранение",
        content_json=copy.deepcopy(note.content_json),
        is_manual=True
    )
    db.add(version)
    await db.commit()
    await db.refresh(version)
    return version

@router.post("/api/dialectics/{id}/versions/{version_id}/restore", response_model=DialecticsView)
async def restore_dialectics_version(
    id: int,
    version_id: int,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Восстанавливает состояние конспекта из выбранной версии."""
    query = select(Dialectics).options(selectinload(Dialectics.category)).where(Dialectics.id == id)
    result = await db.execute(query)
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    version = await db.get(DialecticsVersion, version_id)
    if not version or version.dialectics_id != id:
        raise HTTPException(status_code=404, detail="Version not found")
        
    safety_ver = DialecticsVersion(
        dialectics_id=id,
        title=f"Перед восстановлением: {version.title}",
        content_json=copy.deepcopy(note.content_json),
        is_manual=True
    )
    db.add(safety_ver)
    
    note.content_json = copy.deepcopy(version.content_json)
    note.updated_at = datetime.now(timezone.utc)
    flag_modified(note, "content_json")
    await db.commit()
    
    query = select(Dialectics).options(selectinload(Dialectics.category)).where(Dialectics.id == id)
    result = await db.execute(query)
    return result.scalar_one()

@router.post("/api/dialectics/{id}/versions/{version_id}/pin", response_model=DialecticsVersionView)
async def pin_dialectics_version(
    id: int,
    version_id: int,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Закрепляет версию от автоудаления."""
    version = await db.get(DialecticsVersion, version_id)
    if not version or version.dialectics_id != id:
        raise HTTPException(status_code=404, detail="Version not found")
    version.is_manual = not version.is_manual
    await db.commit()
    await db.refresh(version)
    return version

@router.delete("/api/dialectics/{id}/versions/{version_id}", response_model=SuccessResponse)
async def delete_dialectics_version(
    id: int,
    version_id: int,
    db: AsyncSession = Depends(get_db),
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Удаляет версию из истории."""
    version = await db.get(DialecticsVersion, version_id)
    if not version or version.dialectics_id != id:
        raise HTTPException(status_code=404, detail="Version not found")
    await db.delete(version)
    await db.commit()
    return SuccessResponse(success=True)
