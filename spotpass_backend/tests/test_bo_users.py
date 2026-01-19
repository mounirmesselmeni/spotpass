"""Tests for back office user endpoints"""

from fastapi.testclient import TestClient
from sqlmodel import Session

from tests.factories import BoUserFactory


class TestBoUsers:
    """Tests for /api/bo/bo-users endpoint"""

    def test_list_bo_users(self, client: TestClient, session: Session, auth_headers_bo):
        """Test listing all BO users"""
        # Create some BO users
        for _ in range(3):
            BoUserFactory(session=session)
        session.commit()

        response = client.get("/api/bo/bo-users", headers=auth_headers_bo)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # At least 4 (3 created + 1 from auth fixture)
        assert len(data) >= 4

    def test_list_bo_users_unauthorized(self, client: TestClient, session: Session):
        """Test listing BO users without authentication"""
        response = client.get("/api/bo/bo-users")

        assert response.status_code == 401

    def test_list_bo_users_staff_forbidden(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test that staff users cannot access BO endpoints"""
        response = client.get("/api/bo/bo-users", headers=auth_headers_staff)

        assert response.status_code == 403

    def test_create_bo_user(self, client: TestClient, session: Session, auth_headers_bo):
        """Test creating a new BO user"""
        user_data = {
            "first_name": "Jane",
            "last_name": "Doe",
            "email": "jane@example.com",
            "password": "password123",
        }

        response = client.post("/api/bo/bo-users", json=user_data, headers=auth_headers_bo)

        assert response.status_code == 201
        data = response.json()
        assert data["first_name"] == "Jane"
        assert data["email"] == "jane@example.com"
        assert "password" not in data  # Password should not be returned

    def test_create_bo_user_duplicate_email(
        self, client: TestClient, session: Session, auth_headers_bo
    ):
        """Test creating BO user with duplicate email"""
        BoUserFactory(session=session, email="duplicate@example.com")
        session.commit()

        user_data = {
            "first_name": "Jane",
            "last_name": "Doe",
            "email": "duplicate@example.com",
            "password": "password123",
        }

        response = client.post("/api/bo/bo-users", json=user_data, headers=auth_headers_bo)

        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]
