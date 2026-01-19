"""Client management routes"""

import uuid as uuid_lib

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from clients.models import Client
from clients.schemas import ClientCreate, ClientRead, ClientUpdate
from core.dependencies import DatabaseSession, StaffUser
from establishments.models import Establishment

router = APIRouter(prefix="/api/staff/clients", tags=["Staff - Clients"])


@router.get("/", response_model=list[ClientRead])
def list_clients(session: DatabaseSession, token_payload: StaffUser):
    """List all clients (staff only)"""
    statement = select(Client)
    clients = session.exec(statement).all()
    return [ClientRead.model_validate(client) for client in clients]


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
