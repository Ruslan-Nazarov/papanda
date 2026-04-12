import sys
from os.path import dirname, abspath
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool, create_engine

from alembic import context

# Добавляем корень проекта в путь, чтобы импортировать наше приложение
sys.path.insert(0, dirname(dirname(abspath(__file__))))

from fastapi_app.config import settings
from fastapi_app.database import Base
# Импортируем все модели, чтобы они попали в Base.metadata
from fastapi_app import models

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    # Alembic использует синхронный движок — убираем async-драйвер из URL
    url = settings.final_database_url.replace("+aiosqlite", "")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    # Alembic использует синхронный движок — убираем async-драйвер из URL
    sync_url = settings.final_database_url.replace("+aiosqlite", "")
    connectable = create_engine(sync_url)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True # Важно для SQLite!
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
