"""Alembic environment — wires app settings and GeoAlchemy2 helpers."""

from logging.config import fileConfig

from geoalchemy2 import alembic_helpers
from sqlalchemy import engine_from_config, pool

import app.models  # noqa: F401  (populate Base.metadata)
from alembic import context
from app.config import get_settings
from app.db import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

config.set_main_option("sqlalchemy.url", get_settings().database_url)

target_metadata = Base.metadata

def include_name(name, type_, parent_names):
    """Only reflect tables we own — the PostGIS image puts tiger/topology
    tables on the search_path and they must never enter autogenerate."""
    if type_ == "table":
        return name in target_metadata.tables
    return True


def include_object(obj, name, type_, reflected, compare_to):
    """Skip PostGIS-internal objects via GeoAlchemy2's filter."""
    return alembic_helpers.include_object(obj, name, type_, reflected, compare_to)


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_name=include_name,
        include_object=include_object,
        process_revision_directives=alembic_helpers.writer,
        render_item=alembic_helpers.render_item,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_name=include_name,
            include_object=include_object,
            process_revision_directives=alembic_helpers.writer,
            render_item=alembic_helpers.render_item,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
