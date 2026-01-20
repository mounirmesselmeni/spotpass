"""
SpotPass Backend - FastAPI Application
Main application entry point
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import all models so SQLModel knows about them BEFORE creating tables
from accounts.models import Account  # noqa: F401
from clients.models import Client  # noqa: F401
from clients.routes import router as clients_router
from core.config import settings
from core.database import create_db_and_tables
from core.schemas import HealthResponse, RootResponse
from establishments.models import Establishment  # noqa: F401
from reservations.models import Reservation  # noqa: F401
from reservations.routes import (
    client_reservations_router,
    messenger_router,
    staff_reservations_router,
)
from tables.models import Table, Zone  # noqa: F401
from tables.routes import tables_router, zones_router
from users.models import BoUser, User  # noqa: F401
from users.routes import (
    bo_auth_router,
    bo_users_router,
    staff_auth_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("Creating database tables...")
    create_db_and_tables()
    print("Database tables created successfully")

    yield

    # Shutdown
    print("Shutting down...")


# Create FastAPI application
app = FastAPI(
    title="SpotPass Backend API",
    description="Restaurant reservation and management system",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
# Authentication
app.include_router(staff_auth_router)
app.include_router(bo_auth_router)

# Back office
app.include_router(bo_users_router)

# Staff endpoints
app.include_router(clients_router)
app.include_router(tables_router)
app.include_router(zones_router)
app.include_router(staff_reservations_router)

# Client endpoints (public)
app.include_router(client_reservations_router)

# Messenger bot
app.include_router(messenger_router)


@app.get("/", tags=["Health"], response_model=RootResponse)
def root():
    """Root endpoint - health check"""
    from core.schemas import RootResponse

    return RootResponse(message="SpotPass Backend API", version="1.0.0", status="healthy")


@app.get("/health", tags=["Health"], response_model=HealthResponse)
def health_check():
    """Health check endpoint"""
    from core.schemas import HealthResponse

    return HealthResponse(
        status="healthy",
        database="connected",
        redis="connected" if settings.redis_host else "not configured",
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("spotpass_backend.main:app", host="0.0.0.0", port=5001, reload=settings.debug)
