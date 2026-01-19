"""User SQLModel models"""

from enum import Enum

from sqlmodel import Field, SQLModel

from core.security import hash_password, verify_password


class UserRole(str, Enum):
    """User role enumeration"""

    ADMIN = "admin"
    SUPER_USER = "super_user"
    READ_ONLY = "read_only"


class User(SQLModel, table=True):
    """Staff user model"""

    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    first_name: str
    last_name: str
    email: str = Field(unique=True, index=True)
    password: str
    account_id: int = Field(foreign_key="accounts.id")
    disabled: bool = Field(default=False)
    role: UserRole = Field(default=UserRole.READ_ONLY)

    def hash_password(self):
        """Hash the password"""
        self.password = hash_password(self.password)

    def check_password(self, password: str) -> bool:
        """Verify password"""
        return verify_password(password, self.password)

    def __str__(self) -> str:
        return f"{self.first_name} {self.last_name}"


class BoUser(SQLModel, table=True):
    """Back office user model"""

    __tablename__ = "bo_users"

    id: int | None = Field(default=None, primary_key=True)
    first_name: str
    last_name: str
    email: str = Field(unique=True, index=True)
    password: str
    disabled: bool = Field(default=False)

    def hash_password(self):
        """Hash the password"""
        self.password = hash_password(self.password)

    def check_password(self, password: str) -> bool:
        """Verify password"""
        return verify_password(password, self.password)

    def __str__(self) -> str:
        return f"{self.first_name} {self.last_name}"
