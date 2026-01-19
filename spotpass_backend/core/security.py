"""Security utilities for password hashing and JWT tokens"""

import hashlib
from datetime import datetime, timedelta
from typing import Any

from jose import JWTError, jwt

from core.config import settings


def hash_password(password: str) -> str:
    """Hash a password using PBKDF2"""
    # Simple PBKDF2 implementation for development
    salt = b'static_salt_for_dev'  # In production, use a random salt
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000)
    return f'pbkdf2_sha256$100000${salt.hex()}${hashed.hex()}'


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    try:
        method, iterations, salt_hex, hash_hex = hashed_password.split('$')
        if method != 'pbkdf2_sha256':
            return False
        salt = bytes.fromhex(salt_hex)
        iterations = int(iterations)
        expected_hash = hashlib.pbkdf2_hmac('sha256', plain_password.encode(), salt, iterations)
        return expected_hash.hex() == hash_hex
    except (ValueError, TypeError):
        return False


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
