"""Public reading, authenticated server ingestion, and loopback-only author controls."""
import asyncio
import secrets
from urllib.parse import urlsplit
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from fastapi_app.config import settings
from fastapi_app.database import get_db
from fastapi_app.schemas.notes import NoteCreate, NoteBlock
from fastapi_app.services import library_store as store
from fastapi_app.services.note_transactions import get_note
from fastapi_app.services.notes_service import NotesService
from fastapi_app.services.sanitizer import sanitize_on_write

router = APIRouter()


class PublicBlock(BaseModel):
    model_config = ConfigDict(extra='ignore')
    id: str = Field(pattern=r'^[A-Za-z0-9_-]{1,128}$')
    role: str | None = Field(default=None, max_length=100)
    title: str | None = Field(default=None, max_length=500)
    side: str = Field(default='center', pattern=r'^(left|right|center)$')
    html: str = Field(default='', max_length=3 * 1024 * 1024)
    anchorResolved: bool = False

    @field_validator('html')
    @classmethod
    def clean_html(cls, value):
        return sanitize_on_write(value, reject_invalid_images=True)


class Publication(BaseModel):
    model_config = ConfigDict(extra='forbid')
    schema_version: int = Field(default=1, ge=1, le=1)
    title: str = Field(min_length=1, max_length=150)
    description: str = Field(default='', max_length=1000)
    blocks: list[PublicBlock] = Field(min_length=1, max_length=1000)

    @field_validator('blocks')
    @classmethod
    def unique_blocks(cls, blocks):
        if len({b.id for b in blocks}) != len(blocks):
            raise ValueError('Duplicate block IDs')
        return blocks


class PublishRequest(BaseModel):
    revision: int = Field(ge=1)
    description: str = Field(default='', max_length=1000)


def author_only():
    if settings.DEMO_MODE:
        raise HTTPException(404, 'Not found')
    # AccessBoundaryMiddleware additionally enforces loopback, Host and Origin.


def publisher_only(request: Request):
    key = settings.LIBRARY_PUBLISH_KEY
    if not settings.DEMO_MODE or not key:
        raise HTTPException(404, 'Publishing is disabled')
    supplied = request.headers.get('authorization', '')
    if not secrets.compare_digest(supplied.encode(), ('Bearer ' + key).encode()):
        raise HTTPException(401, 'Invalid publishing key')


def publication_target():
    target = settings.LIBRARY_PUBLISH_URL.rstrip('/')
    if target:
        parts = urlsplit(target)
        if (parts.scheme != 'https' or not parts.hostname or parts.username or parts.password
                or parts.query or parts.fragment or parts.path not in {'', '/'}):
            raise HTTPException(503, 'LIBRARY_PUBLISH_URL must be an HTTPS site origin')
        if not settings.LIBRARY_PUBLISH_KEY:
            raise HTTPException(503, 'Configure LIBRARY_PUBLISH_KEY on the local app and server')
    return target


def source_identity(note_id):
    # Separate author mappings when switching personal databases.
    return f'{settings.DATABASE_URL or settings.DB_DIR / "papanda.db"}:{note_id}:{settings.LIBRARY_PUBLISH_URL.rstrip("/")}'


async def current_state(note_id):
    target = publication_target()
    state = await asyncio.to_thread(store.author_state, source_identity(note_id), target)
    return state


async def deliver(state, method, payload=None):
    if not state['target']:
        operation = store.put_publication if method == 'PUT' else store.delete_publication
        args = (state['id'], payload) if payload is not None else (state['id'],)
        await asyncio.to_thread(operation, *args)
        return
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=False, trust_env=False) as client:
            response = await client.request(method,
                f"{state['target']}/api/library/publications/{state['id']}", json=payload,
                headers={'Authorization': 'Bearer ' + settings.LIBRARY_PUBLISH_KEY})
    except httpx.HTTPError:
        raise HTTPException(502, 'Could not reach the publication server; retry the operation') from None
    if response.status_code != 200:
        raise HTTPException(502, f'Publication server returned HTTP {response.status_code}; check its configuration')


async def snapshot(note, description=''):
    # Allowlist: no stickers, history, connections, tabs or service metadata.
    try:
        blocks = [PublicBlock.model_validate(b) for b in note.content_json if isinstance(b, dict)]
        return Publication(title=note.title, description=description, blocks=blocks).model_dump()
    except ValidationError:
        raise HTTPException(422, 'Publication requires a title and valid, nonempty blocks') from None


@router.get('/api/library')
async def list_library():
    rows = await asyncio.to_thread(store.list_publications)
    return [{k: row[k] for k in ('id', 'title', 'description', 'updated_at')} for row in rows]


@router.put('/api/library/publications/{publication_id}', dependencies=[Depends(publisher_only)])
async def receive_publication(publication_id: UUID, payload: Publication):
    await asyncio.to_thread(store.put_publication, str(publication_id), payload.model_dump())
    return {'ok': True}


@router.delete('/api/library/publications/{publication_id}', dependencies=[Depends(publisher_only)])
async def remove_publication(publication_id: UUID):
    await asyncio.to_thread(store.delete_publication, str(publication_id))
    return {'ok': True}


@router.post('/api/library/{publication_id}/copy')
async def copy_publication(publication_id: UUID, db: AsyncSession = Depends(get_db)):
    item = await asyncio.to_thread(store.get_publication, str(publication_id))
    if not item:
        raise HTTPException(404, 'Not found')
    return await NotesService.create_note(db, NoteCreate(title=item['title'],
        blocks=[NoteBlock.model_validate(b) for b in item['blocks']]))


@router.get('/api/author/library/{note_id}', dependencies=[Depends(author_only)])
async def publication_status(note_id: int, db: AsyncSession = Depends(get_db)):
    await get_note(db, note_id)
    state = await current_state(note_id)
    return {**{k: state[k] for k in ('id', 'revision', 'description', 'published')},
            'url': f"{state['target']}/library/{state['id']}", 'local_only': not state['target']}


@router.put('/api/author/library/{note_id}', dependencies=[Depends(author_only)])
async def publish_note(note_id: int, data: PublishRequest, db: AsyncSession = Depends(get_db)):
    note = await get_note(db, note_id)
    if note.is_deleted:
        raise HTTPException(404, 'Not found')
    if note.revision != data.revision:
        raise HTTPException(409, 'Note changed; save and preview again')
    state = await current_state(note_id)
    payload = await snapshot(note, data.description)
    await deliver(state, 'PUT', payload)
    await asyncio.to_thread(store.record_publication, source_identity(note_id), note.revision, data.description, True)
    return {'url': f"{state['target']}/library/{state['id']}"}


@router.delete('/api/author/library/{note_id}', dependencies=[Depends(author_only)])
async def unpublish_note(note_id: int, db: AsyncSession = Depends(get_db)):
    await get_note(db, note_id)
    state = await current_state(note_id)
    await deliver(state, 'DELETE')
    await asyncio.to_thread(store.record_publication, source_identity(note_id), state['revision'], state['description'], False)
    return {'ok': True}
