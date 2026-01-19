"""FastAPI dependencies for authentication and authorization"""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from core.database import get_session
from core.security import decode_access_token

security = HTTPBearer()


async def get_current_user_id(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
) -> str:
    """
    Get current user ID from JWT token.

    Raises:
        HTTPException: If token is invalid or expired

    Returns:
        User ID from token
    """
    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user_id


async def get_token_payload(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
) -> dict:
    """
    Get full JWT token payload.

    Returns:
        Complete token payload including custom claims
    """
    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


async def require_staff_user(payload: Annotated[dict, Depends(get_token_payload)]) -> dict:
    """
    Require user to be staff or back office user.

    Raises:
        HTTPException: If user is not staff or BO

    Returns:
        Token payload
    """
    user_type = payload.get("user_type")
    if user_type not in ["staff", "bo"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff access required")

    return payload


async def require_bo_user(payload: Annotated[dict, Depends(get_token_payload)]) -> dict:
    """
    Require user to be back office user.

    Raises:
        HTTPException: If user is not BO

    Returns:
        Token payload
    """
    user_type = payload.get("user_type")
    if user_type != "bo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Back office access required"
        )

    return payload


# Type aliases for cleaner dependency injection
CurrentUserId = Annotated[str, Depends(get_current_user_id)]
TokenPayload = Annotated[dict, Depends(get_token_payload)]
StaffUser = Annotated[dict, Depends(require_staff_user)]
BoUser = Annotated[dict, Depends(require_bo_user)]
DatabaseSession = Annotated[Session, Depends(get_session)]
