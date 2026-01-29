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

    # establishment_id is now optional and will be inferred from the user's account
    establishment_id: UUID | None = None

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "name": "Terrace",
                }
            ]
        }
    }


class ZoneUpdate(BaseModel):
    """Schema for updating zones"""

    name: str | None = Field(None, min_length=1, max_length=64)


class ZoneRead(ZoneBase):
    """Schema for reading zones"""

    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        """Custom validation to map uuid to id"""
        if hasattr(obj, "uuid") and hasattr(obj, "name"):
            # This is a Zone model instance
            data = {"id": obj.uuid, "name": obj.name, "created_at": obj.created_at}
            return cls.model_construct(**data)
        return super().model_validate(obj, *args, **kwargs)


class TableBase(BaseModel):
    """Base table schema"""

    name: str = Field(min_length=1, max_length=64)
    description: str | None = Field(None, max_length=256)
    type: TableType = TableType.TABLE
    is_on_service: bool = True
    min_capacity: int = Field(ge=1, le=100)
    max_capacity: int = Field(ge=1, le=100)


class TableCreate(TableBase):
    """Schema for creating tables"""

    # establishment_id is now optional and will be inferred from the user's account
    establishment_id: UUID | None = None
    zone_id: UUID | None = None

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "name": "Table 5",
                    "description": "Window table with city view",
                    "type": "table",
                    "is_on_service": True,
                    "min_capacity": 2,
                    "max_capacity": 4,
                    "zone_id": "123e4567-e89b-12d3-a456-426614174001",
                }
            ]
        }
    }


class TableUpdate(BaseModel):
    """Schema for updating tables"""

    name: str | None = Field(None, min_length=1, max_length=64)
    description: str | None = Field(None, max_length=256)
    type: TableType | None = None
    is_on_service: bool | None = None
    min_capacity: int | None = Field(None, ge=1, le=100)
    max_capacity: int | None = Field(None, ge=1, le=100)
    zone_id: UUID | None = None

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "is_on_service": True,
                    "name": "Table 5A",
                    "description": "Premium window table",
                    "min_capacity": 2,
                    "max_capacity": 6,
                }
            ]
        }
    }


class TableRead(TableBase):
    """Schema for reading tables"""

    id: UUID
    created_at: datetime
    establishment: EstablishmentRead | None = None
    zone: ZoneRead | None = None

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "examples": [
                {
                    "id": "123e4567-e89b-12d3-a456-426614174000",
                    "name": "Table 5",
                    "description": "Window table with city view",
                    "type": "table",
                    "is_on_service": True,
                    "min_capacity": 2,
                    "max_capacity": 4,
                    "created_at": "2024-01-01T10:00:00",
                }
            ]
        },
    }

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
                "is_on_service": obj.is_on_service,
                "min_capacity": obj.min_capacity,
                "max_capacity": obj.max_capacity,
                "created_at": obj.created_at,
                "zone": ZoneRead.model_validate(obj.zone) if obj.zone else None,
            }
            return cls.model_construct(**data)
        return super().model_validate(obj, *args, **kwargs)


class TimeSlotReservationInfo(BaseModel):
    """Reservation information for a time slot"""

    reference: str
    guests: int
    client_name: str

    model_config = {
        "json_schema_extra": {
            "examples": [{"reference": "REF1234567890", "guests": 4, "client_name": "John Doe"}]
        }
    }


class TimeSlotRead(BaseModel):
    """Time slot availability information"""

    time: str
    status: str  # "available" or "occupied"
    reservation: TimeSlotReservationInfo | None = None

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "time": "19:30",
                    "status": "occupied",
                    "reservation": {
                        "reference": "REF1234567890",
                        "guests": 4,
                        "client_name": "John Doe",
                    },
                },
                {"time": "20:00", "status": "available", "reservation": None},
            ]
        }
    }
