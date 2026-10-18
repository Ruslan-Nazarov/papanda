"""Personal distribution must isolate credentials, storage and publication APIs."""
import os

from dotenv import dotenv_values
import pytest

from fastapi_app.config import settings
from fastapi_app.routers.personal import save_config
from personal_runtime import AI_KEYS, configure


def test_personal_bootstrap_ignores_author_environment_and_cwd_env(tmp_path, monkeypatch):
    for key in AI_KEYS:
        monkeypatch.setenv(key, 'author-secret')
    monkeypatch.setenv('LIBRARY_PUBLISH_KEY', 'author-publication-secret')
    monkeypatch.setenv('LIBRARY_PUBLISH_URL', 'https://papanda.kz')
    monkeypatch.setenv('DATABASE_URL', 'sqlite:///author.db')
    monkeypatch.setenv('PAPANDA_ENV_FILE', str(tmp_path / 'author.env'))
    (tmp_path / '.env').write_text('OPENAI_API_KEY=author-secret\n')
    monkeypatch.chdir(tmp_path)
    # Restore all environment mutations after this bootstrap test.
    monkeypatch.setattr(os, 'environ', os.environ.copy())
    directory = configure(tmp_path / 'personal')
    assert all(os.environ[key] == '' for key in AI_KEYS)
    assert os.environ['LIBRARY_PUBLISH_KEY'] == os.environ['LIBRARY_PUBLISH_URL'] == ''
    assert os.environ['DATABASE_URL'] == ''
    assert os.environ['APP_EDITION'] == 'personal'
    assert os.environ['PAPANDA_ENV_FILE'] == str(directory / 'settings.env')
    assert os.environ['DB_DIR'] == str(directory / 'db')


def test_personal_bootstrap_loads_only_user_owned_keys(tmp_path, monkeypatch):
    (tmp_path / 'settings.env').write_text('OPENAI_API_KEY=user-key\nLIBRARY_PUBLISH_KEY=forbidden\nDEMO_MODE=true\n')
    monkeypatch.setattr(os, 'environ', os.environ.copy())
    configure(tmp_path)
    assert os.environ['OPENAI_API_KEY'] == 'user-key'
    assert os.environ['LIBRARY_PUBLISH_KEY'] == ''
    assert os.environ['DEMO_MODE'] == 'false'


@pytest.mark.asyncio
async def test_personal_hides_author_and_share_ui_and_denies_publication(client, monkeypatch):
    monkeypatch.setattr(settings, 'APP_EDITION', 'personal')
    page = await client.get('/')
    assert page.status_code == 200
    assert 'btn-library-publish' not in page.text
    assert 'menu-item-share' not in page.text
    assert '/personal/settings' in page.text
    for method, url in [('GET', '/library'), ('GET', '/api/author/deployment/1'),
                        ('PUT', '/api/author/deployment/1'),
                        ('POST', '/api/author/notes/1/publish'),
                        ('PUT', '/api/library/publications/00000000-0000-0000-0000-000000000001')]:
        assert (await client.request(method, url, json={'revision': 1})).status_code == 404


@pytest.mark.asyncio
async def test_personal_legal_pages_never_load_site_analytics(client, monkeypatch):
    monkeypatch.setattr(settings, 'APP_EDITION', 'personal')
    for path in ['/privacy', '/terms', '/']:
        response = await client.get(path)
        assert response.status_code == 200
        assert 'consent.js' not in response.text
        policy = response.headers['content-security-policy']
        assert "connect-src 'self';" in policy
        assert 'yandex' not in policy and 'google' not in policy


@pytest.mark.asyncio
async def test_settings_are_personal_only_never_echo_keys_and_reject_cross_origin(client, tmp_path, monkeypatch):
    monkeypatch.setenv('PAPANDA_ENV_FILE', str(tmp_path / 'settings.env'))
    assert (await client.get('/personal/settings')).status_code == 404
    monkeypatch.setattr(settings, 'APP_EDITION', 'personal')
    response = await client.post('/personal/settings', data={
        'provider': 'openai', 'api_key': 'user-private-key', 'model': 'user-model'})
    assert response.status_code == 303
    page = await client.get('/personal/settings')
    assert page.status_code == 200
    assert 'user-private-key' not in page.text
    assert 'user-model' in page.text
    values = dotenv_values(tmp_path / 'settings.env')
    assert values['OPENAI_API_KEY'] == 'user-private-key'
    response = await client.post('/personal/settings', data={
        'provider': 'openai', 'api_key': 'attacker', 'model': 'user-model'},
        headers={'origin': 'https://example.invalid'})
    assert response.status_code == 403
    assert dotenv_values(tmp_path / 'settings.env')['OPENAI_API_KEY'] == 'user-private-key'


def test_key_updates_preserve_blank_remove_previous_provider_and_can_clear(tmp_path, monkeypatch):
    monkeypatch.setenv('PAPANDA_ENV_FILE', str(tmp_path / 'settings.env'))
    save_config('openai', 'private$literal', 'model')
    save_config('openai', '', 'new-model')
    assert dotenv_values(tmp_path / 'settings.env', interpolate=False)['OPENAI_API_KEY'] == 'private$literal'
    save_config('groq', 'groq-own-key', 'groq-model')
    values = dotenv_values(tmp_path / 'settings.env')
    assert values['OPENAI_API_KEY'] == ''
    assert values['GROQ_API_KEY'] == 'groq-own-key'
    save_config('groq', '', 'groq-model', clear=True)
    assert dotenv_values(tmp_path / 'settings.env')['GROQ_API_KEY'] == ''


@pytest.mark.parametrize('provider,key,model', [('unknown', 'k', 'm'),
    ('openai', 'key\nLIBRARY_PUBLISH_KEY=inject', 'm'), ('openai', 'key', 'm\nDEMO_MODE=true')])
def test_settings_reject_configuration_injection(tmp_path, monkeypatch, provider, key, model):
    from fastapi import HTTPException
    monkeypatch.setenv('PAPANDA_ENV_FILE', str(tmp_path / 'settings.env'))
    with pytest.raises(HTTPException):
        save_config(provider, key, model)
    assert not (tmp_path / 'settings.env').exists()


@pytest.mark.asyncio
async def test_openai_key_also_serves_personal_helper_features(monkeypatch):
    from fastapi_app.services.llm_provider import LLMRegistry, any_llm_key_configured
    monkeypatch.setattr(settings, 'APP_EDITION', 'personal')
    monkeypatch.setattr(settings, 'OPENAI_API_KEY', 'own-key')
    registry = LLMRegistry()
    try:
        assert any_llm_key_configured()
        provider = next(p for p in registry.providers if p.name == 'OpenAI')
        assert provider.api_key == 'own-key'
        options = provider._build_kwargs([], None, 1000, .2, False, None)
        assert options['max_completion_tokens'] == 1000
        assert 'temperature' not in options and 'max_tokens' not in options
    finally:
        await registry.aclose()
