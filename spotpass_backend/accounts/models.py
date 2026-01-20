"""Account SQLModel models"""

from sqlmodel import Field, SQLModel


class Account(SQLModel, table=True):
    """Account model for multi-tenancy"""

    __tablename__ = "accounts"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    multi_establishment: bool = Field(default=False)
    country_code: str | None = Field(default=None)
    currency: str | None = Field(default=None)
    timezone: str | None = Field(default=None)

    def __str__(self) -> str:
        return self.name
