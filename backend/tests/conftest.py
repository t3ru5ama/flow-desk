import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.config import settings
from app.core.rate_limit import limiter
from app.models.base import Base
from app.db import get_db
from app.main import app

TEST_DATABASE_URL = (
    f"mysql+pymysql://{settings.db_user}:{settings.db_password}"
    f"@{settings.db_host}:{settings.db_port}/flowdesk_test"
)

engine = create_engine(TEST_DATABASE_URL)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def _setup_schema():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(autouse=True)
def _clean_tables():
    limiter.reset()
    yield
    with engine.begin() as conn:
        conn.exec_driver_sql("SET FOREIGN_KEY_CHECKS=0")
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
        conn.exec_driver_sql("SET FOREIGN_KEY_CHECKS=1")


def _override_get_db():
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture
def client():
    return TestClient(app)


def signup(client, name="Alex Morgan", email="alex@acme.test", org="Acme Technologies"):
    resp = client.post(
        "/api/auth/signup",
        json={"name": name, "email": email, "password": "Password123!", "organization_name": org},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def add_member(db, org_id: str, role, name="Test User", email=None) -> tuple:
    from app.core.security import create_access_token, hash_password
    from app.models.membership import Membership
    from app.models.user import User
    import uuid

    email = email or f"{uuid.uuid4().hex[:8]}@acme.test"
    user = User(name=name, email=email, password_hash=hash_password("Password123!"))
    db.add(user)
    db.flush()
    db.add(Membership(organization_id=org_id, user_id=user.id, role=role))
    db.commit()
    token = create_access_token(user.id, org_id, role.value)
    return user, token
