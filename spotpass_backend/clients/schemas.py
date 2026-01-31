"""Client Pydantic schemas"""

import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from establishments.schemas import EstablishmentRead

# International phone number pattern (E.164 format)
PHONE_PATTERN = re.compile(r"^\+?[1-9]\d{1,14}$")


class ClientBase(BaseModel):
    """Base client schema"""

    full_name: str = Field(min_length=1, max_length=64, description="Client full name")
    email: EmailStr | None = None
    phone_number: str = Field(
        min_length=1, max_length=32, description="International phone number format"
    )
    messenger_id: str | None = Field(None, max_length=255, description="Messenger ID")
    is_vip: bool = False
    is_loyal: bool = False
    is_blacklisted: bool = False

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, v):
        """Validate phone number format (allow common formats, auto-clean)"""
        if v:
            # Remove common separators for validation
            cleaned = (
                v.replace(" ", "")
                .replace("-", "")
                .replace("(", "")
                .replace(")", "")
                .replace(".", "")
            )

            # Allow numbers with or without + prefix, between 8-15 digits
            if not re.match(r"^\+?[0-9]{8,15}$", cleaned):
                raise ValueError(
                    "Format de téléphone invalide. Utilisez un format international (ex: +33612345678) ou national (ex: 0612345678)"
                )
        return v

    @model_validator(mode="after")
    def check_contact_method(self):
        """Ensure at least one contact method is provided"""
        if not self.email and not self.phone_number:
            raise ValueError("At least one contact method (email or phone number) is required")
        return self


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
                    "is_vip": False,
                    "is_loyal": False,
                    "is_blacklisted": False,
                }
            ]
        }
    }


class ClientUpdate(BaseModel):
    """Schema for updating clients"""

    full_name: str | None = Field(default=None, min_length=1, max_length=64)
    email: EmailStr | None = None
    phone_number: str | None = Field(default=None, min_length=1, max_length=32)
    is_vip: bool | None = None
    is_loyal: bool | None = None
    is_blacklisted: bool | None = None


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
                "is_vip": obj.is_vip,
                "is_loyal": obj.is_loyal,
                "is_blacklisted": obj.is_blacklisted,
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
