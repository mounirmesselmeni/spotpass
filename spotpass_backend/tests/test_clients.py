"""Tests for client endpoints"""

from fastapi.testclient import TestClient
from sqlmodel import Session

from tests.factories import ClientFactory, EstablishmentFactory


class TestClientList:
    """Tests for /api/staff/clients endpoint"""

    def test_get_clients_list(self, client: TestClient, session: Session, auth_headers_staff):
        """Test getting list of clients"""
        # Create test clients
        establishment = EstablishmentFactory(session=session)
        for _ in range(3):
            ClientFactory(session=session, establishment=establishment)
        session.commit()

        response = client.get("/api/staff/clients/", headers=auth_headers_staff)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 3

    def test_get_clients_list_unauthorized(self, client: TestClient, session: Session):
        """Test getting clients list without authentication"""
        response = client.get("/api/staff/clients/")

        assert response.status_code == 401  # FastAPI HTTPBearer returns 401

    def test_create_client(self, client: TestClient, session: Session, auth_headers_staff):
        """Test creating a new client"""
        establishment = EstablishmentFactory(session=session, account_id=1)
        session.commit()

        client_data = {
            "full_name": "John Doe",
            "email": "john@example.com",
            "phone_number": "+1234567890",
        }

        response = client.post("/api/staff/clients/", json=client_data, headers=auth_headers_staff)

        assert response.status_code == 201
        data = response.json()
        assert data["full_name"] == "John Doe"
        assert data["email"] == "john@example.com"

    def test_create_client_missing_required_fields(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test creating client with missing required fields"""
        response = client.post(
            "/api/staff/clients/",
            json={"full_name": "John Doe"},
            headers=auth_headers_staff,
        )

        # FastAPI/Pydantic returns 422 for validation errors
        assert response.status_code == 422


class TestClientDetail:
    """Tests for /api/staff/clients/<client_id> endpoint"""

    def test_get_client_detail(self, client: TestClient, session: Session, auth_headers_staff):
        """Test getting a specific client"""
        test_client = ClientFactory(session=session)
        session.commit()

        response = client.get(f"/api/staff/clients/{test_client.uuid}", headers=auth_headers_staff)

        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == test_client.full_name
        assert data["email"] == test_client.email

    def test_get_client_not_found(self, client: TestClient, session: Session, auth_headers_staff):
        """Test getting non-existent client"""
        response = client.get(
            "/api/staff/clients/00000000-0000-0000-0000-000000000000",
            headers=auth_headers_staff,
        )

        assert response.status_code == 404

    def test_update_client(self, client: TestClient, session: Session, auth_headers_staff):
        """Test updating a client"""
        test_client = ClientFactory(session=session)
        session.commit()

        update_data = {"is_vip": True, "is_blacklisted": False}

        response = client.patch(
            f"/api/staff/clients/{test_client.uuid}",
            json=update_data,
            headers=auth_headers_staff,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_vip"] is True

    def test_delete_client(self, client: TestClient, session: Session, auth_headers_staff):
        """Test deleting a client"""
        test_client = ClientFactory(session=session)
        session.commit()

        response = client.delete(
            f"/api/staff/clients/{test_client.uuid}", headers=auth_headers_staff
        )

        assert response.status_code == 204

        # Verify client is deleted
        response = client.get(f"/api/staff/clients/{test_client.uuid}", headers=auth_headers_staff)
        assert response.status_code == 404
