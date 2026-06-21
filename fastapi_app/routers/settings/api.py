from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from typing import List, Dict, Any

from ...database import get_db
from ... import models, schemas
from ...services.auth import check_auth_dependency
from ...services.event_service import EventService
from ...services.admin_service import AdminService
from ...dependencies import get_event_service, get_admin_service
from ...logger import logger

router = APIRouter(
    dependencies=[Depends(check_auth_dependency)]
)

@router.post("/edit_event_inline", response_model=schemas.SuccessResponse)
async def edit_event_inline(
    request: Request, 
    event_service: EventService = Depends(get_event_service)
):
    """Редактирует событие или создает новое."""
    data = await request.json()
    success, message, created_id = await event_service.update_event_inline(data)
    if success:
        return schemas.SuccessResponse(message=f"{message}. ID: {created_id}")
    return JSONResponse(status_code=400, content={"status": "error", "message": message})

@router.post("/edit_note_inline", response_model=schemas.SuccessResponse)
async def edit_note_inline(
    data: schemas.GenericUpdateSchema, 
    as_service: AdminService = Depends(get_admin_service)
):
    success = await as_service.update_item("Notes", data.id, data.model_dump())
    if success: return schemas.SuccessResponse()
    return JSONResponse(status_code=400, content={"status": "error"})

@router.post("/edit_chrono_inline", response_model=schemas.SuccessResponse)
async def edit_chrono_inline(
    data: schemas.GenericUpdateSchema, 
    as_service: AdminService = Depends(get_admin_service)
):
    success = await as_service.update_item("Chronology", data.id, data.model_dump())
    if success: return schemas.SuccessResponse()
    return JSONResponse(status_code=400, content={"status": "error"})

@router.post("/edit_habit_inline", response_model=schemas.SuccessResponse)
async def edit_habit_inline(
    data: schemas.GenericUpdateSchema, 
    as_service: AdminService = Depends(get_admin_service)
):
    success = await as_service.update_item("Habit", data.id, data.model_dump())
    if success: return schemas.SuccessResponse()
    return JSONResponse(status_code=400, content={"status": "error"})

@router.post("/edit_task_inline", response_model=schemas.SuccessResponse)
async def edit_task_inline(
    data: schemas.GenericUpdateSchema, 
    as_service: AdminService = Depends(get_admin_service)
):
    success = await as_service.update_item("Task", data.id, data.model_dump())
    if success: return schemas.SuccessResponse()
    return JSONResponse(status_code=400, content={"status": "error"})

@router.post("/edit_wink_inline", response_model=schemas.SuccessResponse)
async def edit_wink_inline(
    data: schemas.GenericUpdateSchema, 
    as_service: AdminService = Depends(get_admin_service)
):
    success = await as_service.update_item("Wink", data.id, data.model_dump())
    if success: return schemas.SuccessResponse()
    return JSONResponse(status_code=400, content={"status": "error"})

@router.post("/edit_sticker_inline", response_model=schemas.SuccessResponse)
async def edit_sticker_inline(
    data: schemas.GenericUpdateSchema, 
    as_service: AdminService = Depends(get_admin_service)
):
    success = await as_service.update_item("StickyNote", data.id, data.model_dump())
    if success: return schemas.SuccessResponse()
    return JSONResponse(status_code=400, content={"status": "error"})

@router.get("/api/events/tree/{color}", response_model=schemas.SuccessResponse)
async def get_event_tree(color: str, db: AsyncSession = Depends(get_db)):
    """Возвращает дерево событий определенного цвета."""
    # Ensure we search both formats: #RRGGBB and RRGGBB
    search_color = color if color.startswith("#") else "#" + color
    raw_color = search_color.replace("#", "")
    
    result = await db.execute(
        select(models.Event)
        .where(
            or_(
                func.lower(models.Event.color) == search_color.lower(),
                func.lower(models.Event.color) == raw_color.lower()
            )
        )
        .order_by(models.Event.date.asc())
    )
    events = result.scalars().all()
    
    tree_data = []
    for e in events:
        stickers_res = await db.execute(
            select(func.count(models.StickyNote.id))
            .where(
                models.StickyNote.finished_at.is_(None),
                or_(models.StickyNote.event_id == e.id, and_(models.StickyNote.recurrence_id.isnot(None), models.StickyNote.recurrence_id == e.recurrence_id))
            )
        )
        tree_data.append({
            "id": e.id, "title": e.title, "date": e.date.isoformat(),
            "has_stickers": (stickers_res.scalar() or 0) > 0,
            "recurrence_id": e.recurrence_id,
            "important": e.important,
            "color": e.color,
            "done": e.done
        })
    return schemas.SuccessResponse(message="Success", data=tree_data)

@router.get("/api/events/month", response_class=JSONResponse)
async def get_events_for_month(
    year: int, month: int, 
    as_service: AdminService = Depends(get_admin_service)
):
    """Returns a JSON list of events for the specified month to be used in the standalone modal."""
    ctx = await as_service.get_db_view_context(
        model_name='Event', month=month, year=year
    )
    records = ctx.get('records', [])
    data = []
    for row in records:
        data.append({
            "id": row.id,
            "title": row.title or "",
            "date": row.date.isoformat() if row.date else "",
            "recurrence_rule": row.recurrence_rule or "",
            "recurrence_end": row.recurrence_end.isoformat() if row.recurrence_end else "",
            "recurrence_id": row.recurrence_id or "",
            "color": row.color or "",
            "important": bool(row.important),
            "done": bool(row.done),
            "has_stickers": bool(getattr(row, "has_stickers", False)),
            "stickers_count": int(getattr(row, "stickers_count", 0))
        })
    return {"events": data}

import json
import re
from ...config import settings

@router.post("/import_sentences")
async def import_sentences(request: Request):
    """Импортирует JSON с предложениями и добавляет в sentence.json"""
    try:
        new_sentences = await request.json()
    except Exception as e:
        return JSONResponse(status_code=400, content={"message": f"Invalid JSON format: {str(e)}"})
        
    if not isinstance(new_sentences, list):
        return JSONResponse(status_code=400, content={"message": "JSON must be an array of sentences."})
        
    sentence_file = settings.resources_dir / "sentence.json"
    
    existing_sentences = []
    if sentence_file.exists():
        try:
            with open(sentence_file, "r", encoding="utf-8") as f:
                existing_sentences = json.load(f)
        except Exception as e:
            return JSONResponse(status_code=500, content={"message": f"Failed to read existing sentence.json: {str(e)}"})
            
    existing_ids = {s.get("id") for s in existing_sentences if "id" in s}
    
    ALLOWED_ROLES = {
        "Subject", "Predicate", "Object",
        "Attribute", "Attribute_Subject", "Attribute_Object",
        "Circumstance", "Adverbial", "Conjunction"
    }
    PUNCTUATION = set(".,!?;:\"'—–-")
    
    errors = []
    valid_sentences = []
    
    for i, s in enumerate(new_sentences):
        prefix = f"[{s.get('id', f'index {i}')}]"
        
        # Check required fields
        missing = [f for f in ("id", "language", "sentence", "words") if f not in s]
        if missing:
            errors.append(f"{prefix} Missing fields: {', '.join(missing)}")
            continue
            
        sid = s["id"]
        if sid in existing_ids:
            errors.append(f"{prefix} ID already exists in sentence.json")
            continue
            
        if not re.match(r"^[a-z]{2}_\d+$", sid):
            errors.append(f"{prefix} Invalid id format (expected e.g., kz_1)")
            continue
            
        if not isinstance(s.get("words"), list) or not s["words"]:
            errors.append(f"{prefix} 'words' is empty or not an array")
            continue
            
        word_errors = False
        for j, w in enumerate(s["words"]):
            wp = f"{prefix} word[{j}] '{w.get('text', '?')}'"
            
            missing_w = [f for f in ("text", "dictionary_word", "role", "label", "parts", "translation") if f not in w]
            if missing_w:
                errors.append(f"{wp} Missing fields: {', '.join(missing_w)}")
                word_errors = True
                
            if w.get("role") not in ALLOWED_ROLES:
                errors.append(f"{wp} Invalid role '{w.get('role')}'")
                word_errors = True
                
            text = w.get("text", "")
            if text and text[-1] in PUNCTUATION and len(text) > 1:
                errors.append(f"{wp} Text contains trailing punctuation '{text}'")
                word_errors = True
                
            if not isinstance(w.get("parts"), list) or not w["parts"]:
                errors.append(f"{wp} 'parts' must be a non-empty array of strings")
                word_errors = True
                
        if not word_errors:
            valid_sentences.append(s)
            existing_ids.add(sid) # Prevent duplicates in the same batch

    if errors:
        return JSONResponse(status_code=400, content={"message": "Validation failed", "errors": errors[:20]}) # Limit errors output
        
    if not valid_sentences:
        return JSONResponse(status_code=400, content={"message": "No valid new sentences to add."})
        
    merged = existing_sentences + valid_sentences
    
    try:
        with open(sentence_file, "w", encoding="utf-8") as f:
            json.dump(merged, f, ensure_ascii=False, indent=2)
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": f"Failed to save sentence.json: {str(e)}"})
        
    return {"message": "Success", "added_count": len(valid_sentences), "total_count": len(merged)}

@router.get("/api/sentences")
async def get_sentences():
    """Возвращает все предложения из sentence.json"""
    sentence_file = settings.resources_dir / "sentence.json"
    if not sentence_file.exists():
        return {"sentences": []}
    
    try:
        with open(sentence_file, "r", encoding="utf-8") as f:
            sentences = json.load(f)
        return {"sentences": sentences}
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": str(e)})

@router.delete("/api/sentences")
async def delete_sentences(request: Request):
    """Удаляет предложения на основе переданных фильтров"""
    data = await request.json()
    action = data.get("action")
    
    sentence_file = settings.resources_dir / "sentence.json"
    if not sentence_file.exists():
        return {"message": "No sentences found."}
        
    try:
        with open(sentence_file, "r", encoding="utf-8") as f:
            sentences = json.load(f)
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": f"Failed to read file: {str(e)}"})
        
    if action == "delete_all":
        sentences = []
    elif action == "delete_language":
        lang = data.get("language")
        sentences = [s for s in sentences if s.get("language") != lang]
    elif action == "delete_ids":
        ids_to_delete = set(data.get("ids", []))
        sentences = [s for s in sentences if s.get("id") not in ids_to_delete]
    else:
        return JSONResponse(status_code=400, content={"message": "Invalid action"})
        
    try:
        with open(sentence_file, "w", encoding="utf-8") as f:
            json.dump(sentences, f, ensure_ascii=False, indent=2)
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": f"Failed to save file: {str(e)}"})
        
    return {"message": "Success", "remaining_count": len(sentences)}

import uuid

from ...schemas.words import SentenceUpsertSchema

@router.post("/api/sentences/upsert")
async def upsert_sentence(data: SentenceUpsertSchema):
    """Создает или обновляет одно предложение в sentence.json"""
    s = data.model_dump(exclude_none=True)

    sentence_file = settings.resources_dir / "sentence.json"
    existing_sentences = []
    if sentence_file.exists():
        try:
            with open(sentence_file, "r", encoding="utf-8") as f:
                existing_sentences = json.load(f)
        except Exception as e:
            return JSONResponse(status_code=500, content={"message": f"Failed to read existing sentence.json: {str(e)}"})

    # Validation
    ALLOWED_ROLES = {
        "Subject", "Predicate", "Object",
        "Attribute", "Attribute_Subject", "Attribute_Object",
        "Circumstance", "Adverbial", "Conjunction"
    }
    
    missing = [f for f in ("language", "sentence", "words") if f not in s]
    if missing:
        return JSONResponse(status_code=400, content={"message": f"Missing fields: {', '.join(missing)}"})

    if not isinstance(s.get("words"), list) or not s["words"]:
        return JSONResponse(status_code=400, content={"message": "'words' is empty or not an array"})

    for j, w in enumerate(s["words"]):
        missing_w = [f for f in ("text", "role", "label", "parts", "translation") if f not in w]
        if missing_w:
            return JSONResponse(status_code=400, content={"message": f"Word [{j}] missing fields: {', '.join(missing_w)}"})
        if w.get("role") and w.get("role") not in ALLOWED_ROLES:
            return JSONResponse(status_code=400, content={"message": f"Word [{j}] invalid role '{w.get('role')}'"})
        if not isinstance(w.get("parts"), list):
            return JSONResponse(status_code=400, content={"message": f"Word [{j}] 'parts' must be an array"})

    # Determine ID
    sid = s.get("id")
    if not sid:
        sid = f"custom_{uuid.uuid4().hex[:8]}"
        s["id"] = sid

    # Upsert
    found_idx = -1
    for idx, ex_s in enumerate(existing_sentences):
        if ex_s.get("id") == sid:
            found_idx = idx
            break

    if found_idx >= 0:
        existing_sentences[found_idx] = s
    else:
        existing_sentences.append(s)

    try:
        with open(sentence_file, "w", encoding="utf-8") as f:
            json.dump(existing_sentences, f, ensure_ascii=False, indent=2)
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": f"Failed to save sentence.json: {str(e)}"})

    return {"message": "Success", "sentence": s}
