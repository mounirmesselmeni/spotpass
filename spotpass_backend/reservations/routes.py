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
    ClientDetailRead,
    ClientWithHistoryRead,
    MessageResponse,
    NewReservationTokenRequest,
    NewReservationTokenResponse,
    PaginatedReservationResponse,
    ReservationCreate,
    ReservationDetailRead,
    ReservationDetailsResponse,
    ReservationForExistingClientRequest,
    ReservationForNewClientRequest,
    ReservationRead,
    ReservationUpdate,
    ReservationUrlResponse,
    ReservationWithClientRead,
    TableAvailabilityRead,
    TableInfoRead,
)
from tables.models import Table as TableModel

# Staff reservation routes
staff_reservations_router = APIRouter(
    prefix="/api/staff/reservations", tags=["Staff - Reservations"]
)


@staff_reservations_router.get("/", response_model=PaginatedReservationResponse)
def list_reservations(
    session: DatabaseSession,
    token_payload: StaffUser,
    status_filter: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    keyword: str | None = None,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "datetime",
    sort_order: str = "desc",
):
    """
    List all reservations with optional filters, pagination, and sorting (staff only)

    - **status_filter**: Filter by reservation status
    - **page**: Page number (1-indexed), default: 1
    - **page_size**: Number of items per page (max 100), default: 20
    - **sort_by**: Sort field (datetime, client_name, guests, status), default: datetime
    - **sort_order**: Sort order (asc, desc), default: desc
    """
    from sqlmodel import asc, desc, func, or_

    # Validate pagination parameters
    if page < 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Page must be >= 1")
    if page_size < 1 or page_size > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Page size must be between 1 and 100"
        )

    # Validate sorting parameters
    valid_sort_fields = ["datetime", "client_name", "guests", "status"]
    if sort_by not in valid_sort_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid sort_by field. Must be one of: {', '.join(valid_sort_fields)}",
        )

    if sort_order not in ["asc", "desc"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="sort_order must be 'asc' or 'desc'"
        )

    statement = select(Reservation)

    # Apply filters
    conditions = []

    if status_filter:
        conditions.append(Reservation.status == status_filter)

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

    # Get total count before pagination
    count_statement = select(func.count()).select_from(statement.subquery())
    total = session.exec(count_statement).one()

    # Apply sorting
    order_func = desc if sort_order == "desc" else asc

    if sort_by == "datetime":
        # Sort by date first, then time
        statement = statement.order_by(
            order_func(Reservation.reservation_date), order_func(Reservation.reservation_time)
        )
    elif sort_by == "client_name":
        # Need to join Client if not already joined
        if not keyword:  # keyword search already joins Client
            statement = statement.join(Client, Reservation.client_id == Client.id)
        statement = statement.order_by(order_func(Client.full_name))
    elif sort_by == "guests":
        statement = statement.order_by(order_func(Reservation.number_of_guests))
    elif sort_by == "status":
        statement = statement.order_by(order_func(Reservation.status))

    # Apply pagination
    offset = (page - 1) * page_size
    statement = statement.offset(offset).limit(page_size)

    reservations = session.exec(statement).all()

    # Convert to response with establishment UUIDs and client details
    items = []
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
        items.append(reservation_data)

    # Calculate total pages
    total_pages = (total + page_size - 1) // page_size

    # Build next/previous URLs
    from urllib.parse import urlencode

    base_params = {}
    if status_filter:
        base_params["status_filter"] = status_filter
    if date_from:
        base_params["date_from"] = date_from.isoformat()
    if date_to:
        base_params["date_to"] = date_to.isoformat()
    if keyword:
        base_params["keyword"] = keyword
    if sort_by != "datetime":
        base_params["sort_by"] = sort_by
    if sort_order != "desc":
        base_params["sort_order"] = sort_order
    base_params["page_size"] = str(page_size)

    next_url = None
    if page < total_pages:
        next_params = {**base_params, "page": str(page + 1)}
        next_url = f"/api/staff/reservations/?{urlencode(next_params)}"

    previous_url = None
    if page > 1:
        prev_params = {**base_params, "page": str(page - 1)}
        previous_url = f"/api/staff/reservations/?{urlencode(prev_params)}"

    return PaginatedReservationResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        next=next_url,
        previous=previous_url,
    )


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


@staff_reservations_router.get(
    "/{reservation_id}/details", response_model=ReservationDetailsResponse
)
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
            table_data = TableInfoRead(
                id=str(table.uuid),
                name=table.name,
                type=table.type,
            )

    # Get establishment UUID
    establishment = session.get(Establishment, reservation.establishment_id)
    establishment_uuid = str(establishment.uuid) if establishment else None

    return ReservationDetailsResponse(
        reservation=ReservationDetailRead(
            id=str(reservation.uuid),
            reference=reservation.reference,
            number_of_guests=reservation.number_of_guests,
            reservation_date=reservation.reservation_date.isoformat(),
            reservation_time=reservation.reservation_time.isoformat()
            if reservation.reservation_time
            else None,
            status=reservation.status,
            special_request=reservation.special_request,
            note=reservation.note,
            accepted_at=reservation.accepted_at.isoformat() if reservation.accepted_at else None,
            refused_at=reservation.refused_at.isoformat() if reservation.refused_at else None,
            canceled_at=reservation.canceled_at.isoformat() if reservation.canceled_at else None,
            created_at=reservation.created_at.isoformat(),
            establishment_id=establishment_uuid,
        ),
        client=ClientDetailRead(
            id=str(client.uuid),
            full_name=client.full_name,
            phone_number=client.phone_number,
            email=client.email,
            is_vip=client.is_vip,
            is_blacklisted=client.is_blacklisted,
            last_reservation_date=last_reservation.isoformat() if last_reservation else None,
            total_accepted=total_accepted,
            total_canceled=total_canceled,
            total_refused=total_refused,
        ),
        table=table_data,
    )


@staff_reservations_router.post(
    "/", response_model=ReservationRead, status_code=status.HTTP_201_CREATED
)
def create_reservation(
    reservation_data: ReservationCreate, session: DatabaseSession, token_payload: StaffUser
):
    """
    Create a new reservation (staff only)

    This endpoint uses pessimistic locking (SELECT FOR UPDATE) to prevent race conditions
    when multiple staff members try to book the same table simultaneously.
    """
    from reservations.services import TableAvailabilityService

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

    # Check if table exists and get internal ID (if provided)
    table_id = None
    if reservation_data.table_id:
        statement = select(TableModel).where(TableModel.uuid == reservation_data.table_id)
        table = session.exec(statement).first()

        if not table:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")
        table_id = table.id

        # Validate table availability with pessimistic locking
        # This locks the table row to prevent concurrent bookings
        with session.begin_nested():  # Use savepoint for nested transaction
            # Lock the table row to prevent race conditions
            locked_table = session.exec(
                select(TableModel).where(TableModel.id == table_id).with_for_update()
            ).first()

            if not locked_table:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")

            # Check availability within the locked transaction
            availability_service = TableAvailabilityService(session)
            is_valid, error = availability_service.validate_reservation_time_slot(
                table_id=table_id,
                reservation_date=reservation_data.reservation_date,
                reservation_time=reservation_data.reservation_time,
                duration_minutes=reservation_data.duration_minutes or 120,
            )

            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=error or "Table is not available for the selected time slot",
                )

    # Generate reference
    reference = f"REF{datetime.utcnow().timestamp():.0f}"

    # Create reservation
    reservation = Reservation(
        uuid=uuid_lib.uuid4(),
        reference=reference,
        number_of_guests=reservation_data.number_of_guests,
        reservation_date=reservation_data.reservation_date,
        reservation_time=reservation_data.reservation_time,
        duration_minutes=reservation_data.duration_minutes,
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
    """
    Update a reservation (staff only)

    When updating table assignment or time, uses pessimistic locking and validates availability.
    """
    from reservations.services import TableAvailabilityService

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

    # Handle table_id conversion and availability validation
    if "table_id" in update_data and update_data["table_id"]:
        statement = select(TableModel).where(TableModel.uuid == update_data["table_id"])
        table = session.exec(statement).first()
        if table:
            new_table_id = table.id

            # Check if table or time is changing - need to validate availability
            is_table_changing = new_table_id != reservation.table_id
            is_time_changing = (
                (
                    "reservation_date" in update_data
                    and update_data["reservation_date"] != reservation.reservation_date
                )
                or (
                    "reservation_time" in update_data
                    and update_data["reservation_time"] != reservation.reservation_time
                )
                or (
                    "duration_minutes" in update_data
                    and update_data["duration_minutes"] != reservation.duration_minutes
                )
            )

            if is_table_changing or is_time_changing:
                # Validate availability with locking
                with session.begin_nested():
                    # Lock the new table row
                    locked_table = session.exec(
                        select(TableModel).where(TableModel.id == new_table_id).with_for_update()
                    ).first()

                    if not locked_table:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND, detail="Table not found"
                        )

                    # Check availability (exclude current reservation from conflict check)
                    availability_service = TableAvailabilityService(session)
                    is_valid, error = availability_service.validate_reservation_time_slot(
                        table_id=new_table_id,
                        reservation_date=update_data.get(
                            "reservation_date", reservation.reservation_date
                        ),
                        reservation_time=update_data.get(
                            "reservation_time", reservation.reservation_time
                        ),
                        duration_minutes=update_data.get(
                            "duration_minutes", reservation.duration_minutes or 120
                        ),
                        exclude_reservation_id=reservation.id,  # Exclude current reservation
                    )

                    if not is_valid:
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail=error or "Table is not available for the selected time slot",
                        )

            update_data["table_id"] = new_table_id
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


@client_reservations_router.post("/cancel-reservation", response_model=MessageResponse)
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

    return MessageResponse(message="Reservation canceled successfully")


# Messenger bot route
messenger_router = APIRouter(prefix="/api", tags=["Messenger Bot"])


@messenger_router.post("/new-reservation-url", response_model=ReservationUrlResponse)
def create_new_reservation_url(session: DatabaseSession):
    """Create URL for new reservation via messenger bot"""
    # This would typically accept establishment_id and messenger_id
    # Simplified version for now
    return ReservationUrlResponse(url="http://localhost:3000/reservation")


# Get available tables for a specific date/time
@staff_reservations_router.post("/available-tables", response_model=list[TableAvailabilityRead])
def get_available_tables(
    request_data: AvailableTablesRequest, session: DatabaseSession, token_payload: StaffUser
):
    """
    Get list of available tables for a specific date/time

    Uses TableAvailabilityService to properly check for conflicts including duration overlap.
    """
    from datetime import time as time_type

    from reservations.services import TableAvailabilityService
    from tables.models import Zone

    # Parse request data
    reservation_date = request_data.reservation_date
    number_of_guests = request_data.number_of_guests
    reservation_time_str = request_data.reservation_time

    # Parse time string - handle various formats
    if isinstance(reservation_time_str, str):
        # Handle datetime-like strings (e.g., '2026-01-20T12')
        if "T" in reservation_time_str:
            # Extract time part from datetime string
            time_part = reservation_time_str.split("T")[-1]
            # If time part doesn't have minutes, add :00
            if ":" not in time_part:
                time_part = f"{time_part}:00"
            reservation_time_str = time_part

        time_parts = reservation_time_str.split(":")
        if len(time_parts) >= 2:
            try:
                hour = int(time_parts[0])
                minute = int(time_parts[1])
                second = int(time_parts[2]) if len(time_parts) > 2 else 0
                reservation_time = time_type(hour, minute, second)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid time format: {reservation_time_str}. Use HH:MM or HH:MM:SS",
                ) from exc
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid time format: {reservation_time_str}. Use HH:MM or HH:MM:SS",
            )
    else:
        reservation_time = reservation_time_str

    # Get establishment from user's account
    account_id = token_payload.get("account")
    statement = select(Establishment).where(Establishment.account_id == account_id)
    establishment = session.exec(statement).first()

    if not establishment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Establishment not found")

    # Use TableAvailabilityService to get available tables
    # This properly handles duration-based conflicts, overnight reservations, etc.
    availability_service = TableAvailabilityService(session)
    available_tables = availability_service.get_available_tables(
        establishment_id=establishment.id,
        reservation_date=reservation_date,
        reservation_time=reservation_time,
        number_of_guests=number_of_guests,
        duration_minutes=120,  # Default 2-hour reservation
    )

    # Build response with zone info
    result = []
    for table in available_tables:
        zone_name = None
        if table.zone_id:
            zone = session.get(Zone, table.zone_id)
            if zone:
                zone_name = zone.name

        result.append(
            TableAvailabilityRead(
                id=table.uuid,
                name=table.name,
                min_capacity=table.min_capacity,
                max_capacity=table.max_capacity,
                zone_name=zone_name,
                is_currently_available=True,  # All returned tables are available
            )
        )

    return result


# This duplicate endpoint has been removed - use the one at line 134 instead
