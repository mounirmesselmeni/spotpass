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


def extract_items(response_json):
    """Helper to extract items from paginated response"""
    if isinstance(response_json, dict) and "items" in response_json:
        return response_json["items"]
    return response_json


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
        response = client.get(
            "/api/staff/reservations/?status_filter=pending", headers=auth_headers_staff
        )
        assert response.status_code == 200
        data = extract_items(response.json())
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
        data = extract_items(response.json())
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
        data = extract_items(response.json())
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
        data = extract_items(response.json())
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
        data = extract_items(response.json())
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
        data = extract_items(response.json())
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
            f"/api/staff/reservations/?status_filter=pending&keyword=Test&date_from={today.isoformat()}",
            headers=auth_headers_staff,
        )
        assert response.status_code == 200
        data = extract_items(response.json())
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


class TestReservationSorting:
    """Tests for reservation list sorting"""

    def test_sort_by_datetime_desc_default(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test default sorting by datetime descending"""
        from datetime import time

        establishment = EstablishmentFactory(session=session)
        today = date.today()

        # Create reservations with different dates and times
        ReservationFactory(
            session=session,
            establishment=establishment,
            reservation_date=today,
            reservation_time=time(18, 0),
        )
        ReservationFactory(
            session=session,
            establishment=establishment,
            reservation_date=today,
            reservation_time=time(20, 0),
        )
        res3 = ReservationFactory(
            session=session,
            establishment=establishment,
            reservation_date=today + timedelta(days=1),
            reservation_time=time(19, 0),
        )
        session.commit()

        response = client.get("/api/staff/reservations/", headers=auth_headers_staff)
        assert response.status_code == 200
        data = extract_items(response.json())

        # Should be sorted by datetime descending (newest first)
        # res3 (tomorrow) should be first
        assert data[0]["reference"] == res3.reference

    def test_sort_by_datetime_asc(self, client: TestClient, session: Session, auth_headers_staff):
        """Test sorting by datetime ascending"""
        from datetime import time

        establishment = EstablishmentFactory(session=session)
        today = date.today()

        res1 = ReservationFactory(
            session=session,
            establishment=establishment,
            reservation_date=today,
            reservation_time=time(18, 0),
        )
        res2 = ReservationFactory(
            session=session,
            establishment=establishment,
            reservation_date=today + timedelta(days=1),
            reservation_time=time(19, 0),
        )
        session.commit()

        response = client.get(
            "/api/staff/reservations/?sort_by=datetime&sort_order=asc",
            headers=auth_headers_staff,
        )
        assert response.status_code == 200
        data = extract_items(response.json())

        # Should be sorted ascending (oldest first)
        assert data[0]["reference"] == res1.reference
        assert data[1]["reference"] == res2.reference

    def test_sort_by_client_name(self, client: TestClient, session: Session, auth_headers_staff):
        """Test sorting by client name"""
        establishment = EstablishmentFactory(session=session)

        client_a = ClientFactory(session=session, full_name="Alice Smith")
        client_z = ClientFactory(session=session, full_name="Zoe Brown")
        client_m = ClientFactory(session=session, full_name="Michael Johnson")

        ReservationFactory(session=session, establishment=establishment, client=client_a)
        ReservationFactory(session=session, establishment=establishment, client=client_z)
        ReservationFactory(session=session, establishment=establishment, client=client_m)
        session.commit()

        response = client.get(
            "/api/staff/reservations/?sort_by=client_name&sort_order=asc",
            headers=auth_headers_staff,
        )
        assert response.status_code == 200
        data = extract_items(response.json())

        # Should be sorted alphabetically by client name
        assert data[0]["client"]["full_name"] == "Alice Smith"
        assert data[1]["client"]["full_name"] == "Michael Johnson"
        assert data[2]["client"]["full_name"] == "Zoe Brown"

    def test_sort_by_guests(self, client: TestClient, session: Session, auth_headers_staff):
        """Test sorting by number of guests"""
        establishment = EstablishmentFactory(session=session)

        ReservationFactory(session=session, establishment=establishment, number_of_guests=2)
        ReservationFactory(session=session, establishment=establishment, number_of_guests=6)
        ReservationFactory(session=session, establishment=establishment, number_of_guests=4)
        session.commit()

        response = client.get(
            "/api/staff/reservations/?sort_by=guests&sort_order=asc", headers=auth_headers_staff
        )
        assert response.status_code == 200
        data = extract_items(response.json())

        # Should be sorted by guests ascending
        assert data[0]["number_of_guests"] == 2
        assert data[1]["number_of_guests"] == 4
        assert data[2]["number_of_guests"] == 6

    def test_sort_by_status(self, client: TestClient, session: Session, auth_headers_staff):
        """Test sorting by status"""
        establishment = EstablishmentFactory(session=session)

        ReservationFactory(session=session, establishment=establishment, status="pending")
        ReservationFactory(session=session, establishment=establishment, status="accepted")
        ReservationFactory(session=session, establishment=establishment, status="canceled")
        session.commit()

        response = client.get(
            "/api/staff/reservations/?sort_by=status&sort_order=asc", headers=auth_headers_staff
        )
        assert response.status_code == 200
        data = extract_items(response.json())

        # Should be sorted alphabetically by status
        assert data[0]["status"] == "accepted"
        assert data[1]["status"] == "canceled"
        assert data[2]["status"] == "pending"

    def test_sort_by_created_at(self, client: TestClient, session: Session, auth_headers_staff):
        """Test sorting by created_at"""
        establishment = EstablishmentFactory(session=session)

        # Create reservations with a small delay to ensure different created_at times
        import time

        ReservationFactory(session=session, establishment=establishment, reference="REF001")
        time.sleep(0.01)  # Small delay
        ReservationFactory(session=session, establishment=establishment, reference="REF002")
        time.sleep(0.01)  # Small delay
        ReservationFactory(session=session, establishment=establishment, reference="REF003")
        session.commit()

        response = client.get(
            "/api/staff/reservations/?sort_by=created_at&sort_order=asc", headers=auth_headers_staff
        )
        assert response.status_code == 200
        data = extract_items(response.json())

        # Should be sorted by created_at ascending
        assert data[0]["reference"] == "REF001"
        assert data[1]["reference"] == "REF002"
        assert data[2]["reference"] == "REF003"

        # Test descending order
        response = client.get(
            "/api/staff/reservations/?sort_by=created_at&sort_order=desc",
            headers=auth_headers_staff,
        )
        assert response.status_code == 200
        data = extract_items(response.json())

        # Should be sorted by created_at descending
        assert data[0]["reference"] == "REF003"
        assert data[1]["reference"] == "REF002"
        assert data[2]["reference"] == "REF001"

    def test_invalid_sort_field(self, client: TestClient, session: Session, auth_headers_staff):
        """Test that invalid sort field returns error"""
        response = client.get(
            "/api/staff/reservations/?sort_by=invalid_field", headers=auth_headers_staff
        )
        assert response.status_code == 400

    def test_invalid_sort_order(self, client: TestClient, session: Session, auth_headers_staff):
        """Test that invalid sort order returns error"""
        response = client.get(
            "/api/staff/reservations/?sort_order=invalid", headers=auth_headers_staff
        )
        assert response.status_code == 400


class TestPaginationNextPreviousURLs:
    """Tests for next/previous URL generation in pagination"""

    def test_first_page_has_next_no_previous(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test that first page has next URL but no previous URL"""
        establishment = EstablishmentFactory(session=session)

        # Create 150 reservations to ensure multiple pages
        for _ in range(150):
            ReservationFactory(session=session, establishment=establishment)
        session.commit()

        response = client.get(
            "/api/staff/reservations/?page=1&page_size=100", headers=auth_headers_staff
        )
        assert response.status_code == 200
        data = response.json()

        assert data["page"] == 1
        assert data["total"] == 150
        assert data["total_pages"] == 2
        assert data["next"] is not None
        assert "/api/staff/reservations/" in data["next"]
        assert "page=2" in data["next"]
        assert data["previous"] is None

    def test_middle_page_has_both_urls(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test that middle page has both next and previous URLs"""
        establishment = EstablishmentFactory(session=session)

        # Create 250 reservations for 3 pages
        for _ in range(250):
            ReservationFactory(session=session, establishment=establishment)
        session.commit()

        response = client.get(
            "/api/staff/reservations/?page=2&page_size=100", headers=auth_headers_staff
        )
        assert response.status_code == 200
        data = response.json()

        assert data["page"] == 2
        assert data["total_pages"] == 3
        assert data["next"] is not None
        assert "page=3" in data["next"]
        assert data["previous"] is not None
        assert "page=1" in data["previous"]

    def test_last_page_has_previous_no_next(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test that last page has previous URL but no next URL"""
        establishment = EstablishmentFactory(session=session)

        # Create 150 reservations for 2 pages
        for _ in range(150):
            ReservationFactory(session=session, establishment=establishment)
        session.commit()

        response = client.get(
            "/api/staff/reservations/?page=2&page_size=100", headers=auth_headers_staff
        )
        assert response.status_code == 200
        data = response.json()

        assert data["page"] == 2
        assert data["total_pages"] == 2
        assert data["next"] is None
        assert data["previous"] is not None
        assert "page=1" in data["previous"]

    def test_single_page_no_urls(self, client: TestClient, session: Session, auth_headers_staff):
        """Test that single page has no next or previous URLs"""
        establishment = EstablishmentFactory(session=session)

        # Create only 50 reservations (less than page size)
        for _ in range(50):
            ReservationFactory(session=session, establishment=establishment)
        session.commit()

        response = client.get(
            "/api/staff/reservations/?page=1&page_size=100", headers=auth_headers_staff
        )
        assert response.status_code == 200
        data = response.json()

        assert data["page"] == 1
        assert data["total"] == 50
        assert data["total_pages"] == 1
        assert data["next"] is None
        assert data["previous"] is None

    def test_next_url_preserves_filters(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test that next URL preserves filter parameters"""
        establishment = EstablishmentFactory(session=session)

        # Create 150 pending reservations
        for _ in range(150):
            ReservationFactory(session=session, establishment=establishment, status="pending")
        session.commit()

        response = client.get(
            "/api/staff/reservations/?page=1&page_size=100&status_filter=pending&sort_by=guests",
            headers=auth_headers_staff,
        )
        assert response.status_code == 200
        data = response.json()

        assert data["next"] is not None
        assert "status_filter=pending" in data["next"]
        assert "sort_by=guests" in data["next"]
        assert "page=2" in data["next"]
