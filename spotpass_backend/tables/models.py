"""Table and Zone SQLModel models"""

from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel


class TableType(str, Enum):
    """Table type enumeration"""

    TABLE = "table"
    PARASOL = "parasol"
    HUT = "hut"


class Zone(SQLModel, table=True):
    """Zone model for organizing tables"""

    __tablename__ = "zones"

    id: int | None = Field(default=None, primary_key=True)
    uuid: UUID = Field(default_factory=uuid4, unique=True, index=True)
    name: str
    account_id: int = Field(foreign_key="accounts.id")
    establishment_id: int = Field(foreign_key="establishments.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Table(SQLModel, table=True):
    """Table model"""

    __tablename__ = "tables"

    id: int | None = Field(default=None, primary_key=True)
    uuid: UUID = Field(default_factory=uuid4, unique=True, index=True)
    name: str
    type: TableType = Field(default=TableType.TABLE)
    description: str | None = None
    is_on_service: bool = Field(default=True)
    min_capacity: int = Field(default=1, ge=1)
    max_capacity: int = Field(ge=1)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    zone_id: int | None = Field(default=None, foreign_key="zones.id")
    account_id: int = Field(foreign_key="accounts.id")
    establishment_id: int = Field(foreign_key="establishments.id")

    # Relationships
    zone: Zone | None = Relationship()

    def __str__(self) -> str:
        return str(self.id)
