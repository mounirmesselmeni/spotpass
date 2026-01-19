"""Client SQLModel models"""

from datetime import datetime
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class Client(SQLModel, table=True):
    """Client model"""

    __tablename__ = "clients"

    id: int | None = Field(default=None, primary_key=True)
    uuid: UUID = Field(default_factory=uuid4, unique=True, index=True)
    full_name: str
    phone_number: str
    email: str | None = None
    messenger_id: str | None = None
    is_vip: bool = Field(default=False)
    is_blacklisted: bool = Field(default=False)
    account_id: int = Field(foreign_key="accounts.id")
    establishment_id: int = Field(foreign_key="establishments.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    def __str__(self) -> str:
        return str(self.id)
