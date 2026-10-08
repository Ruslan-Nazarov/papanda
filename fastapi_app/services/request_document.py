"""Bounded, local text extraction for a document attached to a request."""
import io
from pathlib import PurePath
import zipfile
from xml.etree import ElementTree as ET

from fastapi import HTTPException

MAX_DOCUMENT_BYTES = 2 * 1024 * 1024
MAX_DOCUMENT_CHARS = 50_000
MAX_XML_BYTES = 8 * 1024 * 1024
_W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'


def extract_request_document(data: bytes, filename: str) -> dict:
    name = PurePath(filename.replace('\\', '/')).name
    if not name or len(name) > 255:
        raise HTTPException(400, 'Invalid document name')
    if len(data) > MAX_DOCUMENT_BYTES:
        raise HTTPException(413, 'Document exceeds 2 MiB')
    suffix = PurePath(name).suffix.lower()
    try:
        if suffix == '.txt':
            text = data.decode('utf-8-sig')
        elif suffix == '.docx':
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                entries = archive.infolist()
                if len(entries) > 2048 or sum(e.file_size for e in entries) > 32 * 1024 * 1024:
                    raise ValueError('Oversized archive')
                info = archive.getinfo('word/document.xml')
                if info.file_size > MAX_XML_BYTES:
                    raise ValueError('Oversized XML')
                xml = archive.read(info).decode('utf-8-sig')
                if '<!DOCTYPE' in xml.upper() or '<!ENTITY' in xml.upper():
                    raise ValueError('XML declarations are unsupported')
                body = ET.fromstring(xml).find(_W + 'body')
                if body is None:
                    raise ValueError('Missing document body')

                def paragraph(p):
                    return ''.join(node.text or '' if node.tag == _W + 't' else
                                   '\t' if node.tag == _W + 'tab' else
                                   '\n' if node.tag in {_W + 'br', _W + 'cr'} else ''
                                   for node in p.iter())

                chunks = []
                for node in body:
                    if node.tag == _W + 'p':
                        chunks.append(paragraph(node))
                    elif node.tag == _W + 'tbl':
                        for row in node.findall(_W + 'tr'):
                            chunks.append(' | '.join('\n'.join(paragraph(p) for p in cell.iter(_W + 'p'))
                                                     for cell in row.findall(_W + 'tc')))
                text = '\n'.join(chunks)
        else:
            raise HTTPException(415, 'Supported documents: DOCX and UTF-8 TXT')
    except (ValueError, KeyError, RuntimeError, zipfile.BadZipFile, ET.ParseError, OSError):
        raise HTTPException(400, 'Cannot read document; use a valid DOCX or UTF-8 TXT') from None
    if not text.strip() or '\x00' in text:
        raise HTTPException(400, 'Document has no readable text')
    if len(text) > MAX_DOCUMENT_CHARS:
        raise HTTPException(413, 'Document exceeds 50,000 characters; text was not truncated')
    return {'name': name, 'text': text}
