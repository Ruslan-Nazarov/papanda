"""Configure an isolated personal process before importing any application module."""
import os
from pathlib import Path
import sys


AI_KEYS = ('OPENAI_API_KEY', 'GROQ_API_KEY', 'OPENROUTER_API_KEY',
           'CEREBRAS_API_KEY', 'GOOGLE_API_KEY', 'GIGACHAT_AUTH_KEY')
MODELS = ('DIALECTIC_OPENAI_MODEL', 'GROQ_MODEL', 'GROQ_ALT_MODEL', 'GROQ_FAST_MODEL',
          'CEREBRAS_MODEL', 'CEREBRAS_FAST_MODEL', 'OPENROUTER_MODEL',
          'GOOGLE_MODEL', 'GOOGLE_FAST_MODEL', 'GIGACHAT_MODEL', 'GIGACHAT_FAST_MODEL')
ALLOWED_CONFIG = frozenset((*AI_KEYS, *MODELS, 'SECRET_KEY', 'GIGACHAT_SCOPE',
                           'GIGACHAT_CA_BUNDLE', 'PERSONAL_PROVIDER'))


def configure(data_dir=None):
    from dotenv import dotenv_values
    resources = Path(getattr(sys, '_MEIPASS', Path(__file__).resolve().parent))
    directory = Path(data_dir) if data_dir else Path(os.environ.get('LOCALAPPDATA', Path.home())) / 'Papanda' / 'Personal'
    directory = directory.resolve()
    directory.mkdir(parents=True, exist_ok=True)
    env_file = directory / 'settings.env'
    values = dotenv_values(env_file, interpolate=False) if env_file.exists() else {}
    # Inherited author credentials and model settings must never reach this process.
    for key in (*ALLOWED_CONFIG, 'GIGACHAT_CREDENTIALS', 'PAPANDA_READY_FILE', 'PAPANDA_LIBRARY_FILE'):
        os.environ.pop(key, None)
    for key in AI_KEYS:
        os.environ[key] = ''
    for key, value in values.items():
        if key in ALLOWED_CONFIG and value is not None:
            os.environ[key] = value
    os.environ.update({
        'APP_EDITION': 'personal', 'DEMO_MODE': 'false',
        'PAPANDA_ENV_FILE': str(env_file), 'BASE_DIR': str(resources),
        'DATA_DIR': str(directory), 'DB_DIR': str(directory / 'db'),
        'DEMO_DIR': str(directory / 'demo'), 'PROMPTS_DIR': str(resources / 'prompts'),
        'DATABASE_URL': '', 'LIBRARY_PUBLISH_URL': '', 'LIBRARY_PUBLISH_KEY': '',
        'GENERATION_ENGINE': 'dialectic_v3', 'GIGACHAT_VERIFY_SSL': 'true',
        'TRUSTED_PROXY_COUNT': '0', 'TRUSTED_PROXY_IPS': '',
    })
    return directory
