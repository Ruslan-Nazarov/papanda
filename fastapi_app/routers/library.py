"""Public reading, authenticated server ingestion, and loopback-only author controls."""
import asyncio
import json
import secrets
from html.parser import HTMLParser
from urllib.parse import urlsplit
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator
from typing import Literal
from sqlalchemy.ext.asyncio import AsyncSession

from fastapi_app.config import settings
from fastapi_app.database import get_db
from fastapi_app.schemas.notes import (
    AttachedConspect, BlockDerivation, NoteBlock, NoteCreate, NoteSticker,
    RejectedDraft, RequestDocument, Word,
)
from fastapi_app.services import library_store as store
from fastapi_app.services.note_transactions import get_note
from fastapi_app.services.notes_service import NotesService
from fastapi_app.services.sanitizer import sanitize_on_write

router = APIRouter()


class PublicSource(BaseModel):
    model_config = ConfigDict(extra='ignore')
    url: str | None = Field(default=None, max_length=2048)
    title: str | None = Field(default=None, max_length=1000)
    quote: str | None = Field(default=None, max_length=10000)

    @field_validator('url')
    @classmethod
    def safe_url(cls, value):
        parts = urlsplit(value or '')
        if value and (parts.scheme not in {'http', 'https'} or not parts.hostname
                      or parts.username or parts.password):
            return None
        return value


class PublicResource(BaseModel):
    model_config = ConfigDict(extra='ignore')
    title: str = Field(min_length=1, max_length=200)
    url: str = Field(min_length=1, max_length=2048)

    @field_validator('url')
    @classmethod
    def safe_url(cls, value):
        parts = urlsplit(value)
        if parts.scheme == 'https' and parts.hostname and not parts.username and not parts.password:
            return value
        if (not parts.scheme and not parts.netloc and not parts.query and not parts.fragment
                and value.startswith('/static/showcase/') and '..' not in parts.path.split('/')):
            return value
        if (not parts.scheme and not parts.netloc and not parts.query and not parts.fragment
                and value.startswith('/library/')):
            try:
                publication_id = UUID(value.removeprefix('/library/'))
            except ValueError:
                pass
            else:
                return f'/library/{publication_id}'
        raise ValueError('Resource must be an HTTPS URL, showcase file or Library publication')


class PublicInlineNote(BaseModel):
    model_config = ConfigDict(extra='ignore')
    kind: str = Field(pattern=r'^(hint|question)$')
    phrase: str = Field(default='', max_length=2000)
    text: str = Field(max_length=10000)


class _InlineNoteCollector(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.spans = []
        self.notes = []

    def handle_starttag(self, tag, attrs):
        if tag != 'span':
            return
        attributes = dict(attrs)
        hint = attributes.get('data-hint')
        question = attributes.get('data-question')
        self.spans.append({'kind': 'hint' if hint else 'question',
                           'phrase': '', 'text': hint or question} if hint or question else None)

    def handle_data(self, data):
        for span in self.spans:
            if span:
                span['phrase'] += data

    def handle_endtag(self, tag):
        if tag == 'span' and self.spans:
            note = self.spans.pop()
            if note:
                self.notes.append(PublicInlineNote.model_validate(note))


def inline_notes(html):
    collector = _InlineNoteCollector()
    collector.feed(html or '')
    collector.close()
    return collector.notes


def public_block_data(block):
    data = {**block, 'inline_notes': inline_notes(block.get('html', ''))}
    # Some older notes stored empty optional collections as empty strings.
    for key in ('stickers', 'sources', 'words', 'rejected_drafts',
                'derivations', 'attached_conspects'):
        if not isinstance(data.get(key), list):
            data[key] = []
    if not isinstance(data.get('request_document'), dict):
        data['request_document'] = None
    return data


class PublicBlock(BaseModel):
    model_config = ConfigDict(extra='ignore')
    id: str = Field(pattern=r'^[A-Za-z0-9_-]{1,128}$')
    role: str | None = Field(default=None, max_length=100)
    title: str | None = Field(default=None, max_length=500)
    side: str = Field(default='center', pattern=r'^(left|right|center)$')
    html: str = Field(default='', max_length=3 * 1024 * 1024)
    anchorResolved: bool = False
    status: str | None = Field(default=None, pattern=r'^(none|in_progress|ready)$')
    author: str | None = Field(default=None, pattern=r'^(ai|ai_checked|ai_edited|human)$')
    border_color: str | None = Field(default=None, pattern=r'^#[0-9a-fA-F]{6}$')
    tags: str | None = Field(default=None, max_length=1000)
    stickers: list[NoteSticker] = Field(default_factory=list, max_length=1000)
    sources: list[PublicSource] = Field(default_factory=list, max_length=1000)
    words: list[Word] = Field(default_factory=list, max_length=1000)
    inline_notes: list[PublicInlineNote] = Field(default_factory=list, max_length=1000)
    rejected_drafts: list[RejectedDraft] = Field(default_factory=list, max_length=100)
    derivations: list[BlockDerivation] = Field(default_factory=list, max_length=1000)
    request_document: RequestDocument | None = None
    attached_conspects: list[AttachedConspect] = Field(default_factory=list, max_length=20)

    @field_validator('html')
    @classmethod
    def clean_html(cls, value):
        return sanitize_on_write(value, reject_invalid_images=True)


class Publication(BaseModel):
    model_config = ConfigDict(extra='forbid')
    schema_version: int = Field(default=1, ge=1, le=1)
    title: str = Field(min_length=1, max_length=150)
    language: Literal['ru', 'en'] = 'ru'
    description: str = Field(default='', max_length=1000)
    note_notice: str = Field(default='', max_length=5000)
    stickers: list[NoteSticker] = Field(default_factory=list, max_length=1000)
    dictionary: list[Word] = Field(default_factory=list, max_length=1000)
    resources: list[PublicResource] = Field(default_factory=list, max_length=20)
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
    language: Literal['ru', 'en'] = 'ru'
    resources: list[PublicResource] = Field(default_factory=list, max_length=20)


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


async def snapshot(note, description='', language='ru', resources=None):
    # Explicit reader-facing allowlist. History, connections, tabs and service
    # metadata remain private; all displayed annotations survive publication.
    try:
        blocks = [PublicBlock.model_validate(public_block_data(b))
                  for b in note.content_json if isinstance(b, dict)]
        return Publication(title=note.title, language=language, description=description,
                           note_notice=note.note_notice or '', stickers=note.stickers or [],
                           dictionary=note.dictionary or [], resources=resources or [],
                           blocks=blocks).model_dump(mode='json')
    except ValidationError:
        raise HTTPException(422, 'Publication requires a title and valid, nonempty blocks') from None


@router.get('/api/library')
async def list_library():
    rows = await asyncio.to_thread(store.list_publications)
    return [{k: row[k] for k in ('id', 'title', 'language', 'description', 'updated_at')}
            for row in rows]


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
    return await NotesService.create_note(db, NoteCreate(
        title=item['title'], note_notice=item.get('note_notice', ''),
        stickers=item.get('stickers', []), dictionary=item.get('dictionary', []),
        blocks=[NoteBlock.model_validate({key: value for key, value in b.items()
                                         if key != 'inline_notes'}) for b in item['blocks']]))


@router.get('/api/author/library/{note_id}', dependencies=[Depends(author_only)])
async def publication_status(note_id: int, db: AsyncSession = Depends(get_db)):
    await get_note(db, note_id)
    state = await current_state(note_id)
    return {**{k: state[k] for k in ('id', 'revision', 'description', 'language', 'published')},
            'resources': json.loads(state['resources']),
            'url': f"{state['target']}/library/{state['id']}", 'local_only': not state['target']}


@router.put('/api/author/library/{note_id}', dependencies=[Depends(author_only)])
async def publish_note(note_id: int, data: PublishRequest, db: AsyncSession = Depends(get_db)):
    note = await get_note(db, note_id)
    if note.is_deleted:
        raise HTTPException(404, 'Not found')
    if note.revision != data.revision:
        raise HTTPException(409, 'Note changed; save and preview again')
    state = await current_state(note_id)
    payload = await snapshot(note, data.description, data.language, data.resources)
    await deliver(state, 'PUT', payload)
    await asyncio.to_thread(store.record_publication, source_identity(note_id), note.revision,
                            data.description, data.language, payload['resources'], True)
    return {'url': f"{state['target']}/library/{state['id']}"}


@router.delete('/api/author/library/{note_id}', dependencies=[Depends(author_only)])
async def unpublish_note(note_id: int, db: AsyncSession = Depends(get_db)):
    await get_note(db, note_id)
    state = await current_state(note_id)
    await deliver(state, 'DELETE')
    await asyncio.to_thread(store.record_publication, source_identity(note_id), state['revision'],
                            state['description'], state['language'], json.loads(state['resources']), False)
    return {'ok': True}
