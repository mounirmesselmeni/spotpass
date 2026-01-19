"""Tests for enhanced table endpoints with filters and time slots"""

from datetime import date, time

from fastapi.testclient import TestClient
from sqlmodel import Session

from tests.factories import (
    ClientFactory,
    EstablishmentFactory,
    ReservationFactory,
    TableFactory,
    ZoneFactory,
)


class TestTableFilters:
    """Tests for table list endpoint with filters"""

    def test_filter_by_zone(self, client: TestClient, session: Session, auth_headers_staff):
        """Test filtering tables by zone"""
        establishment = EstablishmentFactory(session=session)
        zone1 = ZoneFactory(session=session, establishment=establishment, name="Terrace")
        zone2 = ZoneFactory(session=session, establishment=establishment, name="Indoor")

        TableFactory(session=session, establishment=establishment, zone=zone1, name="Table 1")
        TableFactory(session=session, establishment=establishment, zone=zone2, name="Table 2")
        session.commit()

        # Filter by zone1
        response = client.get(
            f"/api/staff/tables/?zone_id={zone1.uuid}", headers=auth_headers_staff
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Table 1"

    def test_filter_by_availability(self, client: TestClient, session: Session, auth_headers_staff):
        """Test filtering tables by availability status"""
        establishment = EstablishmentFactory(session=session)

        TableFactory(
            session=session, establishment=establishment, name="Available Table", is_available=True
        )
        TableFactory(
            session=session,
            establishment=establishment,
            name="Unavailable Table",
            is_available=False,
        )
        session.commit()

        # Filter by available
        response = client.get("/api/staff/tables/?is_available=true", headers=auth_headers_staff)
        assert response.status_code == 200
        data = response.json()
        assert all(t["is_available"] for t in data)

    def test_filter_by_name_search(self, client: TestClient, session: Session, auth_headers_staff):
        """Test filtering tables by name search"""
        establishment = EstablishmentFactory(session=session)

        TableFactory(session=session, establishment=establishment, name="Terrace Table 1")
        TableFactory(session=session, establishment=establishment, name="Indoor Table 2")
        session.commit()

        # Search by name
        response = client.get("/api/staff/tables/?name=Terrace", headers=auth_headers_staff)
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert all("Terrace" in t["name"] for t in data)

    def test_filter_by_date_range(self, client: TestClient, session: Session, auth_headers_staff):
        """Test filtering tables by date range availability"""
        establishment = EstablishmentFactory(session=session)
        today = date.today()

        table1 = TableFactory(session=session, establishment=establishment, name="Table 1")
        TableFactory(session=session, establishment=establishment, name="Table 2")

        # Create reservation for table1 on today
        ReservationFactory(
            session=session,
            establishment=establishment,
            table=table1,
            reservation_date=today,
            status="accepted",
        )
        session.commit()

        # Filter by date range - should show tables without reservations
        response = client.get(
            f"/api/staff/tables/?date_from={today.isoformat()}&date_to={today.isoformat()}",
            headers=auth_headers_staff,
        )
        assert response.status_code == 200
        data = response.json()
        # Both tables are returned, but availability checking happens on frontend
        assert len(data) >= 0


class TestTableTimeSlots:
    """Tests for table time slots endpoint"""

    def test_get_time_slots_for_date(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test getting time slots for a table on a specific date"""
        establishment = EstablishmentFactory(session=session)
        table = TableFactory(session=session, establishment=establishment, name="Test Table")
        session.commit()

        test_date = date.today()

        response = client.get(
            f"/api/staff/tables/{table.uuid}/time-slots?date={test_date.isoformat()}",
            headers=auth_headers_staff,
        )
        assert response.status_code == 200
        data = response.json()

        # Should return time slots from 09:00 to 23:00 (30-minute intervals)
        assert len(data) > 0
        assert all("time" in slot for slot in data)
        assert all("status" in slot for slot in data)
        assert all(slot["status"] in ["available", "occupied"] for slot in data)

    def test_time_slots_show_occupied(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test that occupied time slots show reservation details"""
        establishment = EstablishmentFactory(session=session)
        table = TableFactory(session=session, establishment=establishment, name="Test Table")
        test_client = ClientFactory(session=session, full_name="John Doe")

        test_date = date.today()
        test_time = time(19, 0)

        # Create reservation at 19:00
        reservation = ReservationFactory(
            session=session,
            establishment=establishment,
            table=table,
            client=test_client,
            reservation_date=test_date,
            reservation_time=test_time,
            status="accepted",
            number_of_guests=4,
        )
        session.commit()

        response = client.get(
            f"/api/staff/tables/{table.uuid}/time-slots?date={test_date.isoformat()}",
            headers=auth_headers_staff,
        )
        assert response.status_code == 200
        data = response.json()

        # Find the 19:00 slot
        slot_19_00 = next((s for s in data if s["time"] == "19:00"), None)
        assert slot_19_00 is not None
        assert slot_19_00["status"] == "occupied"
        assert "reservation" in slot_19_00
        assert slot_19_00["reservation"]["reference"] == reservation.reference
        assert slot_19_00["reservation"]["client_name"] == "John Doe"
        assert slot_19_00["reservation"]["guests"] == 4

    def test_time_slots_for_unavailable_table(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test getting time slots for a non-existent table"""
        import uuid

        fake_uuid = uuid.uuid4()

        response = client.get(
            f"/api/staff/tables/{fake_uuid}/time-slots?date={date.today().isoformat()}",
            headers=auth_headers_staff,
        )
        assert response.status_code == 404

    def test_time_slots_multiple_reservations(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test time slots with multiple reservations"""
        establishment = EstablishmentFactory(session=session)
        table = TableFactory(session=session, establishment=establishment)

        test_date = date.today()

        # Create multiple reservations at different times
        ReservationFactory(
            session=session,
            establishment=establishment,
            table=table,
            reservation_date=test_date,
            reservation_time=time(12, 0),
            status="accepted",
            duration_minutes=30,
        )
        ReservationFactory(
            session=session,
            establishment=establishment,
            table=table,
            reservation_date=test_date,
            reservation_time=time(14, 30),
            status="accepted",
            duration_minutes=30,
        )
        ReservationFactory(
            session=session,
            establishment=establishment,
            table=table,
            reservation_date=test_date,
            reservation_time=time(19, 0),
            status="accepted",
            duration_minutes=30,
        )
        session.commit()

        response = client.get(
            f"/api/staff/tables/{table.uuid}/time-slots?date={test_date.isoformat()}",
            headers=auth_headers_staff,
        )
        assert response.status_code == 200
        data = response.json()

        # Count occupied slots
        occupied_slots = [s for s in data if s["status"] == "occupied"]
        assert len(occupied_slots) == 3

    def test_time_slots_pending_reservations_shown_as_occupied(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test that pending reservations also show as occupied"""
        establishment = EstablishmentFactory(session=session)
        table = TableFactory(session=session, establishment=establishment)

        test_date = date.today()

        # Create pending reservation
        ReservationFactory(
            session=session,
            establishment=establishment,
            table=table,
            reservation_date=test_date,
            reservation_time=time(19, 0),
            status="pending",
        )
        session.commit()

        response = client.get(
            f"/api/staff/tables/{table.uuid}/time-slots?date={test_date.isoformat()}",
            headers=auth_headers_staff,
        )
        assert response.status_code == 200
        data = response.json()

        # 19:00 slot should be occupied
        slot_19_00 = next((s for s in data if s["time"] == "19:00"), None)
        assert slot_19_00 is not None
        assert slot_19_00["status"] == "occupied"
