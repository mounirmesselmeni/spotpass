"""Establishment Pydantic schemas"""

from uuid import UUID

from pydantic import BaseModel


class EstablishmentBase(BaseModel):
    """Base establishment schema"""

    name: str
    address: str


class EstablishmentCreate(EstablishmentBase):
    """Schema for creating establishments"""

    account_id: int


class EstablishmentRead(EstablishmentBase):
    """Schema for reading establishments"""

    id: UUID  # Return UUID as id

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        """Custom validation to map uuid to id"""
        if hasattr(obj, "uuid") and hasattr(obj, "name"):
            # This is an Establishment model instance
            data = {"id": obj.uuid, "name": obj.name, "address": obj.address}
            return cls.model_construct(**data)
        return super().model_validate(obj, *args, **kwargs)
