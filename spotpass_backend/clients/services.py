"""
Client business logic service

This module contains all business logic related to client management,
separated from HTTP routing concerns.
"""

from uuid import UUID

from fastapi import HTTPException, status
from sqlmodel import Session, or_, select

from clients.models import Client
from clients.schemas import ClientCreate, ClientUpdate
from core.base_service import BaseService


class ClientService(BaseService[Client]):
    """
    Service for managing client business logic

    Handles:
    - Client CRUD operations
    - Duplicate detection (email/phone)
    - Blacklist validation
    - Client search and filtering
    """

    def __init__(self):
        super().__init__(Client)

    def create_client(
        self,
        client_data: ClientCreate,
        session: Session,
        establishment_id: UUID,
    ) -> Client:
        """
        Create a new client with duplicate checking

        Args:
            client_data: Client creation data
            session: Database session
            establishment_id: ID of the establishment creating the client

        Returns:
            Created client

        Raises:
            HTTPException: 400 if duplicate email or phone exists
        """
        # Check for duplicates
        self._check_duplicates(
            email=client_data.email,
            phone_number=client_data.phone_number,
            session=session,
            establishment_id=establishment_id,
        )

        # Create client
        db_client = Client(
            **client_data.model_dump(),
            establishment_id=establishment_id,
        )

        session.add(db_client)
        session.commit()
        session.refresh(db_client)

        return db_client

    def update_client(
        self,
        client_id: UUID,
        client_data: ClientUpdate,
        session: Session,
        establishment_id: UUID,
    ) -> Client:
        """
        Update an existing client

        Args:
            client_id: ID of the client to update
            client_data: Client update data
            session: Database session
            establishment_id: ID of the establishment (for authorization)

        Returns:
            Updated client

        Raises:
            HTTPException: 404 if client not found, 400 if duplicate detected
        """
        # Get existing client
        db_client = self.get_by_id(
            client_id,
            session,
            filters={"establishment_id": establishment_id},
        )

        # Check for duplicates if email/phone changed
        update_data = client_data.model_dump(exclude_unset=True)

        if "email" in update_data or "phone_number" in update_data:
            new_email = update_data.get("email", db_client.email)
            new_phone = update_data.get("phone_number", db_client.phone_number)

            # Only check if changed
            if new_email != db_client.email or new_phone != db_client.phone_number:
                self._check_duplicates(
                    email=new_email,
                    phone_number=new_phone,
                    session=session,
                    establishment_id=establishment_id,
                    exclude_id=client_id,
                )

        # Update fields
        for key, value in update_data.items():
            setattr(db_client, key, value)

        session.add(db_client)
        session.commit()
        session.refresh(db_client)

        return db_client

    def get_client_by_email(
        self,
        email: str,
        session: Session,
        establishment_id: UUID,
    ) -> Client | None:
        """
        Find client by email within an establishment

        Args:
            email: Client email address
            session: Database session
            establishment_id: ID of the establishment

        Returns:
            Client if found, None otherwise
        """
        query = select(Client).where(
            Client.email == email,
            Client.establishment_id == establishment_id,
        )
        return session.exec(query).first()

    def get_client_by_phone(
        self,
        phone_number: str,
        session: Session,
        establishment_id: UUID,
    ) -> Client | None:
        """
        Find client by phone number within an establishment

        Args:
            phone_number: Client phone number
            session: Database session
            establishment_id: ID of the establishment

        Returns:
            Client if found, None otherwise
        """
        query = select(Client).where(
            Client.phone_number == phone_number,
            Client.establishment_id == establishment_id,
        )
        return session.exec(query).first()

    def search_clients(
        self,
        search_term: str,
        session: Session,
        establishment_id: UUID,
        limit: int = 10,
    ) -> list[Client]:
        """
        Search clients by name, email, or phone

        Args:
            search_term: Search term (partial match)
            session: Database session
            establishment_id: ID of the establishment
            limit: Maximum number of results

        Returns:
            List of matching clients
        """
        search_pattern = f"%{search_term}%"
        query = (
            select(Client)
            .where(
                Client.establishment_id == establishment_id,
                or_(
                    Client.full_name.ilike(search_pattern),  # type: ignore
                    Client.email.ilike(search_pattern),  # type: ignore
                    Client.phone_number.ilike(search_pattern),  # type: ignore
                ),
            )
            .limit(limit)
        )
        return list(session.exec(query).all())

    def validate_not_blacklisted(
        self,
        client_id: UUID,
        session: Session,
    ) -> None:
        """
        Validate that client is not blacklisted

        Args:
            client_id: ID of the client
            session: Database session

        Raises:
            HTTPException: 403 if client is blacklisted
        """
        client = session.get(Client, client_id)
        if client and client.is_blacklisted:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This client is blacklisted and cannot make reservations",
            )

    def _check_duplicates(
        self,
        email: str | None,
        phone_number: str,
        session: Session,
        establishment_id: UUID,
        exclude_id: UUID | None = None,
    ) -> None:
        """
        Check for duplicate email or phone number

        Args:
            email: Email to check
            phone_number: Phone number to check
            session: Database session
            establishment_id: ID of the establishment
            exclude_id: Optional client ID to exclude from check (for updates)

        Raises:
            HTTPException: 400 if duplicate found
        """
        query = select(Client).where(Client.establishment_id == establishment_id)

        # Build OR condition for email or phone
        conditions = []
        if email:
            conditions.append(Client.email == email)
        if phone_number:
            conditions.append(Client.phone_number == phone_number)

        if not conditions:
            return

        query = query.where(or_(*conditions))

        # Exclude current client if updating
        if exclude_id:
            query = query.where(Client.uuid != exclude_id)

        existing = session.exec(query).first()

        if existing:
            if email and existing.email == email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A client with this email already exists",
                )
            if existing.phone_number == phone_number:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A client with this phone number already exists",
                )


# Singleton instance
client_service = ClientService()
