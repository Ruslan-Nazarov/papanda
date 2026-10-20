import asyncio
import os
from pathlib import Path
import subprocess
import sys
import json

from fastapi import HTTPException
from fastapi_app.config import settings

_pdf_slots = asyncio.Semaphore(2)


async def read_upload(file, max_bytes=None):
    chunks, size = [], 0
    while chunk := await file.read(64 * 1024):
        size += len(chunk)
        if size > (settings.MAX_UPLOAD_BYTES if max_bytes is None else max_bytes):
            raise HTTPException(413, 'File too large')
        chunks.append(chunk)
    return b''.join(chunks)


async def extract_pdf(data, *, source_pages=None, full_source=False):
    try:
        await asyncio.wait_for(_pdf_slots.acquire(), timeout=1)
    except TimeoutError:
        raise HTTPException(429, 'PDF parser is busy') from None
    process = None
    try:
        # Pass only operating-system essentials, never provider credentials.
        env = {key: value for key, value in os.environ.items()
               if key.upper() in {'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'PATH'}}
        worker = [sys.executable, '--pdf-worker'] if getattr(sys, 'frozen', False) else [
            sys.executable, '-I', str(Path(__file__).with_name('pdf_worker.py'))]
        arguments = [str(settings.PDF_MAX_PAGES), str(settings.PDF_MEMORY_BYTES), str(settings.MAX_UPLOAD_BYTES)]
        if full_source:
            arguments.append(json.dumps({'pages': source_pages, 'max_chars': 100_000}))
        process = await asyncio.create_subprocess_exec(
            *worker,
            *arguments,
            stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL, env=env,
            **({'creationflags': subprocess.CREATE_NO_WINDOW} if os.name == 'nt' else {}),
        )
        try:
            output, _ = await asyncio.wait_for(process.communicate(data), settings.PDF_TIMEOUT_SECONDS)
        except TimeoutError:
            raise HTTPException(408, 'PDF processing timed out') from None
        if process.returncode == 3:
            raise HTTPException(413, 'Текст PDF превышает 100 000 символов. Укажите нужные страницы.')
        if process.returncode == 4:
            raise HTTPException(422, 'Указанных страниц нет в PDF. Проверьте диапазон страниц.')
        if process.returncode:
            raise HTTPException(400, 'Invalid, encrypted or oversized PDF')
        return output.decode('utf-8')
    finally:
        if process and process.returncode is None:
            try:
                process.kill()
            except ProcessLookupError:
                pass
            await asyncio.shield(process.wait())
        _pdf_slots.release()
