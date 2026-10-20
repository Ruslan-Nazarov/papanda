"""Bounded public HTTP fetch: the validated IP is the connection destination.

Host and TLS SNI remain the original hostname (httpcore's sni_hostname extension).
Redirects are resolved relative to the original URL, never the pinned IP URL.
"""
import asyncio
import ipaddress
import re
import socket
from html.parser import HTMLParser

import httpx
from fastapi import HTTPException
from fastapi_app.config import settings
from fastapi_app.services.article_sections import select_html, pdf_pages


async def public_addresses(host, port):
    try:
        addresses = await asyncio.get_running_loop().getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except OSError:
        raise HTTPException(400, 'Не удалось разрешить адрес ссылки') from None
    ips = list(dict.fromkeys(info[4][0] for info in addresses))
    if not ips or any(not ipaddress.ip_address(ip).is_global or ipaddress.ip_address(ip).is_multicast for ip in ips):
        raise HTTPException(400, 'Эта ссылка недоступна для загрузки')
    return ips


async def fetch_body(url, *, allow_pdf=False):
    try:
        async with asyncio.timeout(20):
            for _ in range(4):
                original = httpx.URL(url)
                if (original.scheme not in {'http', 'https'} or not original.host
                        or original.userinfo or original.port not in {80, 443, None}):
                    raise HTTPException(400, 'Поддерживаются только публичные http(s)-ссылки на стандартных портах')
                ips = await public_addresses(original.host, original.port or (443 if original.scheme == 'https' else 80))
                pinned = original.copy_with(host=ips[0])
                host = original.netloc.decode('ascii')
                async with httpx.AsyncClient(timeout=8, follow_redirects=False, trust_env=False) as client:
                    async with client.stream('GET', pinned, headers={
                        'Host': host, 'Accept-Encoding': 'identity', 'User-Agent': 'Papanda article importer',
                    }, extensions={'sni_hostname': original.host}) as response:
                        if response.is_redirect and response.headers.get('location'):
                            url = str(original.join(response.headers['location']))
                            continue
                        response.raise_for_status()
                        content_type = response.headers.get('content-type', '').lower()
                        is_pdf = allow_pdf and 'application/pdf' in content_type
                        if not is_pdf and not any(t in content_type for t in ('text/', 'application/xhtml')):
                            raise HTTPException(400, 'По ссылке не текстовая страница')
                        # Never inflate an unbounded compressed response inside the HTTP client.
                        if response.headers.get('content-encoding', 'identity').lower() != 'identity':
                            raise HTTPException(400, 'Сервер не поддерживает загрузку без сжатия')
                        length = response.headers.get('content-length')
                        if length and int(length) > settings.MAX_URL_BYTES:
                            raise HTTPException(413, 'Страница слишком велика')
                        chunks, size = [], 0
                        async for chunk in response.aiter_raw(chunk_size=64 * 1024):
                            size += len(chunk)
                            if size > settings.MAX_URL_BYTES:
                                raise HTTPException(413, 'Страница слишком велика')
                            chunks.append(chunk)
                        data = b''.join(chunks)
                        return data if is_pdf else data.decode(response.encoding or 'utf-8', errors='replace')
            raise HTTPException(400, 'Слишком много переадресаций по ссылке')
    except (httpx.HTTPError, ValueError, TimeoutError, LookupError):
        raise HTTPException(400, 'Не удалось безопасно загрузить страницу') from None


class _ArticleText(HTMLParser):
    """Keep short premises, headings, tables and TeX carried by scientific HTML."""
    ignored = {'script', 'style', 'noscript', 'template', 'nav', 'footer', 'head'}
    blocks = {'p', 'div', 'section', 'article', 'main', 'h1', 'h2', 'h3', 'h4',
              'h5', 'h6', 'li', 'blockquote', 'pre', 'tr', 'br'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.suppressed = []

    def handle_starttag(self, tag, attrs):
        if self.suppressed:
            if tag == self.suppressed[-1]:
                self.suppressed.append(tag)
            return
        if tag in self.ignored:
            self.suppressed.append(tag)
        elif tag == 'math' and (tex := dict(attrs).get('alttext')):
            delimiter = '$$' if dict(attrs).get('display') == 'block' else '$'
            self.parts.append(f' {delimiter}{tex}{delimiter} ')
            self.suppressed.append(tag)
        elif tag in self.blocks:
            self.parts.append('\n\n')
        elif tag in {'td', 'th'}:
            self.parts.append(' | ')

    def handle_endtag(self, tag):
        if self.suppressed:
            if tag == self.suppressed[-1]:
                self.suppressed.pop()
        elif tag in self.blocks:
            self.parts.append('\n\n')

    def handle_data(self, data):
        if not self.suppressed:
            self.parts.append(data)

    def text(self):
        text = ''.join(self.parts)
        text = re.sub(r'[^\S\n]+', ' ', text)
        return re.sub(r'\n\s*\n(?:\s*\n)*', '\n\n', text).strip()


async def fetch_article(url, selection=''):
    body = await fetch_body(url, allow_pdf=True)
    if isinstance(body, bytes):
        from fastapi_app.services.import_service import extract_pdf
        text = await extract_pdf(body, source_pages=pdf_pages(url, selection), full_source=True)
    else:
        parser = _ArticleText()
        parser.feed(select_html(body, url, selection))
        parser.close()
        text = parser.text()
    if len(text) < (20 if selection or httpx.URL(url).fragment else 200):
        raise HTTPException(400, 'Не удалось извлечь текст статьи со страницы')
    return text
