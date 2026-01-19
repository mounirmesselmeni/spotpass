"""Reservation management routes"""

import uuid as uuid_lib
from datetime import date, datetime, timedelta

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from clients.models import Client
from core.dependencies import DatabaseSession, StaffUser
from establishments.models import Establishment
from reservations.models import Reservation, ReservationStatus
from reservations.schemas import (
    AvailableTablesRequest,
    CancelReservationRequest,
    ClientWithHistoryRead,
    NewReservationTokenRequest,
    NewReservationTokenResponse,
    ReservationCreate,
    ReservationForExistingClientRequest,
    ReservationForNewClientRequest,
    ReservationRead,
    ReservationUpdate,
    ReservationWithClientRead,
)
from tables.models import Table as TableModel

# Staff reservation routes
staff_reservations_router = APIRouter(
    prefix="/api/staff/reservations", tags=["Staff - Reservations"]
)


@staff_reservations_router.get("/", response_model=list[ReservationWithClientRead])
def list_reservations(
    session: DatabaseSession,
    token_payload: StaffUser,
    status: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    keyword: str | None = None,
):
    """List all reservations with optional filters (staff only)"""
    from sqlmodel import or_

    statement = select(Reservation)

    # Apply filters
    conditions = []

    if status:
        conditions.append(Reservation.status == status)

    if date_from:
        conditions.append(Reservation.reservation_date >= date_from)

    if date_to:
        conditions.append(Reservation.reservation_date <= date_to)

    if keyword:
        # Search in reference
        keyword_conditions = [Reservation.reference.ilike(f"%{keyword}%")]

        # Also search in client details via JOIN
        statement = statement.join(Client, Reservation.client_id == Client.id)
        keyword_conditions.extend(
            [
                Client.full_name.ilike(f"%{keyword}%"),
                Client.email.ilike(f"%{keyword}%"),
                Client.phone_number.ilike(f"%{keyword}%"),
            ]
        )
        conditions.append(or_(*keyword_conditions))

    if conditions:
        statement = statement.where(*conditions)

    reservations = session.exec(statement).all()

    # Convert to response with establishment UUIDs and client details
    result = []
    for r in reservations:
        establishment = session.get(Establishment, r.establishment_id)
        client = session.get(Client, r.client_id)

        reservation_data = ReservationWithClientRead(
            id=r.uuid,
            reference=r.reference,
            reservation_date=r.reservation_date,
            reservation_time=r.reservation_time,
            number_of_guests=r.number_of_guests,
            special_request=r.special_request,
            status=r.status,
            source=r.source,
            note=r.note,
            no_show=r.no_show,
            created_at=r.created_at,
            accepted_at=r.accepted_at,
            refused_at=r.refused_at,
            canceled_at=r.canceled_at,
            establishment_id=establishment.uuid if establishment else r.establishment_id,
            client=ClientWithHistoryRead(
                id=client.uuid if client else r.client_id,
                full_name=client.full_name if client else "Unknown",
                email=client.email if client else None,
                phone_number=client.phone_number if client else "",
                is_vip=client.is_vip if client else False,
                is_blacklisted=client.is_blacklisted if client else False,
                last_reservation_date=None,  # Could be calculated if needed
                total_accepted=0,
                total_canceled=0,
                total_refused=0,
            ),
        )
        result.append(reservation_data)

    return result


@staff_reservations_router.get("/{reservation_id}", response_model=ReservationRead)
def get_reservation(
    reservation_id: uuid_lib.UUID, session: DatabaseSession, token_payload: StaffUser
):
    """Get a specific reservation (staff only)"""
    statement = select(Reservation).where(Reservation.uuid == reservation_id)
    reservation = session.exec(statement).first()

    if not reservation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")

    return ReservationRead.model_validate(reservation)


@staff_reservations_router.get("/{reservation_id}/details", response_model=dict)
def get_reservation_details(
    reservation_id: uuid_lib.UUID, session: DatabaseSession, token_payload: StaffUser
):
    """Get detailed reservation information with client history (staff only)"""
    from tables.models import Table as TableModel

    # Get reservation
    statement = select(Reservation).where(Reservation.uuid == reservation_id)
    reservation = session.exec(statement).first()

    if not reservation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")

    # Get client
    client_statement = select(Client).where(Client.id == reservation.client_id)
    client = session.exec(client_statement).first()

    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    # Get client history
    client_reservations = session.exec(
        select(Reservation).where(Reservation.client_id == client.id)
    ).all()

    total_accepted = sum(1 for r in client_reservations if r.status == ReservationStatus.ACCEPTED)
    total_canceled = sum(1 for r in client_reservations if r.status == ReservationStatus.CANCELED)
    total_refused = sum(1 for r in client_reservations if r.status == ReservationStatus.REFUSED)

    # Get last reservation date
    last_reservation = None
    for r in sorted(client_reservations, key=lambda x: x.reservation_date, reverse=True):
        if r.id != reservation.id:
            last_reservation = r.reservation_date
            break

    # Get table if assigned
    table_data = None
    if reservation.table_id:
        table_statement = select(TableModel).where(TableModel.id == reservation.table_id)
        table = session.exec(table_statement).first()
        if table:
            table_data = {
                "id": str(table.uuid),
                "name": table.name,
                "type": table.type,
            }

    # Get establishment UUID
    establishment = session.get(Establishment, reservation.establishment_id)
    establishment_uuid = str(establishment.uuid) if establishment else None

    return {
        "reservation": {
            "id": str(reservation.uuid),
            "reference": reservation.reference,
            "number_of_guests": reservation.number_of_guests,
            "reservation_date": reservation.reservation_date.isoformat(),
            "reservation_time": reservation.reservation_time.isoformat()
            if reservation.reservation_time
            else None,
            "status": reservation.status,
            "special_request": reservation.special_request,
            "note": reservation.note,
            "accepted_at": reservation.accepted_at.isoformat() if reservation.accepted_at else None,
            "refused_at": reservation.refused_at.isoformat() if reservation.refused_at else None,
            "canceled_at": reservation.canceled_at.isoformat() if reservation.canceled_at else None,
            "created_at": reservation.created_at.isoformat(),
            "establishment_id": establishment_uuid,
        },
        "client": {
            "id": str(client.uuid),
            "full_name": client.full_name,
            "phone_number": client.phone_number,
            "email": client.email,
            "is_vip": client.is_vip,
            "is_blacklisted": client.is_blacklisted,
            "last_reservation_date": last_reservation.isoformat() if last_reservation else None,
            "total_accepted": total_accepted,
            "total_canceled": total_canceled,
            "total_refused": total_refused,
        },
        "table": table_data,
    }


@staff_reservations_router.post(
    "/", response_model=ReservationRead, status_code=status.HTTP_201_CREATED
)
def create_reservation(
    reservation_data: ReservationCreate, session: DatabaseSession, token_payload: StaffUser
):
    """Create a new reservation (staff only)"""

    # Get establishment from user's account
    account_id = token_payload.get("account")
    statement = select(Establishment).where(Establishment.account_id == account_id)
    establishment = session.exec(statement).first()

    if not establishment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Establishment not found")

    # Check if client exists
    statement = select(Client).where(Client.uuid == reservation_data.client_id)
    client = session.exec(statement).first()

    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    # Check if table exists (if provided)
    table_id = None
    if reservation_data.table_id:
        statement = select(TableModel).where(TableModel.uuid == reservation_data.table_id)
        table = session.exec(statement).first()

        if not table:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")
        table_id = table.id

    # Generate reference
    reference = f"REF{datetime.utcnow().timestamp():.0f}"

    # Create reservation
    reservation = Reservation(
        uuid=uuid_lib.uuid4(),
        reference=reference,
        number_of_guests=reservation_data.number_of_guests,
        reservation_date=reservation_data.reservation_date,
        reservation_time=reservation_data.reservation_time,
        special_request=reservation_data.special_request,
        client_id=client.id,
        establishment_id=establishment.id,
        account_id=establishment.account_id,
        table_id=table_id,
    )

    session.add(reservation)
    session.commit()
    session.refresh(reservation)

    return ReservationRead.model_validate(reservation)


@staff_reservations_router.patch("/{reservation_id}", response_model=ReservationRead)
def update_reservation(
    reservation_id: uuid_lib.UUID,
    reservation_data: ReservationUpdate,
    session: DatabaseSession,
    token_payload: StaffUser,
):
    """Update a reservation (staff only)"""
    statement = select(Reservation).where(Reservation.uuid == reservation_id)
    reservation = session.exec(statement).first()

    if not reservation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")

    # Update status timestamps
    update_data = reservation_data.model_dump(exclude_unset=True)

    if "status" in update_data:
        new_status = update_data["status"]
        if new_status == ReservationStatus.ACCEPTED:
            reservation.accepted_at = datetime.utcnow()
        elif new_status == ReservationStatus.REFUSED:
            reservation.refused_at = datetime.utcnow()
        elif new_status == ReservationStatus.CANCELED:
            reservation.canceled_at = datetime.utcnow()

    # Handle table_id conversion
    if "table_id" in update_data and update_data["table_id"]:
        statement = select(TableModel).where(TableModel.uuid == update_data["table_id"])
        table = session.exec(statement).first()
        if table:
            update_data["table_id"] = table.id
        else:
            del update_data["table_id"]

    # Update fields
    for key, value in update_data.items():
        if key != "status" or value:  # Skip status if already handled
            setattr(reservation, key, value)

    session.add(reservation)
    session.commit()
    session.refresh(reservation)

    return ReservationRead.model_validate(reservation)


# Client-facing reservation routes (no auth required)
client_reservations_router = APIRouter(prefix="/api/client", tags=["Client"])


@client_reservations_router.post(
    "/new-reservation-token", response_model=NewReservationTokenResponse
)
def get_new_reservation_token(request_data: NewReservationTokenRequest, session: DatabaseSession):
    """Get a token for making a new reservation (public endpoint)"""

    # Verify establishment exists
    statement = select(Establishment).where(Establishment.uuid == request_data.establishment_id)
    establishment = session.exec(statement).first()

    if not establishment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Establishment not found")

    # Create temporary token (15 minutes expiry)
    # Note: We use access token but override the type to 'reservation' after creation
    expires = timedelta(minutes=15)

    # Create using access token function but we'll handle validation differently
    from core.security import jwt, settings

    expire = datetime.utcnow() + expires

    to_encode = {
        "sub": str(establishment.uuid),
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "reservation",  # Custom type for reservation tokens
        "establishment_id": str(establishment.uuid),
    }

    token = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    expires_at = expire

    return NewReservationTokenResponse(token=token, expires_at=expires_at)


@client_reservations_router.post("/reservation-for-new-client", response_model=ReservationRead)
def create_reservation_for_new_client(
    request_data: ReservationForNewClientRequest, session: DatabaseSession
):
    """Create reservation with a new client (public endpoint)"""

    # Verify token (use generic decode, not access token specific)
    from core.security import jwt, settings

    try:
        payload = jwt.decode(
            request_data.token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
    except Exception:
        payload = None

    if not payload or payload.get("type") != "reservation":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        )

    establishment_uuid = uuid_lib.UUID(payload.get("establishment_id"))

    # Get establishment
    statement = select(Establishment).where(Establishment.uuid == establishment_uuid)
    establishment = session.exec(statement).first()

    if not establishment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Establishment not found")

    # Create new client
    client = Client(
        uuid=uuid_lib.uuid4(),
        full_name=request_data.full_name,
        phone_number=request_data.phone_number,
        email=request_data.email,
        establishment_id=establishment.id,
        account_id=establishment.account_id,
    )

    session.add(client)
    session.flush()

    # Generate reference
    reference = f"REF{datetime.utcnow().timestamp():.0f}"

    # Create reservation
    reservation = Reservation(
        uuid=uuid_lib.uuid4(),
        reference=reference,
        number_of_guests=request_data.number_of_guests,
        reservation_date=request_data.reservation_date,
        reservation_time=request_data.reservation_time,
        special_request=request_data.special_request,
        client_id=client.id,
        establishment_id=establishment.id,
        account_id=establishment.account_id,
        source="messenger",
    )

    session.add(reservation)
    session.commit()
    session.refresh(reservation)

    return ReservationRead.model_validate(reservation)


@client_reservations_router.post("/reservation-for-existing-client", response_model=ReservationRead)
def create_reservation_for_existing_client(
    request_data: ReservationForExistingClientRequest, session: DatabaseSession
):
    """Create reservation with an existing client (public endpoint)"""

    # Verify token (use generic decode, not access token specific)
    from core.security import jwt, settings

    try:
        payload = jwt.decode(
            request_data.token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
    except Exception:
        payload = None

    if not payload or payload.get("type") != "reservation":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        )

    establishment_uuid = uuid_lib.UUID(payload.get("establishment_id"))

    # Get establishment
    statement = select(Establishment).where(Establishment.uuid == establishment_uuid)
    establishment = session.exec(statement).first()

    if not establishment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Establishment not found")

    # Find existing client
    statement = select(Client).where(
        Client.phone_number == request_data.phone_number,
        Client.establishment_id == establishment.id,
    )
    client = session.exec(statement).first()

    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    # Generate reference
    reference = f"REF{datetime.utcnow().timestamp():.0f}"

    # Create reservation
    reservation = Reservation(
        uuid=uuid_lib.uuid4(),
        reference=reference,
        number_of_guests=request_data.number_of_guests,
        reservation_date=request_data.reservation_date,
        reservation_time=request_data.reservation_time,
        special_request=request_data.special_request,
        client_id=client.id,
        establishment_id=establishment.id,
        account_id=establishment.account_id,
        source="messenger",
    )

    session.add(reservation)
    session.commit()
    session.refresh(reservation)

    return ReservationRead.model_validate(reservation)


@client_reservations_router.post("/cancel-reservation")
def cancel_reservation(request_data: CancelReservationRequest, session: DatabaseSession):
    """Cancel a reservation (public endpoint)"""

    # Verify token (use generic decode, not access token specific)
    from core.security import jwt, settings

    try:
        payload = jwt.decode(
            request_data.token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
    except Exception:
        payload = None

    if not payload or payload.get("type") != "reservation":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        )

    # Find reservation
    statement = select(Reservation).where(Reservation.reference == request_data.reference)
    reservation = session.exec(statement).first()

    if not reservation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")

    # Cancel reservation
    reservation.status = ReservationStatus.CANCELED
    reservation.canceled_at = datetime.utcnow()

    session.add(reservation)
    session.commit()

    return {"message": "Reservation canceled successfully"}


# Messenger bot route
messenger_router = APIRouter(prefix="/api", tags=["Messenger Bot"])


@messenger_router.post("/new-reservation-url")
def create_new_reservation_url(session: DatabaseSession):
    """Create URL for new reservation via messenger bot"""
    # This would typically accept establishment_id and messenger_id
    # Simplified version for now
    return {"url": "http://localhost:3000/reservation"}


# Get available tables for a specific date/time
@staff_reservations_router.post("/available-tables", response_model=list)
def get_available_tables(
    request_data: AvailableTablesRequest, session: DatabaseSession, token_payload: StaffUser
):
    """Get list of available tables for a specific date/time"""
    from datetime import time as time_type

    from tables.models import Zone

    # Parse request data
    reservation_date = request_data.reservation_date
    number_of_guests = request_data.number_of_guests
    reservation_time_str = request_data.reservation_time

    # Get establishment from user's account
    account_id = token_payload.get("account")
    statement = select(Establishment).where(Establishment.account_id == account_id)
    establishment = session.exec(statement).first()

    if not establishment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Establishment not found")

    # Get all tables that match capacity
    statement = select(TableModel).where(
        TableModel.establishment_id == establishment.id,
        TableModel.is_available,
        TableModel.min_capacity <= number_of_guests,
        TableModel.max_capacity >= number_of_guests,
    )
    tables = session.exec(statement).all()

    # Check which tables are already reserved for this time slot
    statement = select(Reservation).where(
        Reservation.establishment_id == establishment.id,
        Reservation.reservation_date == reservation_date,
        Reservation.status.in_([ReservationStatus.PENDING, ReservationStatus.ACCEPTED]),
        Reservation.table_id is not None,
    )
    reserved_tables = session.exec(statement).all()
    reserved_table_ids = {r.table_id for r in reserved_tables}

    # Build response with zone info
    result = []
    for table in tables:
        zone_name = None
        if table.zone_id:
            zone = session.get(Zone, table.zone_id)
            if zone:
                zone_name = zone.name

        result.append(
            {
                "id": str(table.uuid),
                "name": table.name,
                "min_capacity": table.min_capacity,
                "max_capacity": table.max_capacity,
                "zone_name": zone_name,
                "is_currently_available": table.id not in reserved_table_ids,
            }
        )

    return result


# Get reservation with full client details
@staff_reservations_router.get("/{reservation_id}/details")
def get_reservation_details(
    reservation_id: uuid_lib.UUID, session: DatabaseSession, token_payload: StaffUser
):
    """Get reservation with full client details and history"""
    statement = select(Reservation).where(Reservation.uuid == reservation_id)
    reservation = session.exec(statement).first()

    if not reservation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")

    # Get client
    client = session.get(Client, reservation.client_id)

    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    # Get client reservation history
    from sqlmodel import func

    # Last reservation date
    last_res_stmt = (
        select(Reservation.reservation_date)
        .where(Reservation.client_id == client.id, Reservation.id != reservation.id)
        .order_by(Reservation.reservation_date.desc())
        .limit(1)
    )
    last_res_date = session.exec(last_res_stmt).first()

    # Count by status
    total_accepted = session.exec(
        select(func.count(Reservation.id)).where(
            Reservation.client_id == client.id, Reservation.status == ReservationStatus.ACCEPTED
        )
    ).one()

    total_canceled = session.exec(
        select(func.count(Reservation.id)).where(
            Reservation.client_id == client.id, Reservation.status == ReservationStatus.CANCELED
        )
    ).one()

    total_refused = session.exec(
        select(func.count(Reservation.id)).where(
            Reservation.client_id == client.id, Reservation.status == ReservationStatus.REFUSED
        )
    ).one()

    # Get table info if assigned
    table_info = None
    if reservation.table_id:
        table = session.get(TableModel, reservation.table_id)
        if table:
            table_info = {
                "id": str(table.uuid),
                "name": table.name,
                "capacity": f"{table.min_capacity}-{table.max_capacity}",
            }

    return {
        "reservation": ReservationRead.model_validate(reservation).model_dump(),
        "table": table_info,
        "client": {
            "id": str(client.uuid),
            "full_name": client.full_name,
            "email": client.email,
            "phone_number": client.phone_number,
            "is_vip": client.is_vip,
            "is_blacklisted": client.is_blacklisted,
            "last_reservation_date": last_res_date.isoformat() if last_res_date else None,
            "total_accepted": total_accepted,
            "total_canceled": total_canceled,
            "total_refused": total_refused,
        },
    }
