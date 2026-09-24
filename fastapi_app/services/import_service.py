import asyncio
import os
from pathlib import Path
import subprocess
import sys

from fastapi import HTTPException
from fastapi_app.config import settings

_pdf_slots = asyncio.Semaphore(2)


async def read_upload(file):
    chunks, size = [], 0
    while chunk := await file.read(64 * 1024):
        size += len(chunk)
        if size > settings.MAX_UPLOAD_BYTES:
            raise HTTPException(413, 'File too large')
        chunks.append(chunk)
    return b''.join(chunks)


async def extract_pdf(data):
    try:
        await asyncio.wait_for(_pdf_slots.acquire(), timeout=1)
    except TimeoutError:
        raise HTTPException(429, 'PDF parser is busy') from None
    process = None
    try:
        # Pass only operating-system essentials, never provider credentials.
        env = {key: value for key, value in os.environ.items()
               if key.upper() in {'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'PATH'}}
        process = await asyncio.create_subprocess_exec(
            sys.executable, '-I', str(Path(__file__).with_name('pdf_worker.py')),
            str(settings.PDF_MAX_PAGES), str(settings.PDF_MEMORY_BYTES), str(settings.MAX_UPLOAD_BYTES),
            stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL, env=env,
            **({'creationflags': subprocess.CREATE_NO_WINDOW} if os.name == 'nt' else {}),
        )
        try:
            output, _ = await asyncio.wait_for(process.communicate(data), settings.PDF_TIMEOUT_SECONDS)
        except TimeoutError:
            raise HTTPException(408, 'PDF processing timed out') from None
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
