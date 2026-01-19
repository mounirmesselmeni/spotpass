"""
Pytest configuration and fixtures for SpotPass Backend tests
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from core.database import get_session
from core.security import create_access_token
from main import app


@pytest.fixture(name="session")
def session_fixture():
    """Create a new database session for each test"""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        yield session

    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="client")
def client_fixture(session: Session):
    """Create a test client for the FastAPI application"""

    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override

    client = TestClient(app)
    yield client

    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers_staff(client: TestClient, session: Session):
    """Get authentication headers for staff user"""
    from accounts.models import Account
    from users.models import User

    # Create account
    account = Account(name="Test Account", country_code="US", currency="USD")
    session.add(account)
    session.flush()

    # Create a test staff user
    user = User(
        first_name="Test",
        last_name="Staff",
        email="staff@test.com",
        password="password123",
        account_id=account.id,
        role="admin",
    )
    user.hash_password()
    session.add(user)
    session.commit()
    session.refresh(user)

    # Generate token (returns tuple now)
    access_token, _ = create_access_token(
        identity=str(user.id), additional_claims={"account": user.account_id, "user_type": "staff"}
    )

    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture
def auth_headers_bo(client: TestClient, session: Session):
    """Get authentication headers for back office user"""
    from users.models import BoUser

    # Create a test BO user
    user = BoUser(
        first_name="Test", last_name="Admin", email="admin@test.com", password="password123"
    )
    user.hash_password()
    session.add(user)
    session.commit()
    session.refresh(user)

    # Generate token (returns tuple now)
    access_token, _ = create_access_token(
        identity=str(user.id), additional_claims={"user_type": "bo"}
    )

    return {"Authorization": f"Bearer {access_token}"}
