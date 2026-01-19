"""Establishment SQLModel models"""

from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class Establishment(SQLModel, table=True):
    """Establishment (restaurant) model"""

    __tablename__ = "establishments"

    id: int | None = Field(default=None, primary_key=True)
    uuid: UUID = Field(default_factory=uuid4, unique=True, index=True)
    name: str
    address: str
    account_id: int = Field(foreign_key="accounts.id")

    def __str__(self) -> str:
        return self.name
