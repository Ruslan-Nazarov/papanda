from fastapi import Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, cast, String
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.attributes import flag_modified
from typing import List, Optional, Any
from datetime import datetime, timezone, timedelta
import json
import copy

from ..config import INTERNAL_ROOT
from ..logger import logger
from ..models.dialectics import Dialectics, DialecticsCategory, DialecticsVersion
from ..schemas.dialectics import DialecticsCreate, DialecticsUpdate, CategoryCreate, DialecticsVersionCreate
from ..schemas import SuccessResponse
from .sticky_note_service import StickyNoteService


class DialecticsService:
    """Сервис бизнес-логики и работы с БД для конспектов 'Диалектики'."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def save_dialectics(self, data: DialecticsCreate, sns: StickyNoteService) -> Dialectics:
        content_json = [b.model_dump() for b in data.blocks]
        new_note = Dialectics(
            title=data.title or "",
            content_json=content_json,
            is_pinned=data.is_pinned,
            category_id=data.category_id,
            status=data.status or "none"
        )
        self.db.add(new_note)
        await self.db.commit()

        initial_ver = DialecticsVersion(
            dialectics_id=new_note.id,
            title="Создание конспекта",
            content_json=content_json,
            is_manual=True,
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(initial_ver)
        await self.db.commit()

        query = select(Dialectics).options(selectinload(Dialectics.category)).where(Dialectics.id == new_note.id)
        result = await self.db.execute(query)
        new_note = result.scalar_one()

        if data.sticker_text or data.sticker_title:
            await sns.upsert_for_dialectics(
                dialectics_id=new_note.id,
                text=data.sticker_text or "",
                title=data.sticker_title,
                color=data.sticker_color or "#fff9c4",
                type=data.sticker_type or "text"
            )

        return new_note

    async def list_dialectics(self, request: Request, search: Optional[str] = None, category_id: Optional[int] = None) -> List[Dialectics]:
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
        result = await self.db.execute(query.order_by(func.coalesce(Dialectics.updated_at, Dialectics.created_at).desc()))
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

    async def get_or_create_example_note_id(self, request: Request, note_type: str = "pythagoras") -> int:
        locale = request.cookies.get("locale", "en")
        if locale == "kk": locale = "kz"

        if note_type == "summation":
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

        target_title, json_file = locale_map.get(locale, locale_map["ru" if note_type == "summation" else "en"])

        titles_to_check = [val[0] for val in locale_map.values()]
        stmt = select(Dialectics).where(Dialectics.title.in_(titles_to_check))
        res = await self.db.execute(stmt)
        existing = res.scalars().first()

        if existing:
            return existing.id
        else:
            json_path = INTERNAL_ROOT / "fastapi_app" / "static" / json_file
            if not json_path.exists():
                fallback_file = "summation_note_content_ru.json" if note_type == "summation" else "example_note_content.json"
                json_path = INTERNAL_ROOT / "fastapi_app" / "static" / fallback_file

            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            new_note = Dialectics(
                title=data.get("title", target_title),
                content_json=data.get("content_json", []),
                is_pinned=data.get("is_pinned", False)
            )
            self.db.add(new_note)
            await self.db.commit()
            return new_note.id

    async def get_dialectics(self, id: int, request: Request) -> Dialectics:
        query = select(Dialectics).options(selectinload(Dialectics.category)).where(Dialectics.id == id, Dialectics.is_deleted == False)
        result = await self.db.execute(query)
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

    async def update_dialectics(self, id: int, data: DialecticsUpdate, sns: StickyNoteService) -> Dialectics:
        query = select(Dialectics).options(selectinload(Dialectics.category)).where(Dialectics.id == id)
        result = await self.db.execute(query)
        note = result.scalar_one_or_none()

        if not note:
            raise HTTPException(status_code=404, detail="Entry not found")

        if data.title is not None:
            note.title = data.title
        if data.status is not None:
            note.status = data.status

        content_json = None
        if data.blocks is not None:
            content_json = [b.model_dump() for b in data.blocks]
            note.content_json = content_json
            flag_modified(note, "content_json")

        note.updated_at = datetime.now(timezone.utc)

        if data.is_pinned is not None:
            note.is_pinned = data.is_pinned

        if hasattr(data, 'category_id'):
            note.category_id = data.category_id

        await self.db.commit()

        if data.blocks is not None and content_json is not None:
            # 1. Get the latest version of any type (manual or auto) for this note
            latest_any_ver_query = select(DialecticsVersion).where(
                DialecticsVersion.dialectics_id == note.id
            ).order_by(DialecticsVersion.created_at.desc()).limit(1)
            latest_any_res = await self.db.execute(latest_any_ver_query)
            latest_any_ver = latest_any_res.scalar_one_or_none()

            # 2. If content is identical to the latest version, skip saving versions entirely
            if latest_any_ver and latest_any_ver.content_json == content_json:
                pass
            else:
                ver_query = select(DialecticsVersion).where(
                    DialecticsVersion.dialectics_id == note.id,
                    DialecticsVersion.is_manual == False
                ).order_by(DialecticsVersion.created_at.desc()).limit(1)
                ver_res = await self.db.execute(ver_query)
                latest_ver = ver_res.scalar_one_or_none()

                now_utc = datetime.now(timezone.utc)
                ver_ts = None
                if latest_ver:
                    ver_ts = latest_ver.created_at
                    if ver_ts is not None and ver_ts.tzinfo is None:
                        ver_ts = ver_ts.replace(tzinfo=timezone.utc)

                # If the latest auto-save is within 15 minutes, overwrite it without shifting the timestamp
                if latest_ver and ver_ts is not None and (now_utc - ver_ts) < timedelta(minutes=15):
                    latest_ver.content_json = copy.deepcopy(content_json)
                    flag_modified(latest_ver, "content_json")
                else:
                    new_ver = DialecticsVersion(
                        dialectics_id=note.id,
                        title="Автосохранение",
                        content_json=copy.deepcopy(content_json),
                        is_manual=False,
                        created_at=now_utc
                    )
                    self.db.add(new_ver)
                    await self.db.commit()

                    count_query = select(DialecticsVersion).where(
                        DialecticsVersion.dialectics_id == note.id,
                        DialecticsVersion.is_manual == False
                    ).order_by(DialecticsVersion.created_at.desc())
                    all_auto_res = await self.db.execute(count_query)
                    all_auto_vers = all_auto_res.scalars().all()
                    if len(all_auto_vers) > 30:
                        for old_ver in all_auto_vers[30:]:
                            await self.db.delete(old_ver)
        await self.db.commit()

        query = select(Dialectics).options(selectinload(Dialectics.category)).where(Dialectics.id == note.id)
        result = await self.db.execute(query)
        note = result.scalar_one()

        if data.sticker_text or data.sticker_title:
            await sns.upsert_for_dialectics(
                dialectics_id=note.id,
                text=data.sticker_text or "",
                title=data.sticker_title,
                color=data.sticker_color or "#fff9c4",
                type=data.sticker_type or "text"
            )

        return note

    async def update_dialectics_status(self, id: int, status: str) -> Dialectics:
        query = select(Dialectics).options(selectinload(Dialectics.category)).where(Dialectics.id == id)
        result = await self.db.execute(query)
        note = result.scalar_one_or_none()
        if not note:
            raise HTTPException(status_code=404, detail="Entry not found")
        note.status = status
        note.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        return note

    async def get_pinned_dialectics(self) -> Optional[Dialectics]:
        result = await self.db.execute(select(Dialectics).options(selectinload(Dialectics.category)).where(Dialectics.is_pinned == True, Dialectics.is_deleted == False).limit(1))
        return result.scalar_one_or_none()

    async def pin_dialectics(self, id: int) -> Dialectics:
        note = await self.db.get(Dialectics, id)
        if not note:
            raise HTTPException(status_code=404, detail="Entry not found")
        note.is_pinned = True
        await self.db.commit()
        await self.db.refresh(note)
        return note

    async def unpin_dialectics(self, id: int) -> Dialectics:
        note = await self.db.get(Dialectics, id)
        if not note:
            raise HTTPException(status_code=404, detail="Entry not found")
        note.is_pinned = False
        await self.db.commit()
        await self.db.refresh(note)
        return note

    async def delete_dialectics(self, id: int) -> SuccessResponse:
        note = await self.db.get(Dialectics, id)
        if not note:
            raise HTTPException(status_code=404, detail="Entry not found")
        clean_title = (note.title or "").strip().lower()
        if clean_title and (clean_title in ["example note", "пример конспекта", "конспект мысалы", "summation", "суммирование", "суммалау"] or "сумм" in clean_title or "summation" in clean_title or "пример конспекта" in clean_title):
            raise HTTPException(status_code=400, detail="Cannot delete default note")

        note.is_deleted = True
        note.deleted_at = datetime.now(timezone.utc)
        note.is_pinned = False
        await self.db.commit()
        return SuccessResponse(message="Dialectics entry moved to trash")

    async def list_trash_dialectics(self) -> List[Dialectics]:
        query = select(Dialectics).options(selectinload(Dialectics.category)).where(Dialectics.is_deleted == True).order_by(Dialectics.deleted_at.desc())
        result = await self.db.execute(query)
        return result.scalars().all()

    async def restore_dialectics(self, id: int) -> Dialectics:
        note = await self.db.get(Dialectics, id)
        if not note:
            raise HTTPException(status_code=404, detail="Entry not found")
        note.is_deleted = False
        note.deleted_at = None
        await self.db.commit()
        query = select(Dialectics).options(selectinload(Dialectics.category)).where(Dialectics.id == id)
        result = await self.db.execute(query)
        return result.scalar_one()

    async def permanent_delete_dialectics(self, id: int) -> SuccessResponse:
        note = await self.db.get(Dialectics, id)
        if not note:
            raise HTTPException(status_code=404, detail="Entry not found")
        await self.db.delete(note)
        await self.db.commit()
        return SuccessResponse(message="Dialectics entry permanently deleted")

    async def list_categories(self) -> List[DialecticsCategory]:
        result = await self.db.execute(select(DialecticsCategory).order_by(DialecticsCategory.name))
        return result.scalars().all()

    async def create_category(self, data: CategoryCreate) -> DialecticsCategory:
        existing = await self.db.execute(select(DialecticsCategory).where(func.lower(DialecticsCategory.name) == data.name.lower()))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Category already exists")

        category = DialecticsCategory(name=data.name, color=data.color)
        self.db.add(category)
        await self.db.commit()
        await self.db.refresh(category)
        return category

    async def search_dialectics(self, q: str) -> List[Dialectics]:
        if not q or len(q.strip()) < 2:
            return []
        search_term = f"%{q.strip()}%"
        query = select(Dialectics).options(selectinload(Dialectics.category)).outerjoin(Dialectics.category).where(
            Dialectics.is_deleted == False,
            or_(
                Dialectics.title.ilike(search_term),
                cast(Dialectics.content_json, String).ilike(search_term),
                DialecticsCategory.name.ilike(search_term)
            )
        )
        result = await self.db.execute(query.order_by(func.coalesce(Dialectics.updated_at, Dialectics.created_at).desc()))
        return result.scalars().all()

    async def list_versions(self, id: int) -> List[DialecticsVersion]:
        query = select(DialecticsVersion).where(DialecticsVersion.dialectics_id == id).order_by(DialecticsVersion.created_at.desc())
        result = await self.db.execute(query)
        return result.scalars().all()

    async def create_version(self, id: int, data: DialecticsVersionCreate) -> DialecticsVersion:
        note = await self.db.get(Dialectics, id)
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")

        # Delete the latest auto-save version if it has identical content to prevent duplication
        latest_ver_query = select(DialecticsVersion).where(
            DialecticsVersion.dialectics_id == id
        ).order_by(DialecticsVersion.created_at.desc()).limit(1)
        latest_res = await self.db.execute(latest_ver_query)
        latest_ver = latest_res.scalar_one_or_none()

        if latest_ver and not latest_ver.is_manual and latest_ver.content_json == note.content_json:
            await self.db.delete(latest_ver)
            await self.db.commit()

        version = DialecticsVersion(
            dialectics_id=id,
            title=data.title or "Ручное сохранение",
            content_json=copy.deepcopy(note.content_json),
            is_manual=True,
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(version)
        await self.db.commit()
        await self.db.refresh(version)
        return version

    async def restore_version(self, id: int, version_id: int) -> Dialectics:
        query = select(Dialectics).options(selectinload(Dialectics.category)).where(Dialectics.id == id)
        result = await self.db.execute(query)
        note = result.scalar_one_or_none()
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")

        version = await self.db.get(DialecticsVersion, version_id)
        if not version or version.dialectics_id != id:
            raise HTTPException(status_code=404, detail="Version not found")

        safety_ver = DialecticsVersion(
            dialectics_id=id,
            title=f"Перед восстановлением: {version.title}",
            content_json=copy.deepcopy(note.content_json),
            is_manual=True,
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(safety_ver)

        note.content_json = copy.deepcopy(version.content_json)
        note.updated_at = datetime.now(timezone.utc)
        flag_modified(note, "content_json")
        await self.db.commit()

        query = select(Dialectics).options(selectinload(Dialectics.category)).where(Dialectics.id == id)
        result = await self.db.execute(query)
        return result.scalar_one()

    async def pin_version(self, id: int, version_id: int) -> DialecticsVersion:
        version = await self.db.get(DialecticsVersion, version_id)
        if not version or version.dialectics_id != id:
            raise HTTPException(status_code=404, detail="Version not found")
        version.is_manual = not version.is_manual
        await self.db.commit()
        await self.db.refresh(version)
        return version

    async def delete_version(self, id: int, version_id: int) -> SuccessResponse:
        version = await self.db.get(DialecticsVersion, version_id)
        if not version or version.dialectics_id != id:
            raise HTTPException(status_code=404, detail="Version not found")
        await self.db.delete(version)
        await self.db.commit()
        return SuccessResponse(success=True)
