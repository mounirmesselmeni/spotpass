"""Client management routes"""

import uuid as uuid_lib

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import not_
from sqlmodel import select

from clients.models import Client
from clients.schemas import ClientCreate, ClientRead, ClientUpdate, PaginatedClientResponse
from core.dependencies import DatabaseSession, StaffUser
from establishments.models import Establishment

router = APIRouter(prefix="/api/staff/clients", tags=["Staff - Clients"])


@router.get("/", response_model=PaginatedClientResponse)
def list_clients(
    session: DatabaseSession,
    token_payload: StaffUser,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "name",
    sort_order: str = "asc",
    label_filter: list[str] | None = Query(None),
    search: str | None = None,
):
    """
    List all clients with pagination, sorting, and filtering (staff only)

    - **page**: Page number (1-indexed), default: 1
    - **page_size**: Number of items per page (max 1000), default: 20
    - **sort_by**: Sort field (name, email, phone, created_at), default: name
    - **sort_order**: Sort order (asc, desc), default: asc
    - **label_filter**: Filter by client labels (vip, blacklisted, regular). Can be multiple values.
    - **search**: Search query to filter clients by name, phone, or email
    """
    from sqlmodel import asc, desc, func

    # Validate pagination parameters
    if page < 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Page must be >= 1")
    if page_size < 1 or page_size > 1000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Page size must be between 1 and 1000"
        )

    # Validate sorting parameters
    valid_sort_fields = ["name", "email", "phone", "created_at", "status"]
    if sort_by not in valid_sort_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid sort_by field. Must be one of: {', '.join(valid_sort_fields)}",
        )

    if sort_order not in ["asc", "desc"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="sort_order must be 'asc' or 'desc'"
        )

    # Validate label filter
    valid_labels = ["vip", "blacklisted", "regular"]
    if label_filter:
        for label in label_filter:
            if label not in valid_labels:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"label_filter values must be one of: {', '.join(valid_labels)}",
                )

    statement = select(Client)

    # Apply label filter
    if label_filter:
        from sqlalchemy import or_

        conditions = []
        for label in label_filter:
            if label == "vip":
                conditions.append(Client.is_vip)
            elif label == "blacklisted":
                conditions.append(Client.is_blacklisted)
            elif label == "regular":
                conditions.append(not_(Client.is_vip) & not_(Client.is_blacklisted))
        if conditions:
            statement = statement.where(or_(*conditions))

    # Apply search filter
    if search:
        search_term = f"%{search}%"
        statement = statement.where(
            Client.full_name.ilike(search_term)
            | Client.phone_number.ilike(search_term)
            | (Client.email.ilike(search_term) if Client.email is not None else False)
        )

    # Get total count (with filters applied)
    count_statement = select(func.count()).select_from(statement.subquery())
    total = session.exec(count_statement).one()

    # Apply sorting
    order_func = desc if sort_order == "desc" else asc

    if sort_by == "name":
        statement = statement.order_by(order_func(Client.full_name))
    elif sort_by == "email":
        statement = statement.order_by(order_func(Client.email))
    elif sort_by == "phone":
        statement = statement.order_by(order_func(Client.phone_number))
    elif sort_by == "created_at":
        statement = statement.order_by(order_func(Client.created_at))
    elif sort_by == "status":
        # Sort by status: VIP first, then regular, then blacklisted
        # Using case statement to define order: vip=1, regular=2, blacklisted=3
        from sqlalchemy import case

        status_order = case((Client.is_vip, 1), (Client.is_blacklisted, 3), else_=2)
        statement = statement.order_by(order_func(status_order))

    # Apply pagination
    offset = (page - 1) * page_size
    statement = statement.offset(offset).limit(page_size)

    clients = session.exec(statement).all()
    items = [ClientRead.model_validate(client) for client in clients]

    # Calculate total pages
    total_pages = (total + page_size - 1) // page_size

    return PaginatedClientResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("/", response_model=ClientRead, status_code=status.HTTP_201_CREATED)
def create_client(client_data: ClientCreate, session: DatabaseSession, token_payload: StaffUser):
    """Create a new client (staff only)"""

    # Get establishment from user's account
    account_id = token_payload.get("account")
    statement = select(Establishment).where(Establishment.account_id == account_id)
    establishment = session.exec(statement).first()

    if not establishment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Establishment not found")

    # Check for duplicate phone number
    statement = select(Client).where(
        Client.phone_number == client_data.phone_number, Client.establishment_id == establishment.id
    )
    existing_client = session.exec(statement).first()

    if existing_client:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Client with same phone number already exists",
        )

    # Create client
    client = Client(
        uuid=uuid_lib.uuid4(),
        full_name=client_data.full_name,
        email=client_data.email,
        phone_number=client_data.phone_number,
        messenger_id=client_data.messenger_id,
        is_blacklisted=client_data.is_blacklisted,
        is_vip=client_data.is_vip,
        establishment_id=establishment.id,
        account_id=establishment.account_id,
    )

    session.add(client)
    session.commit()
    session.refresh(client)

    return ClientRead.model_validate(client)


@router.get("/{client_id}", response_model=ClientRead)
def get_client(client_id: uuid_lib.UUID, session: DatabaseSession, token_payload: StaffUser):
    """Get a specific client (staff only)"""
    statement = select(Client).where(Client.uuid == client_id)
    client = session.exec(statement).first()

    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    return ClientRead.model_validate(client)


@router.patch("/{client_id}", response_model=ClientRead)
def update_client(
    client_id: uuid_lib.UUID,
    client_data: ClientUpdate,
    session: DatabaseSession,
    token_payload: StaffUser,
):
    """Update a client (staff only)"""
    statement = select(Client).where(Client.uuid == client_id)
    client = session.exec(statement).first()

    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    # Update fields
    update_data = client_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(client, key, value)

    session.add(client)
    session.commit()
    session.refresh(client)

    return ClientRead.model_validate(client)


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(client_id: uuid_lib.UUID, session: DatabaseSession, token_payload: StaffUser):
    """Delete a client (staff only)"""
    statement = select(Client).where(Client.uuid == client_id)
    client = session.exec(statement).first()

    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    session.delete(client)
    session.commit()

    return None
