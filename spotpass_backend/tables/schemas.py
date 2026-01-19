"""Table and Zone Pydantic schemas"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from establishments.schemas import EstablishmentRead
from tables.models import TableType


class ZoneBase(BaseModel):
    """Base zone schema"""

    name: str = Field(min_length=1, max_length=64)


class ZoneCreate(ZoneBase):
    """Schema for creating zones"""

    establishment_id: UUID


class ZoneUpdate(BaseModel):
    """Schema for updating zones"""

    name: str | None = Field(None, min_length=1, max_length=64)


class ZoneRead(ZoneBase):
    """Schema for reading zones"""

    id: UUID

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        """Custom validation to map uuid to id"""
        if hasattr(obj, "uuid") and hasattr(obj, "name"):
            # This is a Zone model instance
            data = {"id": obj.uuid, "name": obj.name}
            return cls.model_construct(**data)
        return super().model_validate(obj, *args, **kwargs)


class TableBase(BaseModel):
    """Base table schema"""

    name: str = Field(min_length=1, max_length=64)
    description: str | None = Field(None, max_length=256)
    type: TableType = TableType.TABLE
    is_available: bool = True
    min_capacity: int = Field(ge=1, le=100)
    max_capacity: int = Field(ge=1, le=100)


class TableCreate(TableBase):
    """Schema for creating tables"""

    establishment_id: UUID
    zone_id: UUID | None = None


class TableUpdate(BaseModel):
    """Schema for updating tables"""

    is_available: bool | None = None
    name: str | None = Field(None, min_length=1, max_length=64)
    description: str | None = Field(None, max_length=256)
    min_capacity: int | None = Field(None, ge=1, le=100)
    max_capacity: int | None = Field(None, ge=1, le=100)


class TableRead(TableBase):
    """Schema for reading tables"""

    id: UUID
    created_at: datetime
    establishment: EstablishmentRead | None = None
    zone: ZoneRead | None = None

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        """Custom validation to map uuid to id"""
        if hasattr(obj, "uuid") and hasattr(obj, "name"):
            # This is a Table model instance
            data = {
                "id": obj.uuid,
                "name": obj.name,
                "description": obj.description,
                "type": obj.type,
                "is_available": obj.is_available,
                "min_capacity": obj.min_capacity,
                "max_capacity": obj.max_capacity,
                "created_at": obj.created_at,
            }
            return cls.model_construct(**data)
        return super().model_validate(obj, *args, **kwargs)
