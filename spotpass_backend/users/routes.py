"""User authentication routes"""

from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, status
from sqlmodel import func, select

from core.dependencies import BoUser as BoUserDep
from core.dependencies import CurrentUserId, DatabaseSession, StaffUser, TokenPayload
from core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
)
from users.models import BoUser, User
from users.schemas import (
    BoUserCreate,
    BoUserRead,
    DashboardStats,
    LoginResponse,
    PasswordChange,
    ProfileUpdate,
    RefreshTokenRequest,
    RefreshTokenResponse,
    UserInfo,
    UserLogin,
    UserRead,
)

router = APIRouter()

# Staff authentication
staff_auth_router = APIRouter(prefix="/api/staff/auth", tags=["Authentication"])


@staff_auth_router.post("/login", response_model=LoginResponse)
def staff_login(login_data: UserLogin, session: DatabaseSession):
    """Staff user login endpoint - returns access and refresh tokens"""

    statement = select(User).where(User.email == login_data.email)
    user = session.exec(statement).first()

    if user is None or not user.check_password(login_data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Email or password invalid"
        )

    if user.disabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled"
        )

    # Create access token
    access_token, access_expires = create_access_token(
        identity=str(user.id),
        additional_claims={
            "account": user.account_id,
            "user_type": "staff",
            "email": user.email,
            "role": user.role.value,
        },
    )

    # Create refresh token
    refresh_token, _ = create_refresh_token(
        identity=str(user.id), additional_claims={"user_type": "staff"}
    )

    # Calculate expires_in (seconds)
    expires_in = int((access_expires - datetime.now(UTC)).total_seconds())

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=expires_in,
        expires_at=access_expires,
        user=UserInfo(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            full_name=f"{user.first_name} {user.last_name}",
            user_type="staff",
            role=user.role.value,
            account_id=user.account_id,
        ),
    )


# Back office authentication
bo_auth_router = APIRouter(prefix="/api/bo/auth", tags=["Back Office"])


@bo_auth_router.post("/login", response_model=LoginResponse)
def bo_login(login_data: UserLogin, session: DatabaseSession):
    """Back office user login endpoint - returns access and refresh tokens"""

    statement = select(BoUser).where(BoUser.email == login_data.email)
    user = session.exec(statement).first()

    if user is None or not user.check_password(login_data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Email or password invalid"
        )

    if user.disabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled"
        )

    # Create access token
    access_token, access_expires = create_access_token(
        identity=str(user.id), additional_claims={"user_type": "bo", "email": user.email}
    )

    # Create refresh token
    refresh_token, _ = create_refresh_token(
        identity=str(user.id), additional_claims={"user_type": "bo"}
    )

    # Calculate expires_in (seconds)
    expires_in = int((access_expires - datetime.now(UTC)).total_seconds())

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=expires_in,
        expires_at=access_expires,
        user=UserInfo(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            full_name=f"{user.first_name} {user.last_name}",
            user_type="bo",
            role=None,
            account_id=None,
        ),
    )


# Refresh token endpoint
@staff_auth_router.post("/refresh", response_model=RefreshTokenResponse)
def refresh_staff_token(refresh_data: RefreshTokenRequest, session: DatabaseSession):
    """Refresh staff access token using refresh token"""

    payload = decode_refresh_token(refresh_data.refresh_token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token"
        )

    user_id = payload.get("sub")
    user_type = payload.get("user_type")

    if user_type != "staff":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    # Verify user still exists and is active
    statement = select(User).where(User.id == int(user_id))
    user = session.exec(statement).first()

    if user is None or user.disabled:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or disabled"
        )

    # Create new access token
    access_token, access_expires = create_access_token(
        identity=str(user.id),
        additional_claims={
            "account": user.account_id,
            "user_type": "staff",
            "email": user.email,
            "role": user.role.value,
        },
    )

    expires_in = int((access_expires - datetime.now(UTC)).total_seconds())

    return RefreshTokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
        expires_at=access_expires,
    )


@bo_auth_router.post("/refresh", response_model=RefreshTokenResponse)
def refresh_bo_token(refresh_data: RefreshTokenRequest, session: DatabaseSession):
    """Refresh back office access token using refresh token"""

    payload = decode_refresh_token(refresh_data.refresh_token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token"
        )

    user_id = payload.get("sub")
    user_type = payload.get("user_type")

    if user_type != "bo":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    # Verify user still exists and is active
    statement = select(BoUser).where(BoUser.id == int(user_id))
    user = session.exec(statement).first()

    if user is None or user.disabled:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or disabled"
        )

    # Create new access token
    access_token, access_expires = create_access_token(
        identity=str(user.id), additional_claims={"user_type": "bo", "email": user.email}
    )

    expires_in = int((access_expires - datetime.now(UTC)).total_seconds())

    return RefreshTokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
        expires_at=access_expires,
    )


# /me endpoints for getting current user info
@staff_auth_router.get("/me", response_model=UserRead)
def get_current_staff_user(
    session: DatabaseSession, user_id: CurrentUserId, token_payload: TokenPayload
):
    """Get current staff user information"""

    if token_payload.get("user_type") != "staff":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a staff user")

    statement = select(User).where(User.id == int(user_id))
    user = session.exec(statement).first()

    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return user


@bo_auth_router.get("/me", response_model=BoUserRead)
def get_current_bo_user(
    session: DatabaseSession, user_id: CurrentUserId, token_payload: TokenPayload
):
    """Get current back office user information"""

    if token_payload.get("user_type") != "bo":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a back office user")

    statement = select(BoUser).where(BoUser.id == int(user_id))
    user = session.exec(statement).first()

    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return user


@staff_auth_router.put("/me", response_model=UserRead)
def update_staff_profile(
    profile_data: ProfileUpdate,
    session: DatabaseSession,
    user_id: CurrentUserId,
    token_payload: TokenPayload,
):
    """Update current staff user profile"""

    if token_payload.get("user_type") != "staff":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a staff user")

    statement = select(User).where(User.id == int(user_id))
    user = session.exec(statement).first()

    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = profile_data.model_dump(exclude_unset=True)

    if "email" in update_data and update_data["email"] != user.email:
        existing = session.exec(select(User).where(User.email == update_data["email"])).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
            )

    for key, value in update_data.items():
        setattr(user, key, value)

    session.add(user)
    session.commit()
    session.refresh(user)

    return user


@bo_auth_router.put("/me", response_model=BoUserRead)
def update_bo_profile(
    profile_data: ProfileUpdate,
    session: DatabaseSession,
    user_id: CurrentUserId,
    token_payload: TokenPayload,
):
    """Update current back office user profile"""

    if token_payload.get("user_type") != "bo":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a back office user")

    statement = select(BoUser).where(BoUser.id == int(user_id))
    user = session.exec(statement).first()

    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = profile_data.model_dump(exclude_unset=True)

    if "email" in update_data and update_data["email"] != user.email:
        existing = session.exec(select(BoUser).where(BoUser.email == update_data["email"])).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
            )

    for key, value in update_data.items():
        setattr(user, key, value)

    session.add(user)
    session.commit()
    session.refresh(user)

    return user


@staff_auth_router.post("/change-password", status_code=status.HTTP_200_OK)
def change_staff_password(
    password_data: PasswordChange,
    session: DatabaseSession,
    user_id: CurrentUserId,
    token_payload: TokenPayload,
):
    """Change current staff user password"""

    if token_payload.get("user_type") != "staff":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a staff user")

    statement = select(User).where(User.id == int(user_id))
    user = session.exec(statement).first()

    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not user.check_password(password_data.current_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect"
        )

    user.password = password_data.new_password
    user.hash_password()
    session.add(user)
    session.commit()

    return {"message": "Password changed successfully"}


@bo_auth_router.post("/change-password", status_code=status.HTTP_200_OK)
def change_bo_password(
    password_data: PasswordChange,
    session: DatabaseSession,
    user_id: CurrentUserId,
    token_payload: TokenPayload,
):
    """Change current back office user password"""

    if token_payload.get("user_type") != "bo":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a back office user")

    statement = select(BoUser).where(BoUser.id == int(user_id))
    user = session.exec(statement).first()

    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not user.check_password(password_data.current_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect"
        )

    user.password = password_data.new_password
    user.hash_password()
    session.add(user)
    session.commit()

    return {"message": "Password changed successfully"}


# Dashboard stats endpoint
@staff_auth_router.get("/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(session: DatabaseSession, token_payload: StaffUser):
    """Get dashboard statistics for the current user's account"""

    from datetime import date

    from clients.models import Client
    from reservations.models import Reservation, ReservationStatus
    from tables.models import Table

    account_id = token_payload.get("account")

    # Count total clients
    total_clients = session.exec(
        select(func.count(Client.id)).where(Client.account_id == account_id)
    ).one()

    # Count total tables
    total_tables = session.exec(
        select(func.count(Table.id)).where(Table.account_id == account_id)
    ).one()

    # Count total reservations
    total_reservations = session.exec(
        select(func.count(Reservation.id)).where(Reservation.account_id == account_id)
    ).one()

    # Count pending reservations
    pending_reservations = session.exec(
        select(func.count(Reservation.id)).where(
            Reservation.account_id == account_id, Reservation.status == ReservationStatus.PENDING
        )
    ).one()

    # Count today's reservations
    today = date.today()
    todays_reservations = session.exec(
        select(func.count(Reservation.id)).where(
            Reservation.account_id == account_id, Reservation.reservation_date == today
        )
    ).one()

    # Count upcoming reservations (future dates)
    upcoming_reservations = session.exec(
        select(func.count(Reservation.id)).where(
            Reservation.account_id == account_id,
            Reservation.reservation_date > today,
            Reservation.status != ReservationStatus.CANCELED,
        )
    ).one()

    return DashboardStats(
        total_clients=total_clients,
        total_tables=total_tables,
        total_reservations=total_reservations,
        pending_reservations=pending_reservations,
        todays_reservations=todays_reservations,
        upcoming_reservations=upcoming_reservations,
    )


# Back office user management
bo_users_router = APIRouter(prefix="/api/bo", tags=["Back Office"])


@bo_users_router.get("/bo-users", response_model=list[BoUserRead])
def list_bo_users(session: DatabaseSession, token_payload: BoUserDep):
    """List all back office users (BO only)"""
    statement = select(BoUser)
    users = session.exec(statement).all()
    return users


@bo_users_router.post("/bo-users", response_model=BoUserRead, status_code=status.HTTP_201_CREATED)
def create_bo_user(user_data: BoUserCreate, session: DatabaseSession, token_payload: BoUserDep):
    """Create a new back office user (BO only)"""

    # Check if email already exists
    statement = select(BoUser).where(BoUser.email == user_data.email)
    existing_user = session.exec(statement).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    # Create new user
    new_user = BoUser(**user_data.model_dump())
    new_user.hash_password()

    session.add(new_user)
    session.commit()
    session.refresh(new_user)

    return new_user


@bo_users_router.get("/fo-users", response_model=list[UserRead])
def list_fo_users(session: DatabaseSession, token_payload: BoUserDep):
    """List all front office (staff) users (BO only)"""
    statement = select(User)
    users = session.exec(statement).all()
    return users
