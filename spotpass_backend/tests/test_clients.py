"""Tests for client endpoints"""

from fastapi.testclient import TestClient
from sqlmodel import Session

from tests.factories import ClientFactory, EstablishmentFactory


class TestClientList:
    """Tests for /api/staff/clients endpoint"""

    def test_get_clients_list(self, client: TestClient, session: Session, auth_headers_staff):
        """Test getting list of clients with pagination"""
        # Create test clients
        establishment = EstablishmentFactory(session=session)
        for _ in range(3):
            ClientFactory(session=session, establishment=establishment)
        session.commit()

        response = client.get("/api/staff/clients/", headers=auth_headers_staff)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "total_pages" in data
        assert len(data["items"]) == 3
        assert data["total"] == 3
        assert data["page"] == 1
        assert data["page_size"] == 20

    def test_get_clients_list_pagination(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test pagination parameters for clients"""
        establishment = EstablishmentFactory(session=session)
        for _ in range(25):
            ClientFactory(session=session, establishment=establishment)
        session.commit()

        # Test first page
        response = client.get("/api/staff/clients/?page=1&page_size=10", headers=auth_headers_staff)
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 10
        assert data["total"] == 25
        assert data["page"] == 1
        assert data["total_pages"] == 3

        # Test second page
        response = client.get("/api/staff/clients/?page=2&page_size=10", headers=auth_headers_staff)
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 10
        assert data["page"] == 2

    def test_get_clients_list_unauthorized(self, client: TestClient, session: Session):
        """Test getting clients list without authentication"""
        response = client.get("/api/staff/clients/")

        assert response.status_code == 401  # FastAPI HTTPBearer returns 401

    def test_create_client(self, client: TestClient, session: Session, auth_headers_staff):
        """Test creating a new client"""
        EstablishmentFactory(session=session, account_id=1)
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


class TestClientSorting:
    """Tests for client list sorting"""

    def test_sort_by_name_asc_default(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test default sorting by name ascending"""
        establishment = EstablishmentFactory(session=session)

        ClientFactory(session=session, establishment=establishment, full_name="Zoe")
        ClientFactory(session=session, establishment=establishment, full_name="Alice")
        ClientFactory(session=session, establishment=establishment, full_name="Michael")
        session.commit()

        response = client.get("/api/staff/clients/", headers=auth_headers_staff)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        items = data["items"]

        # Should be sorted alphabetically
        assert items[0]["full_name"] == "Alice"
        assert items[1]["full_name"] == "Michael"
        assert items[2]["full_name"] == "Zoe"

    def test_sort_by_name_desc(self, client: TestClient, session: Session, auth_headers_staff):
        """Test sorting by name descending"""
        establishment = EstablishmentFactory(session=session)

        ClientFactory(session=session, establishment=establishment, full_name="Alice")
        ClientFactory(session=session, establishment=establishment, full_name="Zoe")
        session.commit()

        response = client.get(
            "/api/staff/clients/?sort_by=name&sort_order=desc", headers=auth_headers_staff
        )
        assert response.status_code == 200
        items = response.json()["items"]

        # Should be sorted reverse alphabetically
        assert items[0]["full_name"] == "Zoe"
        assert items[1]["full_name"] == "Alice"

    def test_sort_by_email(self, client: TestClient, session: Session, auth_headers_staff):
        """Test sorting by email"""
        establishment = EstablishmentFactory(session=session)

        ClientFactory(session=session, establishment=establishment, email="zoe@example.com")
        ClientFactory(session=session, establishment=establishment, email="alice@example.com")
        ClientFactory(session=session, establishment=establishment, email="michael@example.com")
        session.commit()

        response = client.get(
            "/api/staff/clients/?sort_by=email&sort_order=asc", headers=auth_headers_staff
        )
        assert response.status_code == 200
        items = response.json()["items"]

        assert items[0]["email"] == "alice@example.com"
        assert items[1]["email"] == "michael@example.com"
        assert items[2]["email"] == "zoe@example.com"

    def test_invalid_sort_field(self, client: TestClient, session: Session, auth_headers_staff):
        """Test that invalid sort field returns error"""
        response = client.get("/api/staff/clients/?sort_by=invalid", headers=auth_headers_staff)
        assert response.status_code == 400


class TestClientLabelFiltering:
    """Tests for client label filtering"""

    def test_filter_by_vip(self, client: TestClient, session: Session, auth_headers_staff):
        """Test filtering by VIP clients"""
        establishment = EstablishmentFactory(session=session)

        ClientFactory(
            session=session, establishment=establishment, full_name="VIP Client", is_vip=True
        )
        ClientFactory(
            session=session, establishment=establishment, full_name="Regular Client", is_vip=False
        )
        ClientFactory(
            session=session, establishment=establishment, full_name="Another VIP", is_vip=True
        )
        session.commit()

        response = client.get("/api/staff/clients/?label_filter=vip", headers=auth_headers_staff)
        assert response.status_code == 200
        items = response.json()["items"]

        assert len(items) == 2
        assert all(item["is_vip"] is True for item in items)

    def test_filter_by_blacklisted(self, client: TestClient, session: Session, auth_headers_staff):
        """Test filtering by blacklisted clients"""
        establishment = EstablishmentFactory(session=session)

        ClientFactory(session=session, establishment=establishment, is_blacklisted=True)
        ClientFactory(session=session, establishment=establishment, is_blacklisted=False)
        ClientFactory(session=session, establishment=establishment, is_blacklisted=True)
        session.commit()

        response = client.get(
            "/api/staff/clients/?label_filter=blacklisted", headers=auth_headers_staff
        )
        assert response.status_code == 200
        items = response.json()["items"]

        assert len(items) == 2
        assert all(item["is_blacklisted"] is True for item in items)

    def test_filter_by_regular(self, client: TestClient, session: Session, auth_headers_staff):
        """Test filtering by regular clients (not VIP, not blacklisted)"""
        establishment = EstablishmentFactory(session=session)

        ClientFactory(
            session=session, establishment=establishment, is_vip=True, is_blacklisted=False
        )
        ClientFactory(
            session=session, establishment=establishment, is_vip=False, is_blacklisted=False
        )
        ClientFactory(
            session=session, establishment=establishment, is_vip=False, is_blacklisted=True
        )
        ClientFactory(
            session=session, establishment=establishment, is_vip=False, is_blacklisted=False
        )
        session.commit()

        response = client.get(
            "/api/staff/clients/?label_filter=regular", headers=auth_headers_staff
        )
        assert response.status_code == 200
        items = response.json()["items"]

        assert len(items) == 2
        assert all(item["is_vip"] is False and item["is_blacklisted"] is False for item in items)

    def test_filter_all_clients(self, client: TestClient, session: Session, auth_headers_staff):
        """Test getting all clients (no filter)"""
        establishment = EstablishmentFactory(session=session)

        ClientFactory(session=session, establishment=establishment, is_vip=True)
        ClientFactory(session=session, establishment=establishment, is_blacklisted=True)
        ClientFactory(
            session=session, establishment=establishment, is_vip=False, is_blacklisted=False
        )
        session.commit()

        # No filter
        response = client.get("/api/staff/clients/", headers=auth_headers_staff)
        assert response.status_code == 200
        items = response.json()["items"]
        assert len(items) == 3

        # Explicit all filter
        response = client.get("/api/staff/clients/?label_filter=all", headers=auth_headers_staff)
        assert response.status_code == 200
        items = response.json()["items"]
        assert len(items) == 3

    def test_invalid_label_filter(self, client: TestClient, session: Session, auth_headers_staff):
        """Test that invalid label filter returns error"""
        response = client.get(
            "/api/staff/clients/?label_filter=invalid", headers=auth_headers_staff
        )
        assert response.status_code == 400
