"""Security utilities for password hashing and JWT tokens"""

from datetime import datetime, timedelta
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from core.config import settings

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    identity: str,
    additional_claims: dict[str, Any] | None = None,
    expires_delta: timedelta | None = None,
) -> tuple[str, datetime]:
    """
    Create JWT access token.

    Args:
        identity: User identifier (usually user ID)
        additional_claims: Additional data to include in token
        expires_delta: Custom expiration time

    Returns:
        Tuple of (encoded JWT token, expiration datetime)
    """
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.jwt_access_token_expire_minutes)

    expire = datetime.utcnow() + expires_delta

    to_encode = {"sub": identity, "exp": expire, "iat": datetime.utcnow(), "type": "access"}

    if additional_claims:
        to_encode.update(additional_claims)

    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

    return encoded_jwt, expire


def create_refresh_token(
    identity: str,
    additional_claims: dict[str, Any] | None = None,
    expires_delta: timedelta | None = None,
) -> tuple[str, datetime]:
    """
    Create JWT refresh token.

    Args:
        identity: User identifier (usually user ID)
        additional_claims: Additional data to include in token
        expires_delta: Custom expiration time

    Returns:
        Tuple of (encoded JWT token, expiration datetime)
    """
    if expires_delta is None:
        expires_delta = timedelta(days=settings.jwt_refresh_token_expire_days)

    expire = datetime.utcnow() + expires_delta

    to_encode = {"sub": identity, "exp": expire, "iat": datetime.utcnow(), "type": "refresh"}

    if additional_claims:
        to_encode.update(additional_claims)

    encoded_jwt = jwt.encode(
        to_encode, settings.jwt_refresh_secret_key, algorithm=settings.jwt_algorithm
    )

    return encoded_jwt, expire


def decode_access_token(token: str) -> dict[str, Any] | None:
    """
    Decode and verify JWT access token.

    Args:
        token: JWT token string

    Returns:
        Token payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])

        # Verify it's an access token
        if payload.get("type") != "access":
            return None

        return payload
    except JWTError:
        return None


def decode_refresh_token(token: str) -> dict[str, Any] | None:
    """
    Decode and verify JWT refresh token.

    Args:
        token: JWT token string

    Returns:
        Token payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(
            token, settings.jwt_refresh_secret_key, algorithms=[settings.jwt_algorithm]
        )

        # Verify it's a refresh token
        if payload.get("type") != "refresh":
            return None

        return payload
    except JWTError:
        return None
