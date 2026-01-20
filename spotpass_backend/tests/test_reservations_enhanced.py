"""Tests for enhanced reservation endpoints with filters"""

from datetime import date, time, timedelta

from fastapi.testclient import TestClient
from sqlmodel import Session

from tests.factories import (
    ClientFactory,
    EstablishmentFactory,
    ReservationFactory,
    TableFactory,
    ZoneFactory,
)


class TestReservationFilters:
    """Tests for reservation list endpoint with filters"""

    def test_filter_by_status(self, client: TestClient, session: Session, auth_headers_staff):
        """Test filtering reservations by status"""
        establishment = EstablishmentFactory(session=session)

        # Create reservations with different statuses
        ReservationFactory(session=session, establishment=establishment, status="pending")
        ReservationFactory(session=session, establishment=establishment, status="accepted")
        ReservationFactory(session=session, establishment=establishment, status="canceled")
        session.commit()

        # Filter by pending status
        response = client.get("/api/staff/reservations/?status=pending", headers=auth_headers_staff)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["status"] == "pending"

    def test_filter_by_date_range(self, client: TestClient, session: Session, auth_headers_staff):
        """Test filtering reservations by date range"""
        establishment = EstablishmentFactory(session=session)
        today = date.today()
        yesterday = today - timedelta(days=1)
        tomorrow = today + timedelta(days=1)

        # Create reservations on different dates
        ReservationFactory(session=session, establishment=establishment, reservation_date=yesterday)
        ReservationFactory(session=session, establishment=establishment, reservation_date=today)
        ReservationFactory(session=session, establishment=establishment, reservation_date=tomorrow)
        session.commit()

        # Filter by date range (today to tomorrow)
        response = client.get(
            f"/api/staff/reservations/?date_from={today.isoformat()}&date_to={tomorrow.isoformat()}",
            headers=auth_headers_staff,
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    def test_keyword_search_by_client_name(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test keyword search by client name"""
        establishment = EstablishmentFactory(session=session)
        client1 = ClientFactory(session=session, full_name="John Doe")
        client2 = ClientFactory(session=session, full_name="Jane Smith")

        ReservationFactory(session=session, establishment=establishment, client=client1)
        ReservationFactory(session=session, establishment=establishment, client=client2)
        session.commit()

        # Search by name
        response = client.get("/api/staff/reservations/?keyword=John", headers=auth_headers_staff)
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1

    def test_keyword_search_by_email(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test keyword search by client email"""
        establishment = EstablishmentFactory(session=session)
        test_client = ClientFactory(session=session, email="test@example.com")

        ReservationFactory(session=session, establishment=establishment, client=test_client)
        session.commit()

        # Search by email
        response = client.get(
            "/api/staff/reservations/?keyword=test@example", headers=auth_headers_staff
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1

    def test_keyword_search_by_phone(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test keyword search by client phone number"""
        establishment = EstablishmentFactory(session=session)
        test_client = ClientFactory(session=session, phone_number="+1234567890")

        ReservationFactory(session=session, establishment=establishment, client=test_client)
        session.commit()

        # Search by phone
        response = client.get(
            "/api/staff/reservations/?keyword=1234567890", headers=auth_headers_staff
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1

    def test_keyword_search_by_reference(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test keyword search by reservation reference"""
        establishment = EstablishmentFactory(session=session)
        reservation = ReservationFactory(session=session, establishment=establishment)
        session.commit()

        # Search by reference
        response = client.get(
            f"/api/staff/reservations/?keyword={reservation.reference[:6]}",
            headers=auth_headers_staff,
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(r["reference"] == reservation.reference for r in data)

    def test_combined_filters(self, client: TestClient, session: Session, auth_headers_staff):
        """Test multiple filters combined"""
        establishment = EstablishmentFactory(session=session)
        today = date.today()
        test_client = ClientFactory(session=session, full_name="Test User")

        ReservationFactory(
            session=session,
            establishment=establishment,
            client=test_client,
            status="pending",
            reservation_date=today,
        )
        ReservationFactory(
            session=session, establishment=establishment, status="accepted", reservation_date=today
        )
        session.commit()

        # Filter by status and keyword
        response = client.get(
            f"/api/staff/reservations/?status=pending&keyword=Test&date_from={today.isoformat()}",
            headers=auth_headers_staff,
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert all(r["status"] == "pending" for r in data)


class TestReservationDetails:
    """Tests for reservation details endpoint"""

    def test_get_reservation_details(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test getting detailed reservation information"""
        establishment = EstablishmentFactory(session=session)
        test_client = ClientFactory(
            session=session, full_name="Test Client", email="test@example.com"
        )
        test_table = TableFactory(session=session, establishment=establishment, name="Table 1")

        reservation = ReservationFactory(
            session=session,
            establishment=establishment,
            client=test_client,
            table=test_table,
            status="accepted",
        )
        session.commit()

        response = client.get(
            f"/api/staff/reservations/{reservation.uuid}/details", headers=auth_headers_staff
        )
        assert response.status_code == 200
        data = response.json()

        # Check reservation details
        assert data["reservation"]["reference"] == reservation.reference
        assert data["reservation"]["status"] == "accepted"

        # Check client details
        assert data["client"]["full_name"] == "Test Client"
        assert data["client"]["email"] == "test@example.com"

        # Check table info
        assert data["table"] is not None
        assert data["table"]["name"] == "Table 1"

    def test_get_reservation_details_with_client_history(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test that client history is included in reservation details"""
        establishment = EstablishmentFactory(session=session)
        test_client = ClientFactory(session=session)

        # Create multiple reservations for the client
        ReservationFactory(
            session=session, establishment=establishment, client=test_client, status="accepted"
        )
        ReservationFactory(
            session=session, establishment=establishment, client=test_client, status="canceled"
        )
        ReservationFactory(
            session=session, establishment=establishment, client=test_client, status="refused"
        )
        current_reservation = ReservationFactory(
            session=session, establishment=establishment, client=test_client, status="pending"
        )
        session.commit()

        response = client.get(
            f"/api/staff/reservations/{current_reservation.uuid}/details",
            headers=auth_headers_staff,
        )
        assert response.status_code == 200
        data = response.json()

        # Check client history
        assert data["client"]["total_accepted"] == 1
        assert data["client"]["total_canceled"] == 1
        assert data["client"]["total_refused"] == 1

    def test_get_reservation_details_not_found(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test getting details for non-existent reservation"""
        import uuid

        fake_uuid = uuid.uuid4()

        response = client.get(
            f"/api/staff/reservations/{fake_uuid}/details", headers=auth_headers_staff
        )
        assert response.status_code == 404


class TestAvailableTables:
    """Tests for available tables endpoint"""

    def test_get_available_tables(self, client: TestClient, session: Session, auth_headers_staff):
        """Test getting available tables for a reservation"""
        establishment = EstablishmentFactory(session=session)
        zone = ZoneFactory(session=session, establishment=establishment, name="Terrace")

        # Create tables with different capacities
        TableFactory(
            session=session,
            establishment=establishment,
            zone=zone,
            name="Table 1",
            min_capacity=2,
            max_capacity=4,
            is_available=True,
        )
        TableFactory(
            session=session,
            establishment=establishment,
            zone=zone,
            name="Table 2",
            min_capacity=4,
            max_capacity=6,
            is_available=True,
        )
        session.commit()

        # Request available tables for 3 guests
        response = client.post(
            "/api/staff/reservations/available-tables",
            headers=auth_headers_staff,
            json={
                "reservation_date": date.today().isoformat(),
                "reservation_time": "19:00",
                "number_of_guests": 3,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1  # At least one table can accommodate 3 guests

    def test_available_tables_excludes_occupied(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test that occupied tables are excluded from available tables"""
        establishment = EstablishmentFactory(session=session)
        test_date = date.today()

        table1 = TableFactory(
            session=session,
            establishment=establishment,
            name="Table 1",
            min_capacity=2,
            max_capacity=4,
            is_available=True,
        )
        TableFactory(
            session=session,
            establishment=establishment,
            name="Table 2",
            min_capacity=2,
            max_capacity=4,
            is_available=True,
        )

        # Create a reservation that occupies table1
        ReservationFactory(
            session=session,
            establishment=establishment,
            table=table1,
            reservation_date=test_date,
            reservation_time=time(19, 0),
            status="accepted",
        )
        session.commit()

        # Request available tables
        response = client.post(
            "/api/staff/reservations/available-tables",
            headers=auth_headers_staff,
            json={
                "reservation_date": test_date.isoformat(),
                "reservation_time": "19:00",
                "number_of_guests": 3,
            },
        )
        assert response.status_code == 200
        data = response.json()

        # Only Table 2 should be returned (Table 1 is occupied)
        # The service now only returns available tables, not all tables
        assert len(data) == 1
        table2_data = next((t for t in data if t["name"] == "Table 2"), None)
        assert table2_data is not None
        assert table2_data["is_currently_available"] is True

        # Verify Table 1 is NOT in the results
        table1_data = next((t for t in data if t["name"] == "Table 1"), None)
        assert table1_data is None

    def test_available_tables_filters_by_capacity(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test that tables are filtered by guest capacity"""
        establishment = EstablishmentFactory(session=session)

        # Create tables with different capacities
        TableFactory(
            session=session,
            establishment=establishment,
            name="Small Table",
            min_capacity=1,
            max_capacity=2,
            is_available=True,
        )
        TableFactory(
            session=session,
            establishment=establishment,
            name="Large Table",
            min_capacity=4,
            max_capacity=8,
            is_available=True,
        )
        session.commit()

        # Request for 6 guests - only large table should be returned
        response = client.post(
            "/api/staff/reservations/available-tables",
            headers=auth_headers_staff,
            json={
                "reservation_date": date.today().isoformat(),
                "reservation_time": "19:00",
                "number_of_guests": 6,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Large Table"
