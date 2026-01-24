"""Additional tests to improve reservations routes coverage"""

from datetime import date, time

from fastapi.testclient import TestClient
from sqlmodel import Session

from reservations.models import ReservationStatus
from tests.factories import (
    ClientFactory,
    EstablishmentFactory,
    ReservationFactory,
    TableFactory,
)


class TestReservationCreationCoverage:
    """Tests for reservation creation endpoint to improve coverage"""

    def test_create_reservation_without_table(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test creating a reservation without table assignment"""
        establishment = EstablishmentFactory(session=session)
        test_client = ClientFactory(session=session, establishment=establishment)
        session.commit()

        response = client.post(
            "/api/staff/reservations/",
            headers=auth_headers_staff,
            json={
                "client_id": str(test_client.uuid),
                "reservation_date": date.today().isoformat(),
                "reservation_time": "19:00:00",
                "number_of_guests": 4,
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["number_of_guests"] == 4

    def test_create_reservation_with_table_conflict(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test creating a reservation with a table that's already booked"""
        establishment = EstablishmentFactory(session=session)
        test_client = ClientFactory(session=session, establishment=establishment)
        table = TableFactory(session=session, establishment=establishment)

        # Create existing reservation
        ReservationFactory(
            session=session,
            establishment=establishment,
            client=test_client,
            table=table,
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            status=ReservationStatus.ACCEPTED,
            duration_minutes=120,
        )
        session.commit()

        # Try to create conflicting reservation
        client2 = ClientFactory(session=session, establishment=establishment)
        session.commit()

        response = client.post(
            "/api/staff/reservations/",
            headers=auth_headers_staff,
            json={
                "client_id": str(client2.uuid),
                "reservation_date": date.today().isoformat(),
                "reservation_time": "19:30:00",
                "number_of_guests": 2,
                "table_id": str(table.uuid),
            },
        )
        assert response.status_code == 409
        assert "already reserved" in response.json()["detail"].lower()

    def test_create_reservation_with_table_not_available(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test creating reservation with disabled table"""
        establishment = EstablishmentFactory(session=session)
        test_client = ClientFactory(session=session, establishment=establishment)
        table = TableFactory(session=session, establishment=establishment, is_on_service=False)
        session.commit()

        response = client.post(
            "/api/staff/reservations/",
            headers=auth_headers_staff,
            json={
                "client_id": str(test_client.uuid),
                "reservation_date": date.today().isoformat(),
                "reservation_time": "19:00:00",
                "number_of_guests": 2,
                "table_id": str(table.uuid),
            },
        )
        assert response.status_code == 409
        assert "not currently available" in response.json()["detail"].lower()

    def test_create_reservation_with_invalid_client(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test creating reservation with non-existent client"""
        import uuid

        # Need to create establishment first since auth checks it
        EstablishmentFactory(session=session)
        session.commit()

        fake_uuid = uuid.uuid4()

        response = client.post(
            "/api/staff/reservations/",
            headers=auth_headers_staff,
            json={
                "client_id": str(fake_uuid),
                "reservation_date": date.today().isoformat(),
                "reservation_time": "19:00:00",
                "number_of_guests": 2,
            },
        )
        assert response.status_code == 404
        assert "client not found" in response.json()["detail"].lower()

    def test_create_reservation_with_invalid_table(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test creating reservation with non-existent table"""
        import uuid

        establishment = EstablishmentFactory(session=session)
        test_client = ClientFactory(session=session, establishment=establishment)
        session.commit()

        fake_table_uuid = uuid.uuid4()

        response = client.post(
            "/api/staff/reservations/",
            headers=auth_headers_staff,
            json={
                "client_id": str(test_client.uuid),
                "reservation_date": date.today().isoformat(),
                "reservation_time": "19:00:00",
                "number_of_guests": 2,
                "table_id": str(fake_table_uuid),
                "duration_minutes": 120,
            },
        )
        assert response.status_code == 404
        assert "table not found" in response.json()["detail"].lower()


class TestReservationUpdateCoverage:
    """Tests for reservation update endpoint to improve coverage"""

    def test_update_reservation_table_and_time_with_conflict(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test updating reservation with conflicting table/time"""
        establishment = EstablishmentFactory(session=session)
        test_client = ClientFactory(session=session, establishment=establishment)
        table1 = TableFactory(session=session, establishment=establishment)
        table2 = TableFactory(session=session, establishment=establishment)

        # Create two reservations
        reservation1 = ReservationFactory(
            session=session,
            establishment=establishment,
            client=test_client,
            table=table1,
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            status=ReservationStatus.PENDING,
        )

        # Another client has table2 booked
        client2 = ClientFactory(session=session, establishment=establishment)
        ReservationFactory(
            session=session,
            establishment=establishment,
            client=client2,
            table=table2,
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            status=ReservationStatus.ACCEPTED,
            duration_minutes=120,
        )
        session.commit()

        # Try to update reservation1 to table2 at same time (should fail)
        response = client.patch(
            f"/api/staff/reservations/{reservation1.uuid}",
            headers=auth_headers_staff,
            json={
                "table_id": str(table2.uuid),
                "reservation_time": "19:30:00",
            },
        )
        assert response.status_code == 409

    def test_update_reservation_only_note(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test updating reservation with only note (no validation needed)"""
        establishment = EstablishmentFactory(session=session)
        test_client = ClientFactory(session=session, establishment=establishment)
        reservation = ReservationFactory(
            session=session,
            establishment=establishment,
            client=test_client,
            status=ReservationStatus.PENDING,
        )
        session.commit()

        response = client.patch(
            f"/api/staff/reservations/{reservation.uuid}",
            headers=auth_headers_staff,
            json={"note": "Updated note"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["note"] == "Updated note"

    def test_update_reservation_to_accepted(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test updating reservation status to accepted"""
        establishment = EstablishmentFactory(session=session)
        test_client = ClientFactory(session=session, establishment=establishment)
        reservation = ReservationFactory(
            session=session,
            establishment=establishment,
            client=test_client,
            status=ReservationStatus.PENDING,
        )
        session.commit()

        response = client.patch(
            f"/api/staff/reservations/{reservation.uuid}",
            headers=auth_headers_staff,
            json={"status": "accepted"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "accepted"
        assert data["accepted_at"] is not None

    def test_update_reservation_to_refused(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test updating reservation status to refused"""
        establishment = EstablishmentFactory(session=session)
        test_client = ClientFactory(session=session, establishment=establishment)
        reservation = ReservationFactory(
            session=session,
            establishment=establishment,
            client=test_client,
            status=ReservationStatus.PENDING,
        )
        session.commit()

        response = client.patch(
            f"/api/staff/reservations/{reservation.uuid}",
            headers=auth_headers_staff,
            json={"status": "refused"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "refused"
        assert data["refused_at"] is not None

    def test_update_reservation_to_canceled(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test updating reservation status to canceled"""
        establishment = EstablishmentFactory(session=session)
        test_client = ClientFactory(session=session, establishment=establishment)
        reservation = ReservationFactory(
            session=session,
            establishment=establishment,
            client=test_client,
            status=ReservationStatus.ACCEPTED,
        )
        session.commit()

        response = client.patch(
            f"/api/staff/reservations/{reservation.uuid}",
            headers=auth_headers_staff,
            json={"status": "canceled"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "canceled"
        assert data["canceled_at"] is not None


class TestAvailableTablesErrorHandling:
    """Tests for available tables endpoint error handling"""

    def test_available_tables_invalid_time_format(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test available tables with invalid time format"""
        response = client.post(
            "/api/staff/reservations/available-tables",
            headers=auth_headers_staff,
            json={
                "reservation_date": date.today().isoformat(),
                "reservation_time": "invalid-time",
                "number_of_guests": 2,
            },
        )
        assert response.status_code == 400
        assert "invalid time format" in response.json()["detail"].lower()
