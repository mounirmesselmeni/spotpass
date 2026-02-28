"""Reservation Pydantic schemas"""

from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from reservations.models import ReservationSource, ReservationStatus


class ReservationBase(BaseModel):
    """Base reservation schema"""

    number_of_guests: int = Field(
        ge=1, le=50, description="Number of guests (max 50 per reservation)"
    )
    reservation_date: date
    reservation_time: time | None = None
    special_request: str | None = Field(
        None, max_length=500, description="Special requests (max 500 characters)"
    )

    @field_validator("reservation_date")
    @classmethod
    def validate_future_date(cls, v):
        """Ensure reservation date is not in the past"""
        if v < date.today():
            raise ValueError("Reservation date must be today or in the future")
        return v


class ReservationCreate(ReservationBase):
    """Schema for creating reservations"""

    client_id: UUID
    table_id: UUID | None = None
    duration_minutes: int | None = Field(default=None, ge=30, le=360)

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "number_of_guests": 4,
                    "reservation_date": "2024-12-25",
                    "reservation_time": "19:30:00",
                    "special_request": "Window seat please",
                    "client_id": "123e4567-e89b-12d3-a456-426614174000",
                    "table_id": "123e4567-e89b-12d3-a456-426614174001",
                    "duration_minutes": 120,
                }
            ]
        }
    }


class ReservationUpdate(BaseModel):
    """Schema for updating reservations"""

    status: ReservationStatus | None = None
    table_id: UUID | None = None
    note: str | None = Field(
        None, max_length=1000, description="Internal notes (max 1000 characters)"
    )
    no_show: bool | None = None
    duration_minutes: int | None = Field(default=None, ge=30, le=360)

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "status": "accepted",
                    "table_id": "123e4567-e89b-12d3-a456-426614174001",
                    "note": "VIP guest, prepare champagne",
                    "no_show": False,
                    "duration_minutes": 150,
                }
            ]
        }
    }


class ReservationRead(ReservationBase):
    """Schema for reading reservations"""

    id: UUID
    reference: str
    status: ReservationStatus
    source: ReservationSource
    note: str | None = None
    no_show: bool
    created_at: datetime
    accepted_at: datetime | None = None
    refused_at: datetime | None = None
    canceled_at: datetime | None = None
    establishment_id: UUID

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, *, strict=None, from_attributes=None, context=None):
        """Custom validation to map ORM model fields to schema fields"""
        if hasattr(obj, "uuid") and hasattr(obj, "reference"):
            # This is a Reservation model instance
            # establishment_uuid must be passed via context to map the FK integer to a UUID
            establishment_uuid = (context or {}).get("establishment_uuid")
            if establishment_uuid is None:
                raise ValueError(
                    "establishment_uuid must be provided in context when validating a Reservation instance"
                )
            data = {
                "id": obj.uuid,
                "reference": obj.reference,
                "number_of_guests": obj.number_of_guests,
                "reservation_date": obj.reservation_date,
                "reservation_time": obj.reservation_time,
                "status": obj.status,
                "source": obj.source,
                "special_request": obj.special_request,
                "note": obj.note,
                "no_show": obj.no_show,
                "created_at": obj.created_at,
                "accepted_at": obj.accepted_at,
                "refused_at": obj.refused_at,
                "canceled_at": obj.canceled_at,
                "establishment_id": establishment_uuid,
            }
            return cls.model_construct(**data)
        return super().model_validate(obj, strict=strict, from_attributes=from_attributes, context=context)


# Client-facing schemas for reservation flow
class NewReservationTokenRequest(BaseModel):
    """Request schema for new reservation token"""

    establishment_id: UUID


class NewReservationTokenResponse(BaseModel):
    """Response schema for new reservation token"""

    token: str
    expires_at: datetime


class ReservationForNewClientRequest(BaseModel):
    """Request schema for creating reservation with new client"""

    token: str
    full_name: str = Field(min_length=1, max_length=64)
    phone_number: str = Field(min_length=1, max_length=32)
    email: str | None = None
    number_of_guests: int = Field(ge=1)
    reservation_date: date
    reservation_time: time | None = None
    special_request: str | None = None


class ReservationForExistingClientRequest(BaseModel):
    """Request schema for creating reservation with existing client"""

    token: str
    phone_number: str = Field(min_length=1, max_length=32)
    number_of_guests: int = Field(ge=1)
    reservation_date: date
    reservation_time: time | None = None
    special_request: str | None = None


class CancelReservationRequest(BaseModel):
    """Request schema for canceling reservation"""

    token: str
    reference: str


class AvailableTablesRequest(BaseModel):
    """Request for getting available tables"""

    establishment_id: UUID | None = None
    reservation_date: date
    reservation_time: str
    number_of_guests: int


class ReservationWithClientRead(ReservationRead):
    """Reservation with full client details"""

    client: "ClientWithHistoryRead"


class ClientWithHistoryRead(BaseModel):
    """Client details with reservation history"""

    id: UUID
    full_name: str
    email: str | None = None
    phone_number: str
    is_vip: bool
    is_blacklisted: bool
    last_reservation_date: date | None = None
    total_accepted: int = 0
    total_canceled: int = 0
    total_refused: int = 0

    model_config = {"from_attributes": True}


class TableAvailabilityRead(BaseModel):
    """Available table with zone info"""

    id: UUID
    name: str
    type: str | None = None
    min_capacity: int
    max_capacity: int
    zone_name: str | None = None
    is_currently_available: bool = True

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "123e4567-e89b-12d3-a456-426614174000",
                    "name": "Table 5",
                    "min_capacity": 2,
                    "max_capacity": 4,
                    "zone_name": "Terrace",
                    "is_currently_available": True,
                }
            ]
        }
    }


class TableInfoRead(BaseModel):
    """Table information in reservation details"""

    id: str
    name: str
    type: str

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"id": "123e4567-e89b-12d3-a456-426614174000", "name": "Table 5", "type": "table"}
            ]
        }
    }


class ReservationDetailRead(BaseModel):
    """Detailed reservation information"""

    id: str
    reference: str
    number_of_guests: int
    reservation_date: str
    reservation_time: str | None = None
    status: ReservationStatus
    special_request: str | None = None
    note: str | None = None
    accepted_at: str | None = None
    refused_at: str | None = None
    canceled_at: str | None = None
    created_at: str
    establishment_id: str | None = None

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "123e4567-e89b-12d3-a456-426614174000",
                    "reference": "REF1234567890",
                    "number_of_guests": 4,
                    "reservation_date": "2024-12-25",
                    "reservation_time": "19:30:00",
                    "status": "pending",
                    "special_request": "Window seat please",
                    "note": "Regular customer",
                    "accepted_at": None,
                    "refused_at": None,
                    "canceled_at": None,
                    "created_at": "2024-12-20T10:30:00",
                    "establishment_id": "123e4567-e89b-12d3-a456-426614174001",
                }
            ]
        }
    }


class ClientDetailRead(BaseModel):
    """Client details with full history"""

    id: str
    full_name: str
    phone_number: str
    email: str | None = None
    is_vip: bool
    is_blacklisted: bool
    last_reservation_date: str | None = None
    total_accepted: int
    total_canceled: int
    total_refused: int

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "123e4567-e89b-12d3-a456-426614174002",
                    "full_name": "John Doe",
                    "phone_number": "+33612345678",
                    "email": "john.doe@example.com",
                    "is_vip": True,
                    "is_blacklisted": False,
                    "last_reservation_date": "2024-12-15",
                    "total_accepted": 15,
                    "total_canceled": 2,
                    "total_refused": 1,
                }
            ]
        }
    }


class ReservationDetailsResponse(BaseModel):
    """Complete reservation details with client and table info"""

    reservation: ReservationDetailRead
    client: ClientDetailRead
    table: TableInfoRead | None = None

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "reservation": {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "reference": "REF1234567890",
                        "number_of_guests": 4,
                        "reservation_date": "2024-12-25",
                        "reservation_time": "19:30:00",
                        "status": "pending",
                        "special_request": "Window seat please",
                        "note": "Regular customer",
                        "accepted_at": None,
                        "refused_at": None,
                        "canceled_at": None,
                        "created_at": "2024-12-20T10:30:00",
                        "establishment_id": "123e4567-e89b-12d3-a456-426614174001",
                    },
                    "client": {
                        "id": "123e4567-e89b-12d3-a456-426614174002",
                        "full_name": "John Doe",
                        "phone_number": "+33612345678",
                        "email": "john.doe@example.com",
                        "is_vip": True,
                        "is_blacklisted": False,
                        "last_reservation_date": "2024-12-15",
                        "total_accepted": 15,
                        "total_canceled": 2,
                        "total_refused": 1,
                    },
                    "table": {
                        "id": "123e4567-e89b-12d3-a456-426614174003",
                        "name": "Table 5",
                        "type": "table",
                    },
                }
            ]
        }
    }


class MessageResponse(BaseModel):
    """Generic message response"""

    message: str

    model_config = {
        "json_schema_extra": {"examples": [{"message": "Operation completed successfully"}]}
    }


class ReservationUrlResponse(BaseModel):
    """New reservation URL response"""

    url: str

    model_config = {
        "json_schema_extra": {"examples": [{"url": "https://example.com/reservation/token123"}]}
    }


class PaginatedReservationResponse(BaseModel):
    """Paginated response for reservations list"""

    items: list[ReservationWithClientRead]
    total: int = Field(..., description="Total number of items across all pages")
    page: int = Field(..., description="Current page number (1-indexed)")
    page_size: int = Field(..., description="Number of items per page")
    total_pages: int = Field(..., description="Total number of pages")
    next: str | None = Field(None, description="URL for the next page, if available")
    previous: str | None = Field(None, description="URL for the previous page, if available")

    model_config = ConfigDict(from_attributes=True)
