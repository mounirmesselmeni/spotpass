"""Table and Zone management routes"""

import uuid as uuid_lib
from datetime import date

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from core.dependencies import DatabaseSession, StaffUser
from establishments.models import Establishment
from tables.models import Table, Zone
from tables.schemas import (
    TableCreate,
    TableRead,
    TableUpdate,
    TimeSlotRead,
    TimeSlotReservationInfo,
    ZoneCreate,
    ZoneRead,
    ZoneUpdate,
)

# Tables router
tables_router = APIRouter(prefix="/api/staff/tables", tags=["Staff - Tables"])


@tables_router.get("/", response_model=list[TableRead])
def list_tables(
    session: DatabaseSession,
    token_payload: StaffUser,
    zone_id: uuid_lib.UUID | None = None,
    is_available: bool | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    name: str | None = None,
):
    """List all tables with optional filters (staff only)"""

    from reservations.models import Reservation, ReservationStatus

    statement = select(Table)

    # Apply filters
    conditions = []

    if zone_id:
        zone_statement = select(Zone).where(Zone.uuid == zone_id)
        zone = session.exec(zone_statement).first()
        if zone:
            conditions.append(Table.zone_id == zone.id)

    if is_available is not None:
        conditions.append(Table.is_available == is_available)

    if name:
        conditions.append(Table.name.ilike(f"%{name}%"))

    if conditions:
        statement = statement.where(*conditions)

    tables = session.exec(statement).all()

    # If date range is provided, filter by availability in that range
    if date_from or date_to:
        available_tables = []
        for table in tables:
            # Check if table has reservations in date range
            res_statement = select(Reservation).where(
                Reservation.table_id == table.id,
                Reservation.status.in_([ReservationStatus.PENDING, ReservationStatus.ACCEPTED]),
            )

            if date_from:
                res_statement = res_statement.where(Reservation.reservation_date >= date_from)
            if date_to:
                res_statement = res_statement.where(Reservation.reservation_date <= date_to)

            reservations = session.exec(res_statement).all()

            # Only include tables without reservations in range OR include all if showing unavailable
            if not reservations or is_available is False:
                available_tables.append(table)

        tables = available_tables

    # Eagerly load zone information
    result = []
    for table in tables:
        table_dict = TableRead.model_validate(table)
        if table.zone_id:
            zone = session.get(Zone, table.zone_id)
            if zone:
                from tables.schemas import ZoneRead

                table_dict.zone = ZoneRead.model_validate(zone)
        result.append(table_dict)

    return result


@tables_router.post("/", response_model=TableRead, status_code=status.HTTP_201_CREATED)
def create_table(table_data: TableCreate, session: DatabaseSession, token_payload: StaffUser):
    """Create a new table (staff only)"""

    # Validate capacity
    if table_data.min_capacity > table_data.max_capacity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="min_capacity cannot be greater than max_capacity",
        )

    # Get establishment from user's account
    account_id = token_payload.get("account")
    statement = select(Establishment).where(Establishment.account_id == account_id)
    establishment = session.exec(statement).first()

    if not establishment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Establishment not found")

    # If establishment_id is provided, validate it matches the user's establishment
    if table_data.establishment_id and table_data.establishment_id != establishment.uuid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid establishment")

    # Check if zone exists (if provided)
    zone_id = None
    if table_data.zone_id:
        statement = select(Zone).where(Zone.uuid == table_data.zone_id)
        zone = session.exec(statement).first()

        if not zone:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone not found")
        zone_id = zone.id

    # Create table
    table = Table(
        uuid=uuid_lib.uuid4(),
        name=table_data.name,
        description=table_data.description,
        type=table_data.type,
        is_available=table_data.is_available,
        min_capacity=table_data.min_capacity,
        max_capacity=table_data.max_capacity,
        establishment_id=establishment.id,
        account_id=establishment.account_id,
        zone_id=zone_id,
    )

    session.add(table)
    session.commit()
    session.refresh(table)

    return TableRead.model_validate(table)


@tables_router.get("/{table_id}", response_model=TableRead)
def get_table(table_id: uuid_lib.UUID, session: DatabaseSession, token_payload: StaffUser):
    """Get a specific table (staff only)"""
    statement = select(Table).where(Table.uuid == table_id)
    table = session.exec(statement).first()

    if not table:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")

    return TableRead.model_validate(table)


@tables_router.patch("/{table_id}", response_model=TableRead)
def update_table(
    table_id: uuid_lib.UUID,
    table_data: TableUpdate,
    session: DatabaseSession,
    token_payload: StaffUser,
):
    """Update a table (staff only)"""
    statement = select(Table).where(Table.uuid == table_id)
    table = session.exec(statement).first()

    if not table:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")

    # Update fields
    update_data = table_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(table, key, value)

    session.add(table)
    session.commit()
    session.refresh(table)

    return TableRead.model_validate(table)


@tables_router.delete("/{table_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_table(table_id: uuid_lib.UUID, session: DatabaseSession, token_payload: StaffUser):
    """Delete a table (staff only)"""
    statement = select(Table).where(Table.uuid == table_id)
    table = session.exec(statement).first()

    if not table:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")

    session.delete(table)
    session.commit()

    return None


@tables_router.get("/{table_id}/time-slots", response_model=list[TimeSlotRead])
def get_table_time_slots(
    table_id: uuid_lib.UUID, date: date, session: DatabaseSession, token_payload: StaffUser
):
    """Get time slots for a table on a specific date (staff only)"""
    from datetime import time

    from clients.models import Client
    from reservations.models import Reservation, ReservationStatus

    # Get table
    statement = select(Table).where(Table.uuid == table_id)
    table = session.exec(statement).first()

    if not table:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")

    # Get all reservations for this table on this date
    reservations_statement = select(Reservation).where(
        Reservation.table_id == table.id,
        Reservation.reservation_date == date,
        Reservation.status.in_([ReservationStatus.PENDING, ReservationStatus.ACCEPTED]),
    )
    reservations = session.exec(reservations_statement).all()

    # Create time slots from 09:00 to 23:00 (every 30 minutes)
    time_slots = []
    for hour in range(9, 23):
        for minute in [0, 30]:
            time_str = f"{hour:02d}:{minute:02d}"

            # Check if this time slot is occupied
            time(hour, minute)
            occupied_reservation = None

            for reservation in reservations:
                if reservation.reservation_time:
                    # Check if reservation time overlaps with this slot

                    # Calculate reservation start and end times
                    from datetime import datetime, timedelta

                    slot_dt = datetime.combine(date.min, time(hour, minute))
                    res_start = datetime.combine(date.min, reservation.reservation_time)

                    # Use duration_minutes if available, default to 2 hours
                    duration = reservation.duration_minutes or 120
                    res_end = res_start + timedelta(minutes=duration)

                    # Check if slot falls within reservation period
                    if res_start <= slot_dt < res_end:
                        occupied_reservation = reservation
                        break

            if occupied_reservation:
                # Get client info
                client = session.get(Client, occupied_reservation.client_id)
                time_slots.append(
                    TimeSlotRead(
                        time=time_str,
                        status="occupied",
                        reservation=TimeSlotReservationInfo(
                            reference=occupied_reservation.reference,
                            guests=occupied_reservation.number_of_guests,
                            client_name=client.full_name if client else "Unknown",
                        ),
                    )
                )
            else:
                time_slots.append(TimeSlotRead(time=time_str, status="available", reservation=None))

    return time_slots


# Zones router
zones_router = APIRouter(prefix="/api/staff/zones", tags=["Staff - Zones"])


@zones_router.get("/", response_model=list[ZoneRead])
def list_zones(session: DatabaseSession, token_payload: StaffUser):
    """List all zones (staff only)"""
    statement = select(Zone)
    zones = session.exec(statement).all()
    return [ZoneRead.model_validate(zone) for zone in zones]


@zones_router.post("/", response_model=ZoneRead, status_code=status.HTTP_201_CREATED)
def create_zone(zone_data: ZoneCreate, session: DatabaseSession, token_payload: StaffUser):
    """Create a new zone (staff only)"""

    # Get establishment from user's account
    account_id = token_payload.get("account")
    statement = select(Establishment).where(Establishment.account_id == account_id)
    establishment = session.exec(statement).first()

    if not establishment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Establishment not found")

    # If establishment_id is provided, validate it matches the user's establishment
    if zone_data.establishment_id and zone_data.establishment_id != establishment.uuid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid establishment")

    # Check for duplicate zone name in establishment
    statement = select(Zone).where(
        Zone.name == zone_data.name, Zone.establishment_id == establishment.id
    )
    existing_zone = session.exec(statement).first()

    if existing_zone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Zone with this name already exists in the establishment",
        )

    # Create zone
    zone = Zone(
        uuid=uuid_lib.uuid4(),
        name=zone_data.name,
        establishment_id=establishment.id,
        account_id=establishment.account_id,
    )

    session.add(zone)
    session.commit()
    session.refresh(zone)

    return ZoneRead.model_validate(zone)


@zones_router.get("/{zone_id}", response_model=ZoneRead)
def get_zone(zone_id: uuid_lib.UUID, session: DatabaseSession, token_payload: StaffUser):
    """Get a specific zone (staff only)"""
    statement = select(Zone).where(Zone.uuid == zone_id)
    zone = session.exec(statement).first()

    if not zone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone not found")

    return ZoneRead.model_validate(zone)


@zones_router.patch("/{zone_id}", response_model=ZoneRead)
def update_zone(
    zone_id: uuid_lib.UUID,
    zone_data: ZoneUpdate,
    session: DatabaseSession,
    token_payload: StaffUser,
):
    """Update a zone (staff only)"""
    statement = select(Zone).where(Zone.uuid == zone_id)
    zone = session.exec(statement).first()

    if not zone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone not found")

    # Update fields
    update_data = zone_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(zone, key, value)

    session.add(zone)
    session.commit()
    session.refresh(zone)

    return ZoneRead.model_validate(zone)


@zones_router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_zone(zone_id: uuid_lib.UUID, session: DatabaseSession, token_payload: StaffUser):
    """Delete a zone (staff only)"""
    statement = select(Zone).where(Zone.uuid == zone_id)
    zone = session.exec(statement).first()

    if not zone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone not found")

    session.delete(zone)
    session.commit()

    return None
