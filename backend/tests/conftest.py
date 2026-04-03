from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from app.config import settings  # noqa: E402
from app.database import Base, get_db  # noqa: E402
from app.main import create_app  # noqa: E402
from app.auth import require_admin_token  # noqa: E402


@pytest.fixture(scope="session")
def engine():
    """Create a real database engine for tests (PostgreSQL only)."""
    test_db_url = os.getenv("TEST_DATABASE_URL", settings.database_url)

    if not test_db_url or not test_db_url.startswith("postgresql"):
        raise RuntimeError(
            "TEST_DATABASE_URL must be set to a PostgreSQL DSN, "
            "e.g. postgresql+psycopg2://user:pass@localhost:5432/dbname"
        )

    engine = create_engine(test_db_url)

    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)


@pytest.fixture()
def upload_dir(tmp_path_factory):
    return tmp_path_factory.mktemp("uploads")


@pytest.fixture()
def client(engine, upload_dir):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    # point uploads to a temp dir for tests
    settings.upload_dir = str(upload_dir)
    settings.upload_base_url = "/uploads"

    app = create_app()

    def override_get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[require_admin_token] = lambda: None
    with TestClient(app) as test_client:
        yield test_client
