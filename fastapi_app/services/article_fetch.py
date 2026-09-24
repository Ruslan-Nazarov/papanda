"""Bounded public HTTP fetch: the validated IP is the connection destination.

Host and TLS SNI remain the original hostname (httpcore's sni_hostname extension).
Redirects are resolved relative to the original URL, never the pinned IP URL.
"""
import asyncio
import html
import ipaddress
import re
import socket

import httpx
from fastapi import HTTPException
from fastapi_app.config import settings


async def public_addresses(host, port):
    try:
        addresses = await asyncio.get_running_loop().getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except OSError:
        raise HTTPException(400, 'Не удалось разрешить адрес ссылки') from None
    ips = list(dict.fromkeys(info[4][0] for info in addresses))
    if not ips or any(not ipaddress.ip_address(ip).is_global or ipaddress.ip_address(ip).is_multicast for ip in ips):
        raise HTTPException(400, 'Эта ссылка недоступна для загрузки')
    return ips


async def fetch_body(url):
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
                        if not any(t in response.headers.get('content-type', '').lower() for t in ('text/', 'application/xhtml')):
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
                        return b''.join(chunks).decode(response.encoding or 'utf-8', errors='replace')
            raise HTTPException(400, 'Слишком много переадресаций по ссылке')
    except (httpx.HTTPError, ValueError, TimeoutError, LookupError):
        raise HTTPException(400, 'Не удалось безопасно загрузить страницу') from None


async def fetch_article(url):
    body = await fetch_body(url)
    body = re.sub(r'(?is)<(script|style|noscript|template)[^>]*>.*?</\1>', ' ', body)
    paras = re.findall(r'(?is)<p\b[^>]*>(.*?)</p>', body)
    chunks = [html.unescape(re.sub(r'(?s)<[^>]+>', '', p)).strip() for p in paras]
    text = '\n\n'.join(p for p in chunks if len(p) >= 40)
    if len(text) < 200:
        raise HTTPException(400, 'Не удалось извлечь текст статьи со страницы')
    return text
