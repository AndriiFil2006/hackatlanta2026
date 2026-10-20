"""Every test uses an isolated database. Never touch DATABASE_URL from a developer's .env."""

import os
import uuid
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

from app.cli import seed
from app.config import Settings
from app.main import create_app

BACKEND = Path(__file__).resolve().parents[1]


@pytest.fixture
def app(tmp_path):
    postgres_url = os.getenv("TEST_DATABASE_URL")
    schema = f"test_{uuid.uuid4().hex}"
    admin_engine = None
    if postgres_url:
        url = make_url(postgres_url)
        if url.drivername == "postgresql":
            url = url.set(drivername="postgresql+psycopg")
        admin_engine = create_engine(url)
        with admin_engine.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        database_url = url.update_query_dict(
            {"options": f"-csearch_path={schema}"}
        ).render_as_string(hide_password=False)
    else:
        database_url = f"sqlite:///{tmp_path / 'market.db'}"
    config = Config(str(BACKEND / "alembic.ini"))
    config.attributes["database_url"] = database_url
    command.upgrade(config, "head")
    settings = Settings(
        database_url=database_url,
        secret_key="test-secret-key-" * 4,
        environment="test",
        version="test-version",
        cors_origins=["http://localhost:5173"],
        token_minutes=60,
    )
    application = create_app(settings)
    application.state.migration_config = config
    with application.state.sessions() as db:
        seed(db)
    yield application
    application.state.engine.dispose()
    if admin_engine:
        with admin_engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        admin_engine.dispose()


@pytest.fixture
def client(app):
    with TestClient(app) as client:
        yield client


def register(client, email="alex@example.com"):
    response = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": "test-password-123",
            "display_name": "Alex Morgan",
        },
    )
    assert response.status_code == 201, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture
def shopper(client):
    return register(client)


@pytest.fixture
def admin(client, app):
    headers = register(client, "admin@example.com")
    from sqlalchemy import select

    from app.models import User

    with app.state.sessions() as db:
        user = db.scalar(select(User).where(User.email == "admin@example.com"))
        user.is_admin = True
        db.commit()
    return headers
