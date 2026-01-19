"""Tests for authentication endpoints"""

from fastapi.testclient import TestClient
from sqlmodel import Session

from tests.factories import BoUserFactory, UserFactory


class TestStaffAuth:
    """Tests for staff authentication"""

    def test_staff_login_success(self, client: TestClient, session: Session):
        """Test successful staff login"""
        from accounts.models import Account

        # Create account
        account = Account(name="Test Account", country_code="US", currency="USD")
        session.add(account)
        session.flush()

        # Create a staff user
        user = UserFactory(
            session=session, email="staff@test.com", password="password123", account_id=account.id
        )
        session.commit()

        response = client.post(
            "/api/staff/auth/login", json={"email": "staff@test.com", "password": "password123"}
        )

        assert response.status_code == 200
        data = response.json()

        # Check new token structure
        assert "access_token" in data
        assert "refresh_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
        assert "expires_at" in data
        assert "user" in data

        # Check user info
        user_info = data["user"]
        assert user_info["email"] == "staff@test.com"
        assert user_info["first_name"] == user.first_name
        assert user_info["last_name"] == user.last_name
        assert user_info["user_type"] == "staff"
        assert user_info["role"] is not None
        assert user_info["account_id"] == user.account_id  # Use user's account_id

    def test_staff_login_invalid_email(self, client: TestClient, session: Session):
        """Test staff login with invalid email"""
        response = client.post(
            "/api/staff/auth/login",
            json={"email": "nonexistent@test.com", "password": "password123"},
        )

        assert response.status_code == 401
        assert "Email or password invalid" in response.json()["detail"]

    def test_staff_login_invalid_password(self, client: TestClient, session: Session):
        """Test staff login with invalid password"""
        from accounts.models import Account

        # Create account
        account = Account(name="Test Account", country_code="US", currency="USD")
        session.add(account)
        session.flush()

        UserFactory(
            session=session, email="staff@test.com", password="password123", account_id=account.id
        )
        session.commit()

        response = client.post(
            "/api/staff/auth/login", json={"email": "staff@test.com", "password": "wrongpassword"}
        )

        assert response.status_code == 401
        assert "Email or password invalid" in response.json()["detail"]


class TestBoAuth:
    """Tests for back office authentication"""

    def test_bo_login_success(self, client: TestClient, session: Session):
        """Test successful BO login"""
        user = BoUserFactory(session=session, email="admin@test.com", password="password123")
        session.commit()

        response = client.post(
            "/api/bo/auth/login", json={"email": "admin@test.com", "password": "password123"}
        )

        assert response.status_code == 200
        data = response.json()

        # Check new token structure
        assert "access_token" in data
        assert "refresh_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
        assert "expires_at" in data
        assert "user" in data

        # Check user info
        user_info = data["user"]
        assert user_info["email"] == "admin@test.com"
        assert user_info["first_name"] == user.first_name
        assert user_info["last_name"] == user.last_name
        assert user_info["user_type"] == "bo"
        assert user_info["role"] is None
        assert user_info["account_id"] is None

    def test_bo_login_invalid_credentials(self, client: TestClient, session: Session):
        """Test BO login with invalid credentials"""
        response = client.post(
            "/api/bo/auth/login", json={"email": "admin@test.com", "password": "wrongpassword"}
        )

        assert response.status_code == 401


class TestRefreshToken:
    """Tests for refresh token endpoint"""

    def test_staff_refresh_token_success(self, client: TestClient, session: Session):
        """Test successful staff token refresh"""
        from accounts.models import Account

        # Create account and user
        account = Account(name="Test Account", country_code="US", currency="USD")
        session.add(account)
        session.flush()

        UserFactory(
            session=session, email="staff@test.com", password="password123", account_id=account.id
        )
        session.commit()

        # Login to get tokens
        login_response = client.post(
            "/api/staff/auth/login", json={"email": "staff@test.com", "password": "password123"}
        )

        assert login_response.status_code == 200
        tokens = login_response.json()
        refresh_token = tokens["refresh_token"]

        # Use refresh token to get new access token
        refresh_response = client.post(
            "/api/staff/auth/refresh", json={"refresh_token": refresh_token}
        )

        assert refresh_response.status_code == 200
        data = refresh_response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
        assert "expires_at" in data

    def test_bo_refresh_token_success(self, client: TestClient, session: Session):
        """Test successful BO token refresh"""
        BoUserFactory(session=session, email="admin@test.com", password="password123")
        session.commit()

        # Login to get tokens
        login_response = client.post(
            "/api/bo/auth/login", json={"email": "admin@test.com", "password": "password123"}
        )

        assert login_response.status_code == 200
        tokens = login_response.json()
        refresh_token = tokens["refresh_token"]

        # Use refresh token to get new access token
        refresh_response = client.post(
            "/api/bo/auth/refresh", json={"refresh_token": refresh_token}
        )

        assert refresh_response.status_code == 200
        data = refresh_response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"

    def test_refresh_token_invalid(self, client: TestClient, session: Session):
        """Test refresh with invalid token"""
        refresh_response = client.post(
            "/api/staff/auth/refresh", json={"refresh_token": "invalid_token"}
        )

        assert refresh_response.status_code == 401


class TestMeEndpoint:
    """Tests for /me endpoint"""

    def test_staff_me_endpoint(self, client: TestClient, session: Session, auth_headers_staff):
        """Test getting current staff user info"""
        response = client.get("/api/staff/auth/me", headers=auth_headers_staff)

        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert "first_name" in data
        assert "last_name" in data
        assert data["email"] == "staff@test.com"

    def test_bo_me_endpoint(self, client: TestClient, session: Session, auth_headers_bo):
        """Test getting current BO user info"""
        response = client.get("/api/bo/auth/me", headers=auth_headers_bo)

        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert "first_name" in data
        assert "last_name" in data
        assert data["email"] == "admin@test.com"

    def test_me_endpoint_unauthorized(self, client: TestClient, session: Session):
        """Test /me endpoint without authentication"""
        response = client.get("/api/staff/auth/me")

        assert response.status_code == 401
