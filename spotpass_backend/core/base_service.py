"""
Base service class with common patterns and utilities

This module provides base service functionality that can be inherited
by domain-specific services. It follows the repository pattern with
dependency injection for database sessions.
"""

from typing import Any, Generic, TypeVar
from uuid import UUID

from fastapi import HTTPException, status
from sqlmodel import Session, select

ModelType = TypeVar("ModelType")


class BaseService(Generic[ModelType]):
    """
    Base service class providing common CRUD operations

    This class can be inherited by domain-specific services to get
    standard CRUD functionality with consistent error handling.

    Example:
        class ClientService(BaseService[Client]):
            def __init__(self):
                super().__init__(Client)
    """

    def __init__(self, model: type[ModelType]):
        """
        Initialize base service with model type

        Args:
            model: SQLModel class that this service manages
        """
        self.model = model
        self.model_name = model.__name__

    def get_by_id(
        self,
        entity_id: UUID,
        session: Session,
        filters: dict[str, Any] | None = None,
        error_msg: str | None = None,
    ) -> ModelType:
        """
        Get entity by ID with optional additional filters

        Args:
            entity_id: UUID of the entity
            session: Database session
            filters: Optional dict of additional filters (e.g., {"establishment_id": uuid})
            error_msg: Custom error message if not found

        Returns:
            Found entity

        Raises:
            HTTPException: 404 if entity not found
        """
        query = select(self.model).where(self.model.id == entity_id)  # type: ignore

        # Apply additional filters (e.g., establishment_id, account_id)
        if filters:
            for key, value in filters.items():
                query = query.where(getattr(self.model, key) == value)

        entity = session.exec(query).first()

        if not entity:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg or f"{self.model_name} not found",
            )

        return entity

    def exists(
        self,
        session: Session,
        filters: dict[str, Any],
    ) -> bool:
        """
        Check if entity exists with given filters

        Args:
            session: Database session
            filters: Dict of filters to check

        Returns:
            True if entity exists, False otherwise
        """
        query = select(self.model)

        for key, value in filters.items():
            query = query.where(getattr(self.model, key) == value)

        return session.exec(query).first() is not None

    def delete_by_id(
        self,
        entity_id: UUID,
        session: Session,
        filters: dict[str, Any] | None = None,
    ) -> None:
        """
        Delete entity by ID

        Args:
            entity_id: UUID of the entity
            session: Database session
            filters: Optional dict of additional filters for authorization

        Raises:
            HTTPException: 404 if entity not found
        """
        entity = self.get_by_id(entity_id, session, filters)
        session.delete(entity)
        session.commit()

    def validate_ownership(
        self,
        entity: ModelType,
        establishment_id: UUID | None = None,
        account_id: int | None = None,
    ) -> None:
        """
        Validate that entity belongs to the given establishment or account

        Args:
            entity: Entity to validate
            establishment_id: Expected establishment ID
            account_id: Expected account ID

        Raises:
            HTTPException: 403 if ownership validation fails
        """
        if establishment_id and hasattr(entity, "establishment_id"):
            if entity.establishment_id != establishment_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this resource",
                )

        if account_id and hasattr(entity, "account_id"):
            if entity.account_id != account_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this resource",
                )
