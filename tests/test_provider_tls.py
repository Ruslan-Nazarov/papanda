import asyncio
from pathlib import Path
import ssl
from unittest.mock import patch

import httpx
import pytest

from fastapi_app.config import settings
from fastapi_app.services.llm_provider import GigaChatProvider


@pytest.mark.asyncio
async def test_gigachat_rejects_untrusted_server_and_shares_context_with_oauth(monkeypatch):
    monkeypatch.setattr(settings, 'GIGACHAT_VERIFY_SSL', True)
    monkeypatch.setattr(settings, 'GIGACHAT_CA_BUNDLE', '')
    provider = GigaChatProvider()
    try:
        assert provider._verify.verify_mode == ssl.CERT_REQUIRED
        assert provider._verify.check_hostname
        fixtures = Path(__file__).parent / 'fixtures'
        server_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        server_context.load_cert_chain(fixtures / 'localhost-test.crt', fixtures / 'localhost-test.key')
        async def close_connection(reader, writer):
            writer.close()
            await writer.wait_closed()
        server = await asyncio.start_server(close_connection, '127.0.0.1', 0, ssl=server_context)
        try:
            port = server.sockets[0].getsockname()[1]
            async with httpx.AsyncClient(verify=provider._verify, trust_env=False) as client:
                with pytest.raises(httpx.ConnectError, match='CERTIFICATE_VERIFY_FAILED'):
                    await client.get(f'https://localhost:{port}')
        finally:
            server.close()
            await server.wait_closed()
        # OAuth uses exactly the same context as API, without exposing credentials.
        with patch('fastapi_app.services.llm_provider.httpx.AsyncClient', side_effect=RuntimeError('probe')) as constructor:
            with pytest.raises(RuntimeError, match='probe'):
                await provider._ensure_token()
            assert constructor.call_args.kwargs['verify'] is provider._verify
    finally:
        await provider.client.close()


def test_insecure_gigachat_configuration_is_rejected(monkeypatch):
    monkeypatch.setattr(settings, 'GIGACHAT_VERIFY_SSL', False)
    with pytest.raises(ValueError, match='no longer supported'):
        GigaChatProvider()
