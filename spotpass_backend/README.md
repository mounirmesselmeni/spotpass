# SpotPass Backend API (FastAPI)

Restaurant reservation and management system built with FastAPI, SQLModel, and Pydantic.

## Tech Stack

- **FastAPI** - Modern web framework for building APIs
- **SQLModel** - SQL database interactions with Pydantic integration
- **Pydantic** - Data validation and serialization
- **pytest** - Testing framework
- **uv** - Fast Python package installer and dependency manager

## Setup

### Prerequisites

- Python 3.11+
- uv (install via `pip install uv`)

### Installation

```bash
# Navigate to the spotpass_backend directory
cd spotpass_backend

# Create virtual environment and install dependencies
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -e ".[dev]"
```

### Running the Application

```bash
# Development server with auto-reload
uvicorn spotpass_backend.main:app --reload --port 5001

# Production server
uvicorn spotpass_backend.main:app --host 0.0.0.0 --port 5001
```

### Running Tests

```bash
pytest
```

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:5001/docs
- ReDoc: http://localhost:5001/redoc
- OpenAPI JSON: http://localhost:5001/openapi.json

## Project Structure

```
spotpass_backend/
├── accounts/          # Account models and routes
├── clients/           # Client management
├── establishments/    # Establishment models
├── reservations/      # Reservation system
├── tables/            # Table and zone management
├── users/             # User authentication and management
├── core/              # Core utilities (config, database, security)
├── tests/             # Test suite
├── main.py            # Application entry point
└── pyproject.toml     # Project dependencies and configuration
```

## Migration from Flask

This application has been migrated from Flask/APIFlask to FastAPI. Key changes:

1. **SQLAlchemy → SQLModel**: Models now use SQLModel for better Pydantic integration
2. **Marshmallow → Pydantic**: Schemas are now Pydantic models
3. **Flask-RESTful → FastAPI**: Routes use FastAPI's router system
4. **Flask-JWT-Extended → python-jose**: JWT handling with FastAPI dependencies
5. **Flask-Bcrypt → passlib**: Password hashing with passlib

## Configuration

Configuration is managed through environment variables and config files in `config/`.

Key environment variables:
- `APP_ENV`: Environment (dev/prod)
- `DATABASE_URL`: Database connection string
- `JWT_SECRET_KEY`: Secret key for JWT tokens
- `REDIS_HOST`: Redis server host
- `REDIS_PORT`: Redis server port
