"""Tests for table endpoints"""

from fastapi.testclient import TestClient
from sqlmodel import Session

from tests.factories import EstablishmentFactory, TableFactory, ZoneFactory


class TestTableList:
    """Tests for /api/staff/tables endpoint"""

    def test_get_tables_list(self, client: TestClient, session: Session, auth_headers_staff):
        """Test getting list of tables"""
        establishment = EstablishmentFactory(session=session)
        for _ in range(5):
            TableFactory(session=session, establishment=establishment)
        session.commit()

        response = client.get("/api/staff/tables/", headers=auth_headers_staff)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 5

    def test_get_tables_list_unauthorized(self, client: TestClient, session: Session):
        """Test getting tables list without authentication"""
        response = client.get("/api/staff/tables/")

        assert response.status_code == 401

    def test_create_table(self, client: TestClient, session: Session, auth_headers_staff):
        """Test creating a new table"""
        establishment = EstablishmentFactory(session=session)
        zone = ZoneFactory(session=session, establishment=establishment)
        session.commit()

        table_data = {
            "name": "Table 10",
            "description": "Window seat",
            "type": "table",  # Lowercase to match enum
            "min_capacity": 2,
            "max_capacity": 4,
            "is_available": True,
            "establishment_id": str(establishment.uuid),
            "zone_id": str(zone.uuid),
        }

        response = client.post("/api/staff/tables/", json=table_data, headers=auth_headers_staff)

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Table 10"
        assert data["min_capacity"] == 2

    def test_create_table_invalid_capacity(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test creating table with invalid capacity"""
        establishment = EstablishmentFactory(session=session)
        session.commit()

        table_data = {
            "name": "Table 10",
            "min_capacity": 10,
            "max_capacity": 2,  # Max less than min
            "establishment_id": str(establishment.uuid),
        }

        response = client.post("/api/staff/tables/", json=table_data, headers=auth_headers_staff)

        assert response.status_code == 400


class TestTableDetail:
    """Tests for /api/staff/tables/<table_id> endpoint"""

    def test_get_table_detail(self, client: TestClient, session: Session, auth_headers_staff):
        """Test getting a specific table"""
        table = TableFactory(session=session)
        session.commit()

        response = client.get(f"/api/staff/tables/{table.uuid}", headers=auth_headers_staff)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == table.name
        assert data["min_capacity"] == table.min_capacity

    def test_get_table_not_found(self, client: TestClient, session: Session, auth_headers_staff):
        """Test getting non-existent table"""
        response = client.get(
            "/api/staff/tables/00000000-0000-0000-0000-000000000000",
            headers=auth_headers_staff,
        )

        assert response.status_code == 404

    def test_update_table_availability(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test updating table availability"""
        table = TableFactory(session=session, is_available=True)
        session.commit()

        update_data = {"is_available": False}

        response = client.patch(
            f"/api/staff/tables/{table.uuid}",
            json=update_data,
            headers=auth_headers_staff,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_available"] is False

    def test_delete_table(self, client: TestClient, session: Session, auth_headers_staff):
        """Test deleting a table"""
        table = TableFactory(session=session)
        session.commit()

        response = client.delete(f"/api/staff/tables/{table.uuid}", headers=auth_headers_staff)

        assert response.status_code == 204


class TestZoneList:
    """Tests for /api/staff/zones endpoint"""

    def test_get_zones_list(self, client: TestClient, session: Session, auth_headers_staff):
        """Test getting list of zones"""
        establishment = EstablishmentFactory(session=session)
        for _ in range(3):
            ZoneFactory(session=session, establishment=establishment)
        session.commit()

        response = client.get("/api/staff/zones/", headers=auth_headers_staff)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 3

    def test_create_zone(self, client: TestClient, session: Session, auth_headers_staff):
        """Test creating a new zone"""
        establishment = EstablishmentFactory(session=session)
        session.commit()

        zone_data = {
            "name": "Terrace",
            "establishment_id": str(establishment.uuid),
        }

        response = client.post("/api/staff/zones/", json=zone_data, headers=auth_headers_staff)

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Terrace"
