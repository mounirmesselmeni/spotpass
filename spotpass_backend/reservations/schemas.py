"""Reservation Pydantic schemas"""

from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel, Field

from reservations.models import ReservationSource, ReservationStatus


class ReservationBase(BaseModel):
    """Base reservation schema"""

    number_of_guests: int = Field(ge=1)
    reservation_date: date
    reservation_time: time | None = None
    special_request: str | None = None


class ReservationCreate(ReservationBase):
    """Schema for creating reservations"""

    client_id: UUID
    table_id: UUID | None = None


class ReservationUpdate(BaseModel):
    """Schema for updating reservations"""

    status: ReservationStatus | None = None
    table_id: UUID | None = None
    note: str | None = None
    no_show: bool | None = None
    duration_minutes: int | None = Field(default=None, ge=30, le=360)


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
    def model_validate(cls, obj, *args, **kwargs):
        """Custom validation to map uuid to id"""
        if hasattr(obj, "uuid") and hasattr(obj, "reference"):
            # This is a Reservation model instance
            # Note: establishment_id will be set externally after fetching establishment
            import uuid as uuid_lib

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
                "establishment_id": uuid_lib.uuid4(),  # Will be overridden
            }
            return cls.model_construct(**data)
        return super().model_validate(obj, *args, **kwargs)


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
    min_capacity: int
    max_capacity: int
    zone_name: str | None = None
    is_currently_available: bool = True
