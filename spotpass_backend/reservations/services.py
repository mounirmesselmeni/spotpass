"""
Reservation business logic and table availability services.

This module contains the core business logic for checking table availability,
preventing double bookings, and handling edge cases like overnight reservations.
"""

from datetime import date, datetime, time, timedelta

from sqlmodel import Session, select

from reservations.models import Reservation, ReservationStatus
from tables.models import Table


class TableAvailabilityService:
    """
    Service for checking table availability and preventing double bookings.

    Business Rules:
    1. A table cannot be double-booked for the same time slot
    2. Table availability depends on reservation duration (default 2 hours)
    3. Reservations are considered active if status is PENDING or ACCEPTED
    4. Edge cases handled:
       - Exact start/end time conflicts (reservation ending when another starts)
       - Overnight reservations (e.g., 22:00 to 02:00 next day)
       - Multi-day spanning reservations
    """

    def __init__(self, session: Session):
        self.session = session

    def is_table_available(
        self,
        table_id: int,
        reservation_date: date,
        reservation_time: time,
        duration_minutes: int = 120,
        exclude_reservation_id: int | None = None,
    ) -> bool:
        """
        Check if a table is available for a specific date, time, and duration.

        Args:
            table_id: The internal ID of the table
            reservation_date: The date of the reservation
            reservation_time: The start time of the reservation
            duration_minutes: Duration of the reservation in minutes (default: 120)
            exclude_reservation_id: Optional reservation ID to exclude (for updates)

        Returns:
            True if the table is available, False if it's already booked

        Examples:
            >>> service.is_table_available(1, date(2024, 1, 20), time(19, 0), 120)
            True  # Table is free

            >>> # Table booked 18:00-20:00, checking 19:30-21:30
            >>> service.is_table_available(1, date(2024, 1, 20), time(19, 30), 120)
            False  # Conflicts with existing reservation
        """
        conflicting_reservations = self.get_conflicting_reservations(
            table_id=table_id,
            reservation_date=reservation_date,
            reservation_time=reservation_time,
            duration_minutes=duration_minutes,
            exclude_reservation_id=exclude_reservation_id,
        )
        return len(conflicting_reservations) == 0

    def get_conflicting_reservations(
        self,
        table_id: int,
        reservation_date: date,
        reservation_time: time,
        duration_minutes: int = 120,
        exclude_reservation_id: int | None = None,
    ) -> list[Reservation]:
        """
        Get all reservations that conflict with the given time slot.

        This method handles complex edge cases:
        1. Same-day conflicts (standard case)
        2. Overnight reservations that start the day before but extend into our date
        3. Overnight reservations that start on our date but extend to next day
        4. Exact boundary conditions (does 20:00-22:00 conflict with 22:00-00:00?)

        Args:
            table_id: The internal ID of the table
            reservation_date: The date of the reservation
            reservation_time: The start time of the reservation
            duration_minutes: Duration of the reservation in minutes
            exclude_reservation_id: Optional reservation ID to exclude from conflict check

        Returns:
            List of conflicting Reservation objects

        Notes:
            - We use HALF-OPEN intervals: [start, end)
            - A reservation ending at 20:00 does NOT conflict with one starting at 20:00
            - This matches real-world restaurant table turnover expectations
        """
        # Calculate the requested reservation's start and end datetime
        requested_start = datetime.combine(reservation_date, reservation_time)
        requested_end = requested_start + timedelta(minutes=duration_minutes)

        # Determine which dates might have conflicting reservations
        # We need to check the requested date AND the previous day (for overnight reservations)
        dates_to_check = [reservation_date]
        if reservation_date > date.min:  # Avoid date underflow
            dates_to_check.append(reservation_date - timedelta(days=1))

        # If our reservation extends past midnight, also check next day
        if requested_end.date() > reservation_date:
            dates_to_check.append(reservation_date + timedelta(days=1))

        # Query all potentially conflicting reservations
        statement = select(Reservation).where(
            Reservation.table_id == table_id,
            Reservation.reservation_date.in_(dates_to_check),
            Reservation.status.in_([ReservationStatus.PENDING, ReservationStatus.ACCEPTED]),
        )

        if exclude_reservation_id is not None:
            statement = statement.where(Reservation.id != exclude_reservation_id)

        existing_reservations = self.session.exec(statement).all()

        # Check each reservation for actual time overlap
        conflicting = []
        for reservation in existing_reservations:
            if self._reservations_overlap(
                requested_start=requested_start,
                requested_end=requested_end,
                existing_date=reservation.reservation_date,
                existing_time=reservation.reservation_time,
                existing_duration=reservation.duration_minutes or 120,
            ):
                conflicting.append(reservation)

        return conflicting

    def _reservations_overlap(
        self,
        requested_start: datetime,
        requested_end: datetime,
        existing_date: date,
        existing_time: time | None,
        existing_duration: int,
    ) -> bool:
        """
        Check if two reservation time periods overlap.

        Uses half-open interval logic: [start, end)
        - Two reservations overlap if: existing_start < requested_end AND requested_start < existing_end
        - Edge case: A reservation ending at 20:00 does NOT conflict with one starting at 20:00

        Args:
            requested_start: Start datetime of the new reservation
            requested_end: End datetime of the new reservation
            existing_date: Date of the existing reservation
            existing_time: Time of the existing reservation
            existing_duration: Duration in minutes of the existing reservation

        Returns:
            True if the reservations overlap, False otherwise

        Examples:
            Requested: 19:00-21:00
            Existing:  18:00-20:00
            Result:    True (overlap from 19:00-20:00)

            Requested: 20:00-22:00
            Existing:  18:00-20:00
            Result:    False (exact boundary, no overlap with half-open intervals)

            Requested: 22:00-02:00 (next day)
            Existing:  23:00-01:00 (next day)
            Result:    True (overlap from 23:00-01:00)
        """
        if existing_time is None:
            # If no time specified, assume no conflict (edge case, shouldn't happen)
            return False

        # Calculate existing reservation's start and end datetime
        existing_start = datetime.combine(existing_date, existing_time)
        existing_end = existing_start + timedelta(minutes=existing_duration)

        # Half-open interval overlap: [a_start, a_end) overlaps [b_start, b_end)
        # if and only if: a_start < b_end AND b_start < a_end
        return existing_start < requested_end and requested_start < existing_end

    def get_available_tables(
        self,
        establishment_id: int,
        reservation_date: date,
        reservation_time: time,
        number_of_guests: int,
        duration_minutes: int = 120,
    ) -> list[Table]:
        """
        Get all tables available for the given criteria.

        Args:
            establishment_id: The establishment ID
            reservation_date: Date of the reservation
            reservation_time: Time of the reservation
            number_of_guests: Number of guests
            duration_minutes: Duration in minutes (default: 120)

        Returns:
            List of available Table objects that match capacity and are not booked
        """
        # Get all tables that match capacity and are enabled
        statement = select(Table).where(
            Table.establishment_id == establishment_id,
            Table.is_on_service.is_(True),
            Table.min_capacity <= number_of_guests,
            Table.max_capacity >= number_of_guests,
        )
        candidate_tables = self.session.exec(statement).all()

        # Filter out tables that have conflicting reservations
        available_tables = []
        for table in candidate_tables:
            if self.is_table_available(
                table_id=table.id,
                reservation_date=reservation_date,
                reservation_time=reservation_time,
                duration_minutes=duration_minutes,
            ):
                available_tables.append(table)

        return available_tables

    def validate_reservation_time_slot(
        self,
        table_id: int,
        reservation_date: date,
        reservation_time: time,
        duration_minutes: int = 120,
        exclude_reservation_id: int | None = None,
    ) -> tuple[bool, str | None]:
        """
        Validate that a reservation can be made for the given time slot.

        Args:
            table_id: The internal ID of the table
            reservation_date: Date of the reservation
            reservation_time: Time of the reservation
            duration_minutes: Duration in minutes
            exclude_reservation_id: Optional reservation ID to exclude (for updates)

        Returns:
            Tuple of (is_valid, error_message)
            - (True, None) if the slot is available
            - (False, "error message") if there's a conflict
        """
        # Check if table exists and is enabled
        table = self.session.get(Table, table_id)
        if not table:
            return False, "Table not found"

        if not table.is_on_service:
            return False, f"Table '{table.name}' is not currently available"

        # Check for conflicts
        conflicts = self.get_conflicting_reservations(
            table_id=table_id,
            reservation_date=reservation_date,
            reservation_time=reservation_time,
            duration_minutes=duration_minutes,
            exclude_reservation_id=exclude_reservation_id,
        )

        if conflicts:
            conflict = conflicts[0]  # Show first conflict
            conflict_time_str = (
                conflict.reservation_time.strftime("%H:%M")
                if conflict.reservation_time
                else "unknown"
            )
            return False, (
                f"Table '{table.name}' is already reserved at {conflict_time_str} "
                f"on {conflict.reservation_date.isoformat()}"
            )

        return True, None


# TODO: Database Locking for Race Condition Prevention
# =====================================================
# Currently, there's a potential race condition when multiple staff members
# try to assign the same table to different reservations simultaneously.
#
# The time window for the race condition is between:
# 1. Checking table availability (read operation)
# 2. Creating the reservation with table assignment (write operation)
#
# SOLUTIONS TO IMPLEMENT:
#
# Option 1: Optimistic Locking with Version Field
# ------------------------------------------------
# Add a 'version' field to the Reservation table:
#   version: int = Field(default=0)
#
# On update, check version and increment:
#   UPDATE reservations SET table_id=?, version=version+1
#   WHERE id=? AND version=?
#
# If affected rows = 0, another transaction modified it, retry.
#
# Option 2: Pessimistic Locking with SELECT FOR UPDATE
# -----------------------------------------------------
# Use SQLAlchemy's with_for_update() when checking availability:
#   statement = select(Reservation).where(...).with_for_update()
#
# This locks the rows until transaction commits, preventing concurrent modifications.
#
# Option 3: Database Unique Constraint
# -------------------------------------
# Create a unique partial index:
#   CREATE UNIQUE INDEX idx_no_double_booking ON reservations (
#       table_id, reservation_date, reservation_time
#   ) WHERE status IN ('pending', 'accepted');
#
# This would prevent double bookings at DB level, but doesn't handle duration overlap.
#
# Option 4: Application-Level Distributed Lock (Redis)
# -----------------------------------------------------
# Use Redis lock with key: f"table_lock:{table_id}:{date}:{time}"
#   with redis_client.lock(key, timeout=5):
#       # Check availability and create reservation
#
# RECOMMENDATION:
# For this application, Option 2 (SELECT FOR UPDATE) is recommended because:
# - Simple to implement with SQLAlchemy
# - Provides strong consistency
# - Handles the overlap duration logic we've implemented
# - No additional infrastructure needed (unlike Redis)
#
# Implementation example in create_reservation():
#
#   with session.begin():  # Start transaction
#       # Lock the table row
#       table = session.exec(
#           select(Table).where(Table.id == table_id).with_for_update()
#       ).first()
#
#       # Check availability (within locked transaction)
#       if not availability_service.is_table_available(...):
#           raise HTTPException(409, "Table no longer available")
#
#       # Create reservation
#       reservation = Reservation(...)
#       session.add(reservation)
#   # Lock released on commit
