"""Tests for reservation endpoints"""

from fastapi.testclient import TestClient
from sqlmodel import Session

from tests.factories import (
    EstablishmentFactory,
    ReservationFactory,
)


class TestReservationList:
    """Tests for /api/staff/reservations endpoint"""

    def test_get_reservations_list(self, client: TestClient, session: Session, auth_headers_staff):
        """Test getting list of reservations with pagination"""
        establishment = EstablishmentFactory(session=session)
        for _ in range(3):
            ReservationFactory(session=session, establishment=establishment)
        session.commit()

        response = client.get("/api/staff/reservations/", headers=auth_headers_staff)

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

    def test_get_reservations_list_pagination(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test pagination parameters"""
        establishment = EstablishmentFactory(session=session)
        for _ in range(25):
            ReservationFactory(session=session, establishment=establishment)
        session.commit()

        # Test first page
        response = client.get(
            "/api/staff/reservations/?page=1&page_size=10", headers=auth_headers_staff
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 10
        assert data["total"] == 25
        assert data["page"] == 1
        assert data["total_pages"] == 3

        # Test second page
        response = client.get(
            "/api/staff/reservations/?page=2&page_size=10", headers=auth_headers_staff
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 10
        assert data["page"] == 2

        # Test last page
        response = client.get(
            "/api/staff/reservations/?page=3&page_size=10", headers=auth_headers_staff
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 5
        assert data["page"] == 3

    def test_get_reservations_list_invalid_pagination(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test invalid pagination parameters"""
        # Page < 1
        response = client.get("/api/staff/reservations/?page=0", headers=auth_headers_staff)
        assert response.status_code == 400

        # Page size > 100
        response = client.get("/api/staff/reservations/?page_size=101", headers=auth_headers_staff)
        assert response.status_code == 400

        # Page size < 1
        response = client.get("/api/staff/reservations/?page_size=0", headers=auth_headers_staff)
        assert response.status_code == 400

    def test_get_reservations_list_unauthorized(self, client: TestClient, session: Session):
        """Test getting reservations list without authentication"""
        response = client.get("/api/staff/reservations/")

        assert response.status_code == 401


class TestReservationDetail:
    """Tests for /api/staff/reservations/<reservation_id> endpoint"""

    def test_get_reservation_detail(self, client: TestClient, session: Session, auth_headers_staff):
        """Test getting a specific reservation"""
        reservation = ReservationFactory(session=session)
        session.commit()

        response = client.get(
            f"/api/staff/reservations/{reservation.uuid}", headers=auth_headers_staff
        )

        assert response.status_code == 200
        data = response.json()
        assert data["reference"] == reservation.reference
        assert data["number_of_guests"] == reservation.number_of_guests


class TestClientReservations:
    """Tests for client-facing reservation endpoints"""

    def test_get_new_reservation_token(self, client: TestClient, session: Session):
        """Test getting a new reservation token"""
        establishment = EstablishmentFactory(session=session)
        session.commit()

        response = client.post(
            "/api/client/new-reservation-token", json={"establishment_id": str(establishment.uuid)}
        )

        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "expires_at" in data

    def test_create_reservation_for_new_client(self, client: TestClient, session: Session):
        """Test creating reservation with new client"""
        establishment = EstablishmentFactory(session=session)
        session.commit()

        # Get token first
        token_response = client.post(
            "/api/client/new-reservation-token", json={"establishment_id": str(establishment.uuid)}
        )
        token = token_response.json()["token"]

        # Create reservation
        reservation_data = {
            "token": token,
            "full_name": "John Doe",
            "phone_number": "+1234567890",
            "email": "john@example.com",
            "number_of_guests": 2,
            "reservation_date": "2026-02-01",
            "reservation_time": "19:00:00",
        }

        response = client.post("/api/client/reservation-for-new-client", json=reservation_data)

        assert response.status_code == 200
        data = response.json()
        assert "reference" in data
        assert data["number_of_guests"] == 2
