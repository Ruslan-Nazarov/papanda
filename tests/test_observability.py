import json
import logging

import pytest

from fastapi_app.observability import JsonFormatter
from fastapi_app.version import RELEASE_SHA, RELEASE_DATE, VERSION


def test_log_event_excludes_messages_secrets_and_exception_bodies():
    record = logging.LogRecord('provider', logging.ERROR, '', 1, 'secret-token private note %s', ('secret',),
                               (ValueError, ValueError('private content'), None))
    record.event, record.run_id = 'generation_failed', 'run-1'
    encoded = JsonFormatter().format(record)
    assert 'secret' not in encoded and 'private' not in encoded
    assert json.loads(encoded)['error_type'] == 'ValueError'


@pytest.mark.asyncio
async def test_footer_matches_release_metadata(client):
    page = await client.get('/')
    assert page.status_code == 200
    assert f'papanda version {VERSION} (last update {RELEASE_DATE})' in page.text
    assert (await client.get('/health')).json()['version'] == VERSION


@pytest.mark.asyncio
async def test_request_metrics_do_not_record_public_tokens_or_query_text(client, caplog):
    with caplog.at_level(logging.INFO, logger='fastapi_app.requests'):
        await client.get('/api/dialectics/shared/private-link-token?search=private-note')
    events = [record for record in caplog.records if getattr(record, 'event', None) == 'request']
    assert events
    encoded = '\n'.join(JsonFormatter().format(record) for record in events)
    assert 'private-link-token' not in encoded and 'private-note' not in encoded
    assert json.loads(JsonFormatter().format(events[-1]))['status'] in (400, 404)


@pytest.mark.asyncio
async def test_unverified_release_blocks_api_until_pointer_is_ready(client, tmp_path, monkeypatch):
    pointer = tmp_path / 'ready.json'
    monkeypatch.setenv('PAPANDA_READY_FILE', str(pointer))
    assert (await client.get('/health')).json()['ready'] is False
    assert (await client.post('/api/dialectics', json={'title': 'no writes', 'blocks': []})).status_code == 503
    pointer.write_text(json.dumps({'revision': RELEASE_SHA}))
    assert (await client.get('/health')).json()['ready'] is True
    assert (await client.get('/api/dialectics')).status_code == 200
