import os
import tempfile
from pathlib import Path

# Configure an isolated database *before* the app is imported.
_tmp = tempfile.mkdtemp(prefix="jobtrack-tests-")
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_tmp) / 'test.db'}"
os.environ["JWT_SECRET"] = "test-secret-key-that-is-long-enough-for-hs256-signing"
os.environ["OPTIONAL_AI_API_KEY"] = ""

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database.session import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(autouse=True)
def clean_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def register(client: TestClient, email: str = "asha@example.com", name: str = "Asha Nair") -> dict:
    response = client.post(
        "/auth/register",
        json={"full_name": name, "email": email, "password": "Str0ngPass!"},
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture
def auth(client):
    data = register(client)
    return {"Authorization": f"Bearer {data['access_token']}"}


@pytest.fixture
def other_auth(client):
    data = register(client, email="ravi@example.com", name="Ravi Menon")
    return {"Authorization": f"Bearer {data['access_token']}"}
