"""Account Pydantic schemas"""

from pydantic import BaseModel


class AccountBase(BaseModel):
    """Base account schema"""

    name: str
    multi_establishment: bool = False
    country_code: str | None = None
    currency: str | None = None
    timezone: str | None = None


class AccountCreate(AccountBase):
    """Schema for creating accounts"""

    pass


class AccountUpdate(BaseModel):
    """Schema for updating accounts"""

    name: str | None = None
    multi_establishment: bool | None = None
    country_code: str | None = None
    currency: str | None = None
    timezone: str | None = None


class AccountRead(AccountBase):
    """Schema for reading accounts"""

    id: int

    model_config = {"from_attributes": True}
