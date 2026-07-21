from fastapi import APIRouter, Request, Depends, HTTPException, status, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Any, Optional
from .. import schemas

from ..database import get_db
from ..services.auth import check_auth_dependency
from ..config import templates, INTERNAL_ROOT
from ..logger import logger
from ..models.dialectics import Dialectics, DialecticsCategory, DialecticsVersion
from ..schemas.dialectics import DialecticsCreate, DialecticsView, DialecticsUpdate, DialecticsGuideResponse, DialecticsCategoryBase, CategoryCreate, DialecticsVersionView, DialecticsVersionCreate
from ..schemas import SuccessResponse, DialecticsIdResponse
from ..services.sticky_note_service import StickyNoteService
from ..services.dialectics_service import DialecticsService
from ..services.settings_service import get_setting
from ..dependencies import get_sticky_note_service, get_dialectics_service
import markdown

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
    ds: DialecticsService = Depends(get_dialectics_service),
    sns: StickyNoteService = Depends(get_sticky_note_service),
    user: Any = Depends(check_auth_dependency)
) -> Dialectics:
    """Сохраняет новую запись 'Диалектики'."""
    return await ds.save_dialectics(data, sns)


@router.get("/api/dialectics", response_model=List[DialecticsView])
async def list_dialectics(
    request: Request,
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    ds: DialecticsService = Depends(get_dialectics_service),
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Возвращает список записей 'Диалектики'."""
    return await ds.list_dialectics(request, search, category_id)


@router.get("/api/dialectics/example/get_or_create_id", response_model=DialecticsIdResponse)
async def get_example_note_id(
    request: Request,
    type: str = "pythagoras",
    ds: DialecticsService = Depends(get_dialectics_service)
):
    """Находит или создаёт пример конспекта под текущий язык и возвращает его ID."""
    note_id = await ds.get_or_create_example_note_id(request, type)
    return {"id": note_id}


@router.get("/api/dialectics/{id}", response_model=DialecticsView)
async def get_dialectics(
    id: int,
    request: Request,
    ds: DialecticsService = Depends(get_dialectics_service),
    user: Any = Depends(check_auth_dependency)
) -> Dialectics:
    """Возвращает содержимое конкретной записи."""
    return await ds.get_dialectics(id, request)


@router.patch("/api/dialectics/{id}", response_model=DialecticsView)
async def update_dialectics(
    id: int,
    data: DialecticsUpdate,
    ds: DialecticsService = Depends(get_dialectics_service),
    sns: StickyNoteService = Depends(get_sticky_note_service),
    user: Any = Depends(check_auth_dependency)
) -> Dialectics:
    """Обновляет существующую запись 'Диалектики'."""
    return await ds.update_dialectics(id, data, sns)


@router.post("/api/dialectics/{id}/status", response_model=DialecticsView)
async def update_dialectics_status(
    id: int,
    status: str = Query(...),
    ds: DialecticsService = Depends(get_dialectics_service),
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Быстро обновляет статус конспекта."""
    return await ds.update_dialectics_status(id, status)


@router.get("/api/dialectics/pinned/active", response_model=Optional[DialecticsView])
async def get_pinned_dialectics(
    ds: DialecticsService = Depends(get_dialectics_service),
    user: Any = Depends(check_auth_dependency)
) -> Optional[Dialectics]:
    """Возвращает закрепленную запись."""
    return await ds.get_pinned_dialectics()


@router.post("/api/dialectics/{id}/pin", response_model=DialecticsView)
async def pin_dialectics(
    id: int,
    ds: DialecticsService = Depends(get_dialectics_service),
    user: Any = Depends(check_auth_dependency)
) -> Dialectics:
    """Закрепляет запись."""
    return await ds.pin_dialectics(id)


@router.post("/api/dialectics/{id}/unpin", response_model=DialecticsView)
async def unpin_dialectics(
    id: int,
    ds: DialecticsService = Depends(get_dialectics_service),
    user: Any = Depends(check_auth_dependency)
) -> Dialectics:
    """Открепляет запись."""
    return await ds.unpin_dialectics(id)


@router.delete("/api/dialectics/{id}", response_model=schemas.SuccessResponse)
async def delete_dialectics(
    id: int,
    ds: DialecticsService = Depends(get_dialectics_service),
    user: Any = Depends(check_auth_dependency)
):
    """Удаляет запись в корзину (soft delete)."""
    return await ds.delete_dialectics(id)


@router.get("/api/dialectics/trash/list", response_model=List[DialecticsView])
async def list_trash_dialectics(
    ds: DialecticsService = Depends(get_dialectics_service),
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Возвращает список удалённых в корзину конспектов."""
    return await ds.list_trash_dialectics()


@router.post("/api/dialectics/{id}/restore", response_model=DialecticsView)
async def restore_dialectics(
    id: int,
    ds: DialecticsService = Depends(get_dialectics_service),
    user: Any = Depends(check_auth_dependency)
) -> Dialectics:
    """Восстанавливает конспект из корзины."""
    return await ds.restore_dialectics(id)


@router.delete("/api/dialectics/{id}/permanent", response_model=schemas.SuccessResponse)
async def permanent_delete_dialectics(
    id: int,
    ds: DialecticsService = Depends(get_dialectics_service),
    user: Any = Depends(check_auth_dependency)
):
    """Окончательно удаляет запись из базы данных."""
    return await ds.permanent_delete_dialectics(id)


@router.get("/api/dialectics/categories/all", response_model=List[DialecticsCategoryBase])
async def list_dialectics_categories(
    ds: DialecticsService = Depends(get_dialectics_service),
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Возвращает список всех категорий диалектики."""
    return await ds.list_categories()


@router.post("/api/dialectics/categories/new", response_model=DialecticsCategoryBase)
async def create_dialectics_category(
    data: CategoryCreate,
    ds: DialecticsService = Depends(get_dialectics_service),
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Создает новую категорию для диалектики."""
    return await ds.create_category(data)


@router.get("/api/dialectics/search/notes", response_model=List[DialecticsView])
async def search_dialectics(
    request: Request,
    q: str,
    ds: DialecticsService = Depends(get_dialectics_service),
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Поиск по конспектам (по заголовку и содержимому)."""
    return await ds.search_dialectics(q)


@router.get("/api/dialectics/{id}/versions", response_model=List[DialecticsVersionView])
async def list_dialectics_versions(
    id: int,
    ds: DialecticsService = Depends(get_dialectics_service),
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Возвращает историю версий конспекта."""
    return await ds.list_versions(id)


@router.post("/api/dialectics/{id}/versions", response_model=DialecticsVersionView)
async def create_dialectics_version(
    id: int,
    data: DialecticsVersionCreate,
    ds: DialecticsService = Depends(get_dialectics_service),
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Создает ручную сохраненную версию конспекта."""
    return await ds.create_version(id, data)


@router.post("/api/dialectics/{id}/versions/{version_id}/restore", response_model=DialecticsView)
async def restore_dialectics_version(
    id: int,
    version_id: int,
    ds: DialecticsService = Depends(get_dialectics_service),
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Восстанавливает состояние конспекта из выбранной версии."""
    return await ds.restore_version(id, version_id)


@router.post("/api/dialectics/{id}/versions/{version_id}/pin", response_model=DialecticsVersionView)
async def pin_dialectics_version(
    id: int,
    version_id: int,
    ds: DialecticsService = Depends(get_dialectics_service),
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Закрепляет версию от автоудаления."""
    return await ds.pin_version(id, version_id)


@router.delete("/api/dialectics/{id}/versions/{version_id}", response_model=SuccessResponse)
async def delete_dialectics_version(
    id: int,
    version_id: int,
    ds: DialecticsService = Depends(get_dialectics_service),
    user: Any = Depends(check_auth_dependency)
) -> Any:
    """Удаляет версию из истории."""
    return await ds.delete_version(id, version_id)
