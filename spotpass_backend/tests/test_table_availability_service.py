"""
Comprehensive tests for TableAvailabilityService.

Tests cover:
- Basic availability checking
- Double booking prevention
- Exact boundary conditions (reservation ending when another starts)
- Overnight reservations (22:00 to 02:00 next day)
- Multi-day edge cases
- Duration handling
- Conflict detection with multiple reservations
"""

from datetime import date, time, timedelta

import pytest
from sqlmodel import Session

from reservations.models import ReservationStatus
from reservations.services import TableAvailabilityService
from tests.factories import (
    AccountFactory,
    ClientFactory,
    EstablishmentFactory,
    ReservationFactory,
    TableFactory,
)


class TestTableAvailabilityService:
    """Test suite for TableAvailabilityService"""

    @pytest.fixture
    def service(self, session: Session):
        """Create a TableAvailabilityService instance"""
        return TableAvailabilityService(session)

    @pytest.fixture
    def setup_data(self, session: Session):
        """Setup common test data"""
        account = AccountFactory(session=session)
        establishment = EstablishmentFactory(session=session, account=account)
        client = ClientFactory(session=session, establishment=establishment)
        table = TableFactory(
            session=session,
            establishment=establishment,
            name="Test Table",
            min_capacity=2,
            max_capacity=4,
            is_available=True,
        )
        session.commit()
        return {
            "account": account,
            "establishment": establishment,
            "client": client,
            "table": table,
        }

    def test_is_table_available_no_reservations(
        self, service: TableAvailabilityService, setup_data
    ):
        """Test that a table with no reservations is available"""
        table = setup_data["table"]
        test_date = date.today()
        test_time = time(19, 0)

        is_available = service.is_table_available(
            table_id=table.id,
            reservation_date=test_date,
            reservation_time=test_time,
            duration_minutes=120,
        )

        assert is_available is True

    def test_is_table_available_different_date(
        self, service: TableAvailabilityService, setup_data, session: Session
    ):
        """Test that a table is available on a different date"""
        table = setup_data["table"]
        client = setup_data["client"]
        establishment = setup_data["establishment"]

        # Create reservation for today
        ReservationFactory(
            session=session,
            table=table,
            client=client,
            establishment=establishment,
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            status=ReservationStatus.ACCEPTED,
            duration_minutes=120,
        )
        session.commit()

        # Check availability for tomorrow
        is_available = service.is_table_available(
            table_id=table.id,
            reservation_date=date.today() + timedelta(days=1),
            reservation_time=time(19, 0),
            duration_minutes=120,
        )

        assert is_available is True

    def test_is_table_available_different_time_no_overlap(
        self, service: TableAvailabilityService, setup_data, session: Session
    ):
        """Test that a table is available at different time with no overlap"""
        table = setup_data["table"]
        client = setup_data["client"]
        establishment = setup_data["establishment"]

        # Create reservation 18:00-20:00
        ReservationFactory(
            session=session,
            table=table,
            client=client,
            establishment=establishment,
            reservation_date=date.today(),
            reservation_time=time(18, 0),
            status=ReservationStatus.ACCEPTED,
            duration_minutes=120,
        )
        session.commit()

        # Check availability 20:00-22:00 (exact boundary, should be available)
        is_available = service.is_table_available(
            table_id=table.id,
            reservation_date=date.today(),
            reservation_time=time(20, 0),
            duration_minutes=120,
        )

        assert is_available is True, (
            "Reservation ending at 20:00 should not conflict with one starting at 20:00"
        )

    def test_is_table_unavailable_exact_overlap(
        self, service: TableAvailabilityService, setup_data, session: Session
    ):
        """Test that a table is unavailable when times exactly overlap"""
        table = setup_data["table"]
        client = setup_data["client"]
        establishment = setup_data["establishment"]

        # Create reservation 19:00-21:00
        ReservationFactory(
            session=session,
            table=table,
            client=client,
            establishment=establishment,
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            status=ReservationStatus.ACCEPTED,
            duration_minutes=120,
        )
        session.commit()

        # Try to book the same time
        is_available = service.is_table_available(
            table_id=table.id,
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            duration_minutes=120,
        )

        assert is_available is False

    def test_is_table_unavailable_partial_overlap_start(
        self, service: TableAvailabilityService, setup_data, session: Session
    ):
        """Test that a table is unavailable when new reservation overlaps the start of existing one"""
        table = setup_data["table"]
        client = setup_data["client"]
        establishment = setup_data["establishment"]

        # Create reservation 19:00-21:00
        ReservationFactory(
            session=session,
            table=table,
            client=client,
            establishment=establishment,
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            status=ReservationStatus.ACCEPTED,
            duration_minutes=120,
        )
        session.commit()

        # Try to book 18:00-20:00 (overlaps with existing 19:00-21:00)
        is_available = service.is_table_available(
            table_id=table.id,
            reservation_date=date.today(),
            reservation_time=time(18, 0),
            duration_minutes=120,
        )

        assert is_available is False

    def test_is_table_unavailable_partial_overlap_end(
        self, service: TableAvailabilityService, setup_data, session: Session
    ):
        """Test that a table is unavailable when new reservation overlaps the end of existing one"""
        table = setup_data["table"]
        client = setup_data["client"]
        establishment = setup_data["establishment"]

        # Create reservation 18:00-20:00
        ReservationFactory(
            session=session,
            table=table,
            client=client,
            establishment=establishment,
            reservation_date=date.today(),
            reservation_time=time(18, 0),
            status=ReservationStatus.ACCEPTED,
            duration_minutes=120,
        )
        session.commit()

        # Try to book 19:00-21:00 (overlaps with existing 18:00-20:00)
        is_available = service.is_table_available(
            table_id=table.id,
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            duration_minutes=120,
        )

        assert is_available is False

    def test_is_table_unavailable_encompasses_existing(
        self, service: TableAvailabilityService, setup_data, session: Session
    ):
        """Test that a table is unavailable when new reservation completely encompasses existing one"""
        table = setup_data["table"]
        client = setup_data["client"]
        establishment = setup_data["establishment"]

        # Create reservation 19:00-20:00 (short reservation)
        ReservationFactory(
            session=session,
            table=table,
            client=client,
            establishment=establishment,
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            status=ReservationStatus.ACCEPTED,
            duration_minutes=60,
        )
        session.commit()

        # Try to book 18:00-21:00 (encompasses existing 19:00-20:00)
        is_available = service.is_table_available(
            table_id=table.id,
            reservation_date=date.today(),
            reservation_time=time(18, 0),
            duration_minutes=180,
        )

        assert is_available is False

    def test_is_table_unavailable_within_existing(
        self, service: TableAvailabilityService, setup_data, session: Session
    ):
        """Test that a table is unavailable when new reservation is within existing one"""
        table = setup_data["table"]
        client = setup_data["client"]
        establishment = setup_data["establishment"]

        # Create reservation 18:00-22:00 (long reservation)
        ReservationFactory(
            session=session,
            table=table,
            client=client,
            establishment=establishment,
            reservation_date=date.today(),
            reservation_time=time(18, 0),
            status=ReservationStatus.ACCEPTED,
            duration_minutes=240,
        )
        session.commit()

        # Try to book 19:00-20:00 (within existing 18:00-22:00)
        is_available = service.is_table_available(
            table_id=table.id,
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            duration_minutes=60,
        )

        assert is_available is False

    def test_overnight_reservation_conflicts_with_late_night(
        self, service: TableAvailabilityService, setup_data, session: Session
    ):
        """Test that an overnight reservation (22:00-02:00) conflicts with late night booking"""
        table = setup_data["table"]
        client = setup_data["client"]
        establishment = setup_data["establishment"]

        # Create overnight reservation 22:00-02:00 (4 hours, extends to next day)
        ReservationFactory(
            session=session,
            table=table,
            client=client,
            establishment=establishment,
            reservation_date=date.today(),
            reservation_time=time(22, 0),
            status=ReservationStatus.ACCEPTED,
            duration_minutes=240,  # 4 hours -> extends to 02:00 next day
        )
        session.commit()

        # Try to book 23:00-01:00 (conflicts with existing 22:00-02:00)
        is_available = service.is_table_available(
            table_id=table.id,
            reservation_date=date.today(),
            reservation_time=time(23, 0),
            duration_minutes=120,
        )

        assert is_available is False

    def test_overnight_reservation_conflicts_with_early_morning_next_day(
        self, service: TableAvailabilityService, setup_data, session: Session
    ):
        """Test that an overnight reservation conflicts with early morning booking next day"""
        table = setup_data["table"]
        client = setup_data["client"]
        establishment = setup_data["establishment"]

        # Create overnight reservation 22:00-02:00
        ReservationFactory(
            session=session,
            table=table,
            client=client,
            establishment=establishment,
            reservation_date=date.today(),
            reservation_time=time(22, 0),
            status=ReservationStatus.ACCEPTED,
            duration_minutes=240,
        )
        session.commit()

        # Try to book 01:00-03:00 NEXT DAY (conflicts with existing overnight 22:00-02:00)
        is_available = service.is_table_available(
            table_id=table.id,
            reservation_date=date.today() + timedelta(days=1),
            reservation_time=time(1, 0),
            duration_minutes=120,
        )

        assert is_available is False

    def test_early_morning_reservation_next_day_no_conflict(
        self, service: TableAvailabilityService, setup_data, session: Session
    ):
        """Test that early morning reservation next day doesn't conflict with overnight that ended"""
        table = setup_data["table"]
        client = setup_data["client"]
        establishment = setup_data["establishment"]

        # Create overnight reservation 22:00-02:00
        ReservationFactory(
            session=session,
            table=table,
            client=client,
            establishment=establishment,
            reservation_date=date.today(),
            reservation_time=time(22, 0),
            status=ReservationStatus.ACCEPTED,
            duration_minutes=240,
        )
        session.commit()

        # Try to book 02:00-04:00 NEXT DAY (should be available, exact boundary)
        is_available = service.is_table_available(
            table_id=table.id,
            reservation_date=date.today() + timedelta(days=1),
            reservation_time=time(2, 0),
            duration_minutes=120,
        )

        assert is_available is True

    def test_canceled_reservation_does_not_block(
        self, service: TableAvailabilityService, setup_data, session: Session
    ):
        """Test that canceled reservations don't block availability"""
        table = setup_data["table"]
        client = setup_data["client"]
        establishment = setup_data["establishment"]

        # Create CANCELED reservation
        ReservationFactory(
            session=session,
            table=table,
            client=client,
            establishment=establishment,
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            status=ReservationStatus.CANCELED,
            duration_minutes=120,
        )
        session.commit()

        # Try to book the same time (should be available)
        is_available = service.is_table_available(
            table_id=table.id,
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            duration_minutes=120,
        )

        assert is_available is True

    def test_refused_reservation_does_not_block(
        self, service: TableAvailabilityService, setup_data, session: Session
    ):
        """Test that refused reservations don't block availability"""
        table = setup_data["table"]
        client = setup_data["client"]
        establishment = setup_data["establishment"]

        # Create REFUSED reservation
        ReservationFactory(
            session=session,
            table=table,
            client=client,
            establishment=establishment,
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            status=ReservationStatus.REFUSED,
            duration_minutes=120,
        )
        session.commit()

        # Try to book the same time (should be available)
        is_available = service.is_table_available(
            table_id=table.id,
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            duration_minutes=120,
        )

        assert is_available is True

    def test_pending_reservation_blocks_availability(
        self, service: TableAvailabilityService, setup_data, session: Session
    ):
        """Test that pending reservations block availability"""
        table = setup_data["table"]
        client = setup_data["client"]
        establishment = setup_data["establishment"]

        # Create PENDING reservation
        ReservationFactory(
            session=session,
            table=table,
            client=client,
            establishment=establishment,
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            status=ReservationStatus.PENDING,
            duration_minutes=120,
        )
        session.commit()

        # Try to book the same time (should be unavailable)
        is_available = service.is_table_available(
            table_id=table.id,
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            duration_minutes=120,
        )

        assert is_available is False

    def test_exclude_reservation_id_allows_update(
        self, service: TableAvailabilityService, setup_data, session: Session
    ):
        """Test that excluding a reservation ID allows updating its time"""
        table = setup_data["table"]
        client = setup_data["client"]
        establishment = setup_data["establishment"]

        # Create reservation 19:00-21:00
        reservation = ReservationFactory(
            session=session,
            table=table,
            client=client,
            establishment=establishment,
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            status=ReservationStatus.ACCEPTED,
            duration_minutes=120,
        )
        session.commit()

        # Check if we can "update" to 19:30-21:30 (should be available when excluding itself)
        is_available = service.is_table_available(
            table_id=table.id,
            reservation_date=date.today(),
            reservation_time=time(19, 30),
            duration_minutes=120,
            exclude_reservation_id=reservation.id,
        )

        assert is_available is True

    def test_get_conflicting_reservations_finds_one(
        self, service: TableAvailabilityService, setup_data, session: Session
    ):
        """Test that get_conflicting_reservations finds conflicts"""
        table = setup_data["table"]
        client = setup_data["client"]
        establishment = setup_data["establishment"]

        # Create reservation 19:00-21:00
        existing = ReservationFactory(
            session=session,
            table=table,
            client=client,
            establishment=establishment,
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            status=ReservationStatus.ACCEPTED,
            duration_minutes=120,
        )
        session.commit()

        # Check for conflicts with 18:00-20:00
        conflicts = service.get_conflicting_reservations(
            table_id=table.id,
            reservation_date=date.today(),
            reservation_time=time(18, 0),
            duration_minutes=120,
        )

        assert len(conflicts) == 1
        assert conflicts[0].id == existing.id

    def test_get_conflicting_reservations_finds_multiple(
        self, service: TableAvailabilityService, setup_data, session: Session
    ):
        """Test that get_conflicting_reservations finds multiple conflicts"""
        table = setup_data["table"]
        client = setup_data["client"]
        establishment = setup_data["establishment"]

        # Create two reservations
        res1 = ReservationFactory(
            session=session,
            table=table,
            client=client,
            establishment=establishment,
            reservation_date=date.today(),
            reservation_time=time(18, 0),
            status=ReservationStatus.ACCEPTED,
            duration_minutes=90,  # 18:00-19:30
        )
        res2 = ReservationFactory(
            session=session,
            table=table,
            client=client,
            establishment=establishment,
            reservation_date=date.today(),
            reservation_time=time(20, 0),
            status=ReservationStatus.ACCEPTED,
            duration_minutes=90,  # 20:00-21:30
        )
        session.commit()

        # Check for conflicts with 18:30-21:00 (overlaps both)
        conflicts = service.get_conflicting_reservations(
            table_id=table.id,
            reservation_date=date.today(),
            reservation_time=time(18, 30),
            duration_minutes=150,  # 2.5 hours
        )

        assert len(conflicts) == 2
        conflict_ids = {c.id for c in conflicts}
        assert res1.id in conflict_ids
        assert res2.id in conflict_ids

    def test_get_available_tables_filters_by_capacity(
        self, service: TableAvailabilityService, session: Session
    ):
        """Test that get_available_tables filters tables by guest capacity"""
        # Create fresh data without setup_data to avoid test table interference
        account = AccountFactory(session=session)
        establishment = EstablishmentFactory(session=session, account=account)

        # Create tables with different capacities
        TableFactory(
            session=session,
            establishment=establishment,
            name="Small",
            min_capacity=1,
            max_capacity=2,
            is_available=True,
        )
        large_table = TableFactory(
            session=session,
            establishment=establishment,
            name="Large",
            min_capacity=4,
            max_capacity=8,
            is_available=True,
        )
        session.commit()

        # Request for 6 guests - only large table should be returned
        available = service.get_available_tables(
            establishment_id=establishment.id,
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            number_of_guests=6,
            duration_minutes=120,
        )

        assert len(available) == 1
        assert available[0].id == large_table.id

    def test_get_available_tables_excludes_booked(
        self, service: TableAvailabilityService, session: Session
    ):
        """Test that get_available_tables excludes booked tables"""
        # Create fresh data without setup_data to avoid test table interference
        account = AccountFactory(session=session)
        establishment = EstablishmentFactory(session=session, account=account)
        client = ClientFactory(session=session, establishment=establishment)

        # Create two tables
        table1 = TableFactory(
            session=session,
            establishment=establishment,
            name="Table 1",
            min_capacity=2,
            max_capacity=4,
            is_available=True,
        )
        table2 = TableFactory(
            session=session,
            establishment=establishment,
            name="Table 2",
            min_capacity=2,
            max_capacity=4,
            is_available=True,
        )

        # Book table1
        ReservationFactory(
            session=session,
            table=table1,
            client=client,
            establishment=establishment,
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            status=ReservationStatus.ACCEPTED,
            duration_minutes=120,
        )
        session.commit()

        # Get available tables - should only return table2
        available = service.get_available_tables(
            establishment_id=establishment.id,
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            number_of_guests=2,
            duration_minutes=120,
        )

        assert len(available) == 1
        assert available[0].id == table2.id

    def test_get_available_tables_excludes_disabled_tables(
        self, service: TableAvailabilityService, session: Session
    ):
        """Test that get_available_tables excludes disabled tables"""
        # Create fresh data without setup_data to avoid test table interference
        account = AccountFactory(session=session)
        establishment = EstablishmentFactory(session=session, account=account)

        # Create enabled and disabled tables
        enabled_table = TableFactory(
            session=session,
            establishment=establishment,
            name="Enabled",
            min_capacity=2,
            max_capacity=4,
            is_available=True,
        )
        TableFactory(
            session=session,
            establishment=establishment,
            name="Disabled",
            min_capacity=2,
            max_capacity=4,
            is_available=False,
        )
        session.commit()

        # Get available tables - should only return enabled table
        available = service.get_available_tables(
            establishment_id=establishment.id,
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            number_of_guests=2,
            duration_minutes=120,
        )

        assert len(available) == 1
        assert available[0].id == enabled_table.id

    def test_validate_reservation_time_slot_success(
        self, service: TableAvailabilityService, setup_data
    ):
        """Test validation succeeds for available slot"""
        table = setup_data["table"]

        is_valid, error = service.validate_reservation_time_slot(
            table_id=table.id,
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            duration_minutes=120,
        )

        assert is_valid is True
        assert error is None

    def test_validate_reservation_time_slot_table_not_found(
        self, service: TableAvailabilityService
    ):
        """Test validation fails for non-existent table"""
        is_valid, error = service.validate_reservation_time_slot(
            table_id=99999,  # Non-existent ID
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            duration_minutes=120,
        )

        assert is_valid is False
        assert "not found" in error.lower()

    def test_validate_reservation_time_slot_table_disabled(
        self, service: TableAvailabilityService, setup_data, session: Session
    ):
        """Test validation fails for disabled table"""
        establishment = setup_data["establishment"]

        # Create disabled table
        disabled_table = TableFactory(
            session=session,
            establishment=establishment,
            name="Disabled",
            min_capacity=2,
            max_capacity=4,
            is_available=False,
        )
        session.commit()

        is_valid, error = service.validate_reservation_time_slot(
            table_id=disabled_table.id,
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            duration_minutes=120,
        )

        assert is_valid is False
        assert "not currently available" in error.lower()

    def test_validate_reservation_time_slot_conflict(
        self, service: TableAvailabilityService, setup_data, session: Session
    ):
        """Test validation fails when there's a conflict"""
        table = setup_data["table"]
        client = setup_data["client"]
        establishment = setup_data["establishment"]

        # Create existing reservation
        ReservationFactory(
            session=session,
            table=table,
            client=client,
            establishment=establishment,
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            status=ReservationStatus.ACCEPTED,
            duration_minutes=120,
        )
        session.commit()

        # Try to validate conflicting slot
        is_valid, error = service.validate_reservation_time_slot(
            table_id=table.id,
            reservation_date=date.today(),
            reservation_time=time(19, 30),
            duration_minutes=120,
        )

        assert is_valid is False
        assert "already reserved" in error.lower()

    def test_short_duration_reservation(
        self, service: TableAvailabilityService, setup_data, session: Session
    ):
        """Test reservations with non-standard durations (30 minutes)"""
        table = setup_data["table"]
        client = setup_data["client"]
        establishment = setup_data["establishment"]

        # Create 30-minute reservation 19:00-19:30
        ReservationFactory(
            session=session,
            table=table,
            client=client,
            establishment=establishment,
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            status=ReservationStatus.ACCEPTED,
            duration_minutes=30,
        )
        session.commit()

        # Should be available at 19:30 (exact boundary)
        is_available = service.is_table_available(
            table_id=table.id,
            reservation_date=date.today(),
            reservation_time=time(19, 30),
            duration_minutes=120,
        )
        assert is_available is True

        # Should NOT be available at 19:15 (conflicts with 19:00-19:30)
        is_available = service.is_table_available(
            table_id=table.id,
            reservation_date=date.today(),
            reservation_time=time(19, 15),
            duration_minutes=120,
        )
        assert is_available is False

    def test_long_duration_reservation(
        self, service: TableAvailabilityService, setup_data, session: Session
    ):
        """Test reservations with long durations (6 hours)"""
        table = setup_data["table"]
        client = setup_data["client"]
        establishment = setup_data["establishment"]

        # Create 6-hour reservation 15:00-21:00
        ReservationFactory(
            session=session,
            table=table,
            client=client,
            establishment=establishment,
            reservation_date=date.today(),
            reservation_time=time(15, 0),
            status=ReservationStatus.ACCEPTED,
            duration_minutes=360,
        )
        session.commit()

        # Should NOT be available at 18:00 (within 15:00-21:00)
        is_available = service.is_table_available(
            table_id=table.id,
            reservation_date=date.today(),
            reservation_time=time(18, 0),
            duration_minutes=120,
        )
        assert is_available is False

        # Should be available at 21:00 (exact boundary)
        is_available = service.is_table_available(
            table_id=table.id,
            reservation_date=date.today(),
            reservation_time=time(21, 0),
            duration_minutes=120,
        )
        assert is_available is True
