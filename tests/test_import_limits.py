import asyncio
import io
import socket
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi import HTTPException
from pypdf import PdfWriter

from fastapi_app.config import settings
from fastapi_app.services import article_fetch, import_service


@pytest.mark.asyncio
async def test_fetch_pins_dns_address_and_keeps_host_and_tls_name(monkeypatch):
    resolve = AsyncMock(return_value=['93.184.215.14'])
    monkeypatch.setattr(article_fetch, 'public_addresses', resolve)
    seen = []
    class Stream(httpx.AsyncByteStream):
        async def __aiter__(self):
            yield b'<p>hello</p>'
    def handler(request):
        seen.append(request)
        return httpx.Response(200, headers={'content-type': 'text/html'}, stream=Stream())
    real_client = httpx.AsyncClient
    monkeypatch.setattr(article_fetch.httpx, 'AsyncClient', lambda **kw: real_client(transport=httpx.MockTransport(handler), **kw))
    assert await article_fetch.fetch_body('https://example.org/path') == '<p>hello</p>'
    assert str(seen[0].url) == 'https://93.184.215.14/path'
    assert seen[0].headers['host'] == 'example.org'
    assert seen[0].extensions['sni_hostname'] == 'example.org'
    resolve.assert_awaited_once_with('example.org', 443)


@pytest.mark.asyncio
async def test_mixed_dns_private_link_local_and_redirect_are_rejected(monkeypatch):
    loop = asyncio.get_running_loop()
    for ip in ['127.0.0.1', '169.254.169.254', '10.0.0.1', '::1', '100.64.0.1', '224.0.0.1']:
        monkeypatch.setattr(loop, 'getaddrinfo', AsyncMock(return_value=[
            (socket.AF_INET, socket.SOCK_STREAM, 6, '', ('93.184.215.14', 443)),
            (socket.AF_INET, socket.SOCK_STREAM, 6, '', (ip, 443)),
        ]))
        with pytest.raises(HTTPException):
            await article_fetch.public_addresses('evil.example', 443)
    resolve = AsyncMock(side_effect=[['93.184.215.14'], HTTPException(400, 'private')])
    monkeypatch.setattr(article_fetch, 'public_addresses', resolve)
    real_client = httpx.AsyncClient
    monkeypatch.setattr(article_fetch.httpx, 'AsyncClient', lambda **kw: real_client(
        transport=httpx.MockTransport(lambda r: httpx.Response(302, headers={'location': 'http://127.0.0.1/secret'})), **kw))
    with pytest.raises(HTTPException, match='private'):
        await article_fetch.fetch_body('https://public.example/start')
    assert resolve.await_count == 2


@pytest.mark.asyncio
@pytest.mark.parametrize('headers,content,status', [
    ({'content-length': '100'}, b'small', 413),
    ({}, b'x' * 33, 413),
    ({'content-encoding': 'gzip'}, b'compressed', 400),
])
async def test_url_size_and_compression_limits(monkeypatch, headers, content, status):
    monkeypatch.setattr(settings, 'MAX_URL_BYTES', 32)
    monkeypatch.setattr(article_fetch, 'public_addresses', AsyncMock(return_value=['93.184.215.14']))
    real_client = httpx.AsyncClient
    class Stream(httpx.AsyncByteStream):
        async def __aiter__(self):
            yield content
    monkeypatch.setattr(article_fetch.httpx, 'AsyncClient', lambda **kw: real_client(transport=httpx.MockTransport(
        lambda r: httpx.Response(200, headers={'content-type': 'text/html', **headers}, stream=Stream())), **kw))
    with pytest.raises(HTTPException) as exc:
        await article_fetch.fetch_body('https://example.org')
    assert exc.value.status_code == status


def blank_pdf(pages):
    writer = PdfWriter()
    for _ in range(pages):
        writer.add_blank_page(width=100, height=100)
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


@pytest.mark.asyncio
async def test_real_pdf_worker_valid_malformed_and_page_limit(monkeypatch):
    from pypdf.generic import DictionaryObject, NameObject, DecodedStreamObject
    writer = PdfWriter()
    page = writer.add_blank_page(width=200, height=200)
    font = DictionaryObject({NameObject('/Type'): NameObject('/Font'),
                             NameObject('/Subtype'): NameObject('/Type1'),
                             NameObject('/BaseFont'): NameObject('/Helvetica')})
    page[NameObject('/Resources')] = DictionaryObject({NameObject('/Font'): DictionaryObject({NameObject('/F1'): font})})
    content = DecodedStreamObject()
    content.set_data(b'BT /F1 12 Tf 10 100 Td (PDF import works) Tj ET')
    page[NameObject('/Contents')] = content
    output = io.BytesIO()
    writer.write(output)
    assert (await import_service.extract_pdf(output.getvalue())).strip() == 'PDF import works'
    monkeypatch.setattr(settings, 'PDF_MAX_PAGES', 1)
    for content in (b'not a pdf', blank_pdf(2)):
        with pytest.raises(HTTPException) as exc:
            await import_service.extract_pdf(content)
        assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_pdf_timeout_kills_process_and_leaves_health_responsive(monkeypatch, client):
    process = AsyncMock()
    process.returncode = None
    from unittest.mock import Mock
    process.kill = Mock()
    async def hang(data):
        await asyncio.sleep(60)
    process.communicate.side_effect = hang
    monkeypatch.setattr(import_service.asyncio, 'create_subprocess_exec', AsyncMock(return_value=process))
    monkeypatch.setattr(settings, 'PDF_TIMEOUT_SECONDS', 0.05)
    pending = asyncio.create_task(import_service.extract_pdf(b'%PDF-'))
    assert (await client.get('/health')).status_code == 200
    with pytest.raises(HTTPException) as exc:
        await pending
    assert exc.value.status_code == 408
    process.kill.assert_called_once()
    process.wait.assert_awaited_once()
