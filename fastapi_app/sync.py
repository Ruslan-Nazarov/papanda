import json
import logging
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi_app.models.notes import Note, NoteCategory
from fastapi_app.database import get_db

logger = logging.getLogger(__name__)

async def sync_published_notes():
    """Reads JSON files from content/published and upserts them into the database."""
    BASE_DIR = Path(__file__).resolve().parent.parent
    publish_dir = BASE_DIR / "content" / "published"
    if not publish_dir.exists():
        return
        
    try:
        from fastapi_app.database import get_db
        
        async for session in get_db():
            for file_path in publish_dir.glob("*.json"):
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    
                    sync_id = data.get("sync_id")
                    if not sync_id:
                        continue
                        
                    # Find existing note by sync_id
                    stmt = select(Note).where(Note.sync_id == sync_id)
                    result = await session.execute(stmt)
                    existing_note = result.scalar_one_or_none()
                    
                    if existing_note:
                        # Update
                        existing_note.title = data.get("title", existing_note.title)
                        existing_note.content_json = data.get("content_json", [])
                        existing_note.is_pinned = data.get("is_pinned", False)
                        existing_note.status = data.get("status", "ready")
                        existing_note.sticker_text = data.get("sticker_text")
                        existing_note.sticker_color = data.get("sticker_color", "#fff9c4")
                    else:
                        # Insert
                        new_note = Note(
                            title=data.get("title", "Без названия"),
                            content_json=data.get("content_json", []),
                            is_pinned=data.get("is_pinned", False),
                            status=data.get("status", "ready"),
                            sticker_text=data.get("sticker_text"),
                            sticker_color=data.get("sticker_color", "#fff9c4"),
                            sync_id=sync_id
                        )
                        session.add(new_note)
                        
                except Exception as e:
                    logger.error(f"Failed to sync {file_path}: {e}")
            
            await session.commit()
    except Exception as e:
        logger.error(f"Sync failed: {e}")
