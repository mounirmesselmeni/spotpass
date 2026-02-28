"""User Pydantic schemas"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from accounts.schemas import AccountRead
from users.models import UserRole


class UserBase(BaseModel):
    """Base user schema"""

    first_name: str = Field(min_length=2, max_length=64)
    last_name: str = Field(min_length=2, max_length=64)
    email: EmailStr


class UserCreate(UserBase):
    """Schema for creating users"""

    password: str = Field(
        min_length=8,
        max_length=72,
        description="Password (min 8 chars, must include uppercase, lowercase, and number)",
    )
    role: UserRole
    account_id: int
    disabled: bool = False

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v):
        """Validate password strength requirements"""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v


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
    password: str = Field(
        min_length=8,
        max_length=72,
        description="Password (min 8 chars, must include uppercase, lowercase, and number)",
    )
    disabled: bool = False

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v):
        """Validate password strength requirements"""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v


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
    password: str = Field(min_length=6, max_length=72)

    model_config = {
        "json_schema_extra": {
            "examples": [{"email": "john.doe@restaurant.com", "password": "SecurePass123"}]
        }
    }


class LoginResponse(BaseModel):
    """Schema for login response with access and refresh tokens"""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until access token expires
    expires_at: datetime  # exact expiration datetime
    user: "UserInfo"

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    "token_type": "bearer",
                    "expires_in": 1800,
                    "expires_at": "2024-12-25T20:30:00",
                    "user": {
                        "id": 1,
                        "email": "john.doe@restaurant.com",
                        "first_name": "John",
                        "last_name": "Doe",
                        "full_name": "John Doe",
                        "user_type": "staff",
                        "role": "manager",
                        "account_id": 1,
                    },
                }
            ]
        }
    }


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


class ProfileUpdate(BaseModel):
    """Schema for updating user profile"""

    first_name: str | None = Field(None, min_length=2, max_length=64)
    last_name: str | None = Field(None, min_length=2, max_length=64)
    email: EmailStr | None = None


class PasswordChange(BaseModel):
    """Schema for changing password"""

    current_password: str = Field(min_length=1, max_length=72)
    new_password: str = Field(
        min_length=8,
        max_length=72,
        description="Password (min 8 chars, must include uppercase, lowercase, and number)",
    )

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v):
        """Validate password strength requirements"""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v


class DashboardStats(BaseModel):
    """Dashboard statistics schema"""

    total_clients: int
    total_tables: int
    total_reservations: int
    pending_reservations: int
    todays_reservations: int
    upcoming_reservations: int

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "total_clients": 150,
                    "total_tables": 20,
                    "total_reservations": 450,
                    "pending_reservations": 12,
                    "todays_reservations": 8,
                    "upcoming_reservations": 25,
                }
            ]
        }
    }
