"""User-owned AI configuration, available only in the local personal edition."""
import os
from pathlib import Path
import tempfile
from typing import Annotated

from dotenv import dotenv_values
from fastapi import APIRouter, Depends, Form, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

from fastapi_app.config import settings
from fastapi_app.frontend_assets import asset
from fastapi_app.i18n import get_translator


PROVIDERS = {
    'openai': ('OpenAI', 'OPENAI_API_KEY', 'DIALECTIC_OPENAI_MODEL', 'gpt-5-mini'),
    'groq': ('Groq', 'GROQ_API_KEY', 'GROQ_MODEL', 'openai/gpt-oss-120b'),
    'openrouter': ('OpenRouter', 'OPENROUTER_API_KEY', 'OPENROUTER_MODEL', 'openai/gpt-5-mini'),
    'cerebras': ('Cerebras', 'CEREBRAS_API_KEY', 'CEREBRAS_MODEL', 'gpt-oss-120b'),
    'gigachat': ('GigaChat', 'GIGACHAT_AUTH_KEY', 'GIGACHAT_MODEL', 'GigaChat-2-Pro'),
}
KEY_FIELDS = tuple(item[1] for item in PROVIDERS.values()) + ('GOOGLE_API_KEY',)
COPY = {
    'ru': {
        'settings': 'Настройки ИИ', 'back': 'К конспектам', 'provider': 'Провайдер',
        'model': 'Модель', 'key': 'Свой ключ API', 'save': 'Сохранить',
        'local_data': 'Конспекты и настройки хранятся на этом компьютере.',
        'hint': 'ИИ использует ваш ключ и ваш баланс у выбранного провайдера. При генерации текст запроса и материалы отправляются этому провайдеру. Для ручной работы ключ не нужен.',
        'stored': 'Ключ сохранён. Оставьте поле пустым, чтобы сохранить его.',
        'missing': 'Ключ ещё не добавлен.', 'clear': 'Удалить сохранённые ключи ИИ',
        'saved': 'Сохранено. Закройте Papanda через окно запуска и запустите её снова, чтобы применить настройки.',
        'key_hint': 'Ключ хранится в локальном файле настроек и никогда не выводится на этой странице.',
        'privacy': 'Личная версия не загружает аналитику сайта и не отправляет ваши конспекты или ключи разработчику. При использовании ИИ запрос и выбранные материалы получает указанный вами провайдер. Резервные копии и перенос данных вы выполняете самостоятельно.',
        'terms': 'Личная версия предназначена для работы на вашем компьютере. Публикация на papanda.kz отключена. Доступ к ИИ и его стоимость определяет выбранный вами провайдер. Ответы ИИ могут содержать ошибки.',
    },
    'en': {
        'settings': 'AI settings', 'back': 'Back to notes', 'provider': 'Provider',
        'model': 'Model', 'key': 'Your API key', 'save': 'Save',
        'local_data': 'Notes and settings are stored on this computer.',
        'hint': 'AI uses your key and your provider balance. During generation, your request and materials are sent to that provider. Manual editing needs no key.',
        'stored': 'A key is saved. Leave the field empty to keep it.',
        'missing': 'No key has been added.', 'clear': 'Remove saved AI keys',
        'saved': 'Saved. Close Papanda using its launcher window and start it again to apply these settings.',
        'key_hint': 'Your key is stored in the local settings file and is never displayed on this page.',
        'privacy': 'The personal edition loads no website analytics and sends no notes or keys to the developer. When you use AI, your selected provider receives your request and selected materials. You manage your own backups and data transfers.',
        'terms': 'The personal edition is intended for use on your computer. Publishing to papanda.kz is disabled. Your selected provider determines AI access and cost. AI answers may contain errors.',
    },
    'kz': {
        'settings': 'ЖИ баптаулары', 'back': 'Конспекттерге оралу', 'provider': 'Провайдер',
        'model': 'Модель', 'key': 'Жеке API кілтіңіз', 'save': 'Сақтау',
        'local_data': 'Конспекттер мен баптаулар осы компьютерде сақталады.',
        'hint': 'ЖИ сіздің кілтіңізді және провайдердегі теңгеріміңізді пайдаланады. Генерация кезінде сұрау мен материалдар сол провайдерге жіберіледі. Қолмен жұмыс істеуге кілт қажет емес.',
        'stored': 'Кілт сақталған. Оны сақтау үшін өрісті бос қалдырыңыз.',
        'missing': 'Кілт әлі қосылмаған.', 'clear': 'Сақталған ЖИ кілттерін жою',
        'saved': 'Сақталды. Баптауларды қолдану үшін Papanda іске қосу терезесін жауып, бағдарламаны қайта іске қосыңыз.',
        'key_hint': 'Кілт жергілікті баптау файлында сақталады және бұл бетте көрсетілмейді.',
        'privacy': 'Жеке нұсқа сайт аналитикасын жүктемейді және конспекттер мен кілттерді әзірлеушіге жібермейді. ЖИ қолданылғанда сұрау мен таңдалған материалдарды өзіңіз көрсеткен провайдер алады. Сақтық көшірме мен деректерді көшіруді өзіңіз орындайсыз.',
        'terms': 'Жеке нұсқа компьютеріңізде жұмыс істеуге арналған. papanda.kz сайтына жариялау өшірілген. ЖИ қолжетімділігі мен бағасын таңдалған провайдер анықтайды. ЖИ жауаптарында қателер болуы мүмкін.',
    },
}


def words(locale):
    return COPY.get(locale, COPY['ru'])


def personal_only():
    if settings.APP_EDITION != 'personal' or settings.DEMO_MODE:
        raise HTTPException(404, 'Not found')


def config_path():
    # The personal launcher always sets this to its own application-data folder.
    return Path(os.environ['PAPANDA_ENV_FILE'])


def read_config():
    return dotenv_values(config_path(), interpolate=False)


def save_config(provider, key, model, clear=False):
    if provider not in PROVIDERS or any(c in model for c in '\r\n\x00'):
        raise HTTPException(422, 'Invalid provider or model')
    values = read_config()
    _, key_name, model_name, default_model = PROVIDERS[provider]
    credential = '' if clear else key.strip() or values.get(key_name) or ''
    if len(credential) > 4096 or any(c in credential for c in '\r\n\x00'):
        raise HTTPException(422, 'Invalid API key')
    # Never preserve publication credentials or unrelated author configuration.
    import json
    output = {name: '' for name in KEY_FIELDS}
    output.update({key_name: credential, model_name: model.strip() or default_model,
                   'PERSONAL_PROVIDER': provider, 'GENERATION_ENGINE': 'dialectic_v3'})
    if values.get('SECRET_KEY'):
        output['SECRET_KEY'] = values['SECRET_KEY']
    path = config_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent,
                                     prefix='.settings-', delete=False) as handle:
        temporary = Path(handle.name)
        for name, value in output.items():
            handle.write(f'{name}={json.dumps(value, ensure_ascii=False)}\n')
    try:
        temporary.chmod(0o600)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


router = APIRouter(dependencies=[Depends(personal_only)])
templates = Jinja2Templates(directory=Path(__file__).resolve().parents[1] / 'templates')
templates.env.globals['asset'] = asset


@router.get('/personal/settings')
async def settings_page(request: Request):
    values = read_config()
    provider = values.get('PERSONAL_PROVIDER', 'openai')
    if provider not in PROVIDERS:
        provider = 'openai'
    _, key_name, model_name, default_model = PROVIDERS[provider]
    locale = getattr(request.state, 'locale', 'ru')
    return templates.TemplateResponse(request=request, name='personal_settings.html', context={
        '_': get_translator(locale), 'locale': locale, 'w': words(locale),
        'providers': PROVIDERS, 'provider': provider,
        'model': values.get(model_name) or default_model, 'configured': bool(values.get(key_name)),
        'saved': request.query_params.get('saved') == '1',
    }, headers={'Cache-Control': 'no-store'})


@router.post('/personal/settings')
async def update_settings(provider: Annotated[str, Form(max_length=32)],
                          model: Annotated[str, Form(max_length=200)],
                          api_key: Annotated[str, Form(max_length=4096)] = '',
                          clear: Annotated[bool, Form()] = False):
    save_config(provider, api_key, model, clear)
    return RedirectResponse('/personal/settings?saved=1', status_code=303)
