"""Client Pydantic schemas"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from establishments.schemas import EstablishmentRead


class ClientBase(BaseModel):
    """Base client schema"""

    full_name: str = Field(min_length=1, max_length=64)
    email: EmailStr | None = None
    phone_number: str = Field(min_length=1, max_length=32)
    messenger_id: str | None = None
    is_blacklisted: bool = False
    is_vip: bool = False


class ClientCreate(ClientBase):
    """Schema for creating clients"""

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "full_name": "Jane Smith",
                    "email": "jane.smith@example.com",
                    "phone_number": "+33612345678",
                    "messenger_id": "messenger_12345",
                    "is_blacklisted": False,
                    "is_vip": False,
                }
            ]
        }
    }


class ClientUpdate(BaseModel):
    """Schema for updating clients"""

    full_name: str | None = Field(default=None, min_length=1, max_length=64)
    email: EmailStr | None = None
    phone_number: str | None = Field(default=None, min_length=1, max_length=32)
    is_blacklisted: bool | None = None
    is_vip: bool | None = None


class ReservationHistory(BaseModel):
    """Reservation history stats"""

    last_reservation: str | None = None
    total_reservations: int = 0
    total_accepted_reservations: int = 0
    total_refused_reservations: int = 0
    total_canceled_reservations: int = 0
    total_no_show: int = 0


class ClientRead(ClientBase):
    """Schema for reading clients"""

    id: UUID
    created_at: datetime
    establishment: EstablishmentRead | None = None
    reservation_history: ReservationHistory = Field(default_factory=ReservationHistory)

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        """Custom validation to map uuid to id"""
        if hasattr(obj, "uuid") and hasattr(obj, "full_name"):
            # This is a Client model instance
            data = {
                "id": obj.uuid,
                "full_name": obj.full_name,
                "email": obj.email,
                "phone_number": obj.phone_number,
                "messenger_id": obj.messenger_id,
                "is_blacklisted": obj.is_blacklisted,
                "is_vip": obj.is_vip,
                "created_at": obj.created_at,
                "reservation_history": ReservationHistory(),
            }
            return cls.model_construct(**data)
        return super().model_validate(obj, *args, **kwargs)


class PaginatedClientResponse(BaseModel):
    """Paginated response for clients list"""

    items: list[ClientRead]
    total: int = Field(..., description="Total number of items across all pages")
    page: int = Field(..., description="Current page number (1-indexed)")
    page_size: int = Field(..., description="Number of items per page")
    total_pages: int = Field(..., description="Total number of pages")
    next: str | None = Field(None, description="URL for the next page, if available")
    previous: str | None = Field(None, description="URL for the previous page, if available")

    model_config = {"from_attributes": True}
