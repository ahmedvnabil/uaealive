"""Shared test fixtures: test database (PostGIS) + FastAPI TestClient."""

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

import app.models  # noqa: F401  (populate Base.metadata)
from app.config import get_settings
from app.db import Base, get_db
from app.main import app as fastapi_app
from app.seed import seed_all

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://uae:uae@localhost:5433/uaealive_test"
)


@pytest.fixture(scope="session")
def engine():
    test_engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)
    with test_engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        conn.commit()
    Base.metadata.drop_all(test_engine)
    Base.metadata.create_all(test_engine)
    yield test_engine
    Base.metadata.drop_all(test_engine)
    test_engine.dispose()


@pytest.fixture()
def db_session(engine):
    """Session wrapped in an outer transaction rolled back after each test."""
    connection = engine.connect()
    transaction = connection.begin()
    factory = sessionmaker(bind=connection, autoflush=False, expire_on_commit=False)
    session = factory()
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture(scope="session")
def seeded_engine(engine):
    """Seed the test database once per session from the committed data/*.json files."""
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    with factory() as session:
        seed_all(session, Path(get_settings().data_dir))
        session.commit()
    return engine


@pytest.fixture()
def client(db_session):
    def override_get_db():
        yield db_session

    fastapi_app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(fastapi_app) as test_client:
            yield test_client
    finally:
        fastapi_app.dependency_overrides.pop(get_db, None)


@pytest.fixture()
def seeded_client(seeded_engine, client):
    """TestClient whose database already contains the seeded knowledge base."""
    return client
