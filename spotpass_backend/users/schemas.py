"""User Pydantic schemas"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from accounts.schemas import AccountRead
from users.models import UserRole


class UserBase(BaseModel):
    """Base user schema"""

    first_name: str = Field(min_length=2, max_length=64)
    last_name: str = Field(min_length=2, max_length=64)
    email: EmailStr


class UserCreate(UserBase):
    """Schema for creating users"""

    password: str = Field(min_length=6, max_length=32)
    role: UserRole
    account_id: int
    disabled: bool = False


class UserUpdate(BaseModel):
    """Schema for updating users"""

    first_name: str | None = Field(None, min_length=2, max_length=64)
    last_name: str | None = Field(None, min_length=2, max_length=64)
    email: EmailStr | None = None
    role: UserRole | None = None
    disabled: bool | None = None


class UserRead(UserBase):
    """Schema for reading users"""

    id: int
    role: UserRole
    disabled: bool
    account: AccountRead | None = None

    model_config = {"from_attributes": True}


class BoUserCreate(BaseModel):
    """Schema for creating BO users"""

    first_name: str = Field(min_length=2, max_length=64)
    last_name: str = Field(min_length=2, max_length=64)
    email: EmailStr
    password: str = Field(min_length=6, max_length=32)
    disabled: bool = False


class BoUserRead(BaseModel):
    """Schema for reading BO users"""

    id: int
    first_name: str
    last_name: str
    email: EmailStr
    disabled: bool

    model_config = {"from_attributes": True}


class UserLogin(BaseModel):
    """Schema for user login"""

    email: EmailStr
    password: str = Field(min_length=6, max_length=32)


class LoginResponse(BaseModel):
    """Schema for login response with access and refresh tokens"""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until access token expires
    expires_at: datetime  # exact expiration datetime
    user: "UserInfo"


class UserInfo(BaseModel):
    """User information included in login response"""

    id: int
    email: str
    first_name: str
    last_name: str
    full_name: str
    user_type: str  # "staff" or "bo"
    role: str | None = None  # Only for staff users
    account_id: int | None = None  # Only for staff users


class RefreshTokenRequest(BaseModel):
    """Schema for refresh token request"""

    refresh_token: str


class RefreshTokenResponse(BaseModel):
    """Schema for refresh token response"""

    access_token: str
    token_type: str = "bearer"
    expires_in: int
    expires_at: datetime


class DashboardStats(BaseModel):
    """Dashboard statistics schema"""

    total_clients: int
    total_tables: int
    total_reservations: int
    pending_reservations: int
    todays_reservations: int
    upcoming_reservations: int
