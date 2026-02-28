"""Reservation SQLModel models"""

from datetime import UTC, date, datetime, time
from enum import Enum
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class ReservationStatus(str, Enum):
    """Reservation status enumeration"""

    PENDING = "pending"
    ACCEPTED = "accepted"
    REFUSED = "refused"
    CANCELED = "canceled"


class ReservationSource(str, Enum):
    """Reservation source enumeration"""

    MESSENGER = "messenger"
    BACKOFFICE = "staff"


class Reservation(SQLModel, table=True):
    """Reservation model"""

    __tablename__ = "reservations"

    id: int | None = Field(default=None, primary_key=True)
    uuid: UUID = Field(default_factory=uuid4, unique=True, index=True)
    reference: str = Field(unique=True, index=True)
    number_of_guests: int
    reservation_date: date
    reservation_time: time | None = None
    status: ReservationStatus = Field(default=ReservationStatus.PENDING)
    source: ReservationSource = Field(default=ReservationSource.BACKOFFICE)
    special_request: str | None = None
    note: str | None = None
    no_show: bool = Field(default=False)
    duration_minutes: int | None = Field(
        default=120, ge=30, le=360
    )  # 30min to 6 hours, default 2 hours
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    accepted_at: datetime | None = None
    refused_at: datetime | None = None
    canceled_at: datetime | None = None
    table_id: int | None = Field(default=None, foreign_key="tables.id")
    client_id: int = Field(foreign_key="clients.id")
    account_id: int = Field(foreign_key="accounts.id")
    establishment_id: int = Field(foreign_key="establishments.id")

    def __str__(self) -> str:
        return str(self.id)
