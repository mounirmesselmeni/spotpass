# AGENTS.md

## Project Overview

This is a monorepo containing a restaurant reservation and management system (SpotPass) with two main components:

- **Frontend**: Modern React 18 application with TypeScript, built with Vite, using Mantine UI v7, React Query (TanStack Query), and Zustand for state management
- **Backend**: FastAPI-based REST API with SQLModel for database interactions, Pydantic for validation, JWT authentication, and comprehensive table availability service

The system allows restaurants to manage reservations, tables, clients, and establishments through a web interface backed by a robust API. Key features include:

- Multi-step reservation wizard with real-time table availability
- Calendar view for reservation management
- Visual table availability grid by zone
- Duration-based conflict detection with overnight reservation support
- Database locking to prevent race conditions
- Full French language support

## Monorepo Structure

- `frontend/`: React/TypeScript frontend application
- `spotpass_backend/`: Python FastAPI backend API

Each component has its own package management and can be developed independently, but they work together as a complete system.

## Setup Commands

### Prerequisites

- Node.js 18+ (for frontend)
- Python 3.11+ (for backend)
- Yarn 4+ (for frontend package management)
- uv (for Python dependency management)

### Frontend Setup

```bash
cd frontend
# Enable Yarn 4 if not already enabled
corepack enable
yarn set version 4.0.2
# Install dependencies
yarn install
# Generate API client from OpenAPI schema
yarn generate:api
```

### Backend Setup

```bash
cd spotpass_backend
# Create virtual environment
uv venv
# Activate environment (macOS/Linux)
source .venv/bin/activate
# Activate environment (Windows)
# .venv\Scripts\activate
# Install dependencies with dev extras
uv sync --dev
```

### Environment Variables

**Frontend** - Create `.env` file in frontend directory:

```bash
VITE_API_URL=http://localhost:5001
```

**Backend** - Create `.env` file in spotpass_backend directory (if needed):

```bash
DATABASE_URL=sqlite:///./spotpass.db
SECRET_KEY=your-secret-key-here
```

## Development Workflow

### Starting Development Servers

**Frontend** (runs on http://localhost:3000):

```bash
cd frontend
yarn dev
```

**Backend** (runs on http://localhost:5001):

```bash
cd spotpass_backend
# With auto-reload for development
uv run uvicorn spotpass_backend.main:app --reload --port 5001
```

### Hot Reload and Watch Mode

- Frontend: Vite provides automatic hot reload on file changes
- Backend: uvicorn --reload enables auto-restart on Python file changes

### API Client Generation

When backend API changes, regenerate the frontend API client:

```bash
cd frontend
yarn generate:api
```

## Testing Instructions

### Backend Testing

```bash
cd spotpass_backend

# Run all tests
uv run pytest

# Run all tests with coverage (minimum 85%)
uv run pytest --cov=. --cov-report=html --cov-report=term

# Run specific test file
uv run pytest tests/test_filename.py -v

# Run specific test
uv run pytest tests/test_file.py::TestClass::test_method -v

# Run tests matching pattern
uv run pytest -k "reservation" -v

# Quick quality check (linting + formatting + tests)
./check.sh
```

**Test configuration:**

- Tests located in `tests/` directory
- Coverage target: **85%+ (currently 87%)**
- Coverage reports in `htmlcov/` directory
- Uses pytest-asyncio for async tests
- Factory Boy for test data generation
- 107+ tests covering all major features

**Test categories:**

- Unit tests: Core business logic
- Integration tests: End-to-end workflows
- Service tests: Table availability (26 tests)
- Coverage tests: Routes and edge cases

### Frontend Testing

**Manual testing recommended. Focus on:**

- TypeScript compilation: `yarn typecheck`
- Linting: `yarn lint`
- Formatting check: `yarn format:check`
- Build verification: `yarn build`
- Preview production build: `yarn preview`

**Run all checks:**

```bash
cd frontend
yarn typecheck && yarn lint && yarn format:check && yarn build
```

**Note:** Automated test suite (Jest/Vitest) not yet configured. Focus on TypeScript type safety and manual testing.

## Code Style Guidelines

### Python (Backend)

- **Linter/Formatter**: Ruff with line length 100
- **Rules**:
  - pycodestyle (E, W)
  - pyflakes (F)
  - isort (I) - import sorting
  - flake8-bugbear (B)
  - flake8-comprehensions (C4)
  - pyupgrade (UP)
  - pep8-naming (N)
  - flake8-bandit (S) - security checks
  - flake8-print (T20)
- **Import sorting**: Configured with known-first-party modules
- **Ignored rules**: E501, B008, C901, S101 (assert in tests), T201 (print in CLI)
- **Per-file ignores**: Tests allow asserts, CLI allows prints

**Run linting:**

```bash
cd spotpass_backend
# Check for issues
uv run ruff check .

# Auto-fix issues
uv run ruff check . --fix

# Check formatting
uv run ruff format --check .

# Apply formatting
uv run ruff format .

# Run all checks (recommended before commit)
./check.sh
```

### TypeScript/JavaScript (Frontend)

- **Linter**: ESLint with TypeScript support
- **Formatter**: Prettier
- **Type checking**: TypeScript compiler

Run linting and formatting:

```bash
cd frontend
yarn lint
yarn format
yarn typecheck
```

### File Organization

- **Frontend**: Component-based structure in `src/`, with separate directories for components, hooks, pages, stores, etc.
- **Backend**: Module-based structure with separate packages for accounts, clients, establishments, reservations, tables, users

## Build and Deployment

### Frontend Build

```bash
cd frontend
# Type check and build
yarn build
# Preview production build
yarn preview
```

Output: `dist/` directory with optimized static files

### Backend Build

No separate build step required. For production:

```bash
cd spotpass_backend
uv run uvicorn spotpass_backend.main:app --host 0.0.0.0 --port 5001
```

### Database

- Default: SQLite (development)
- Production: PostgreSQL recommended
- Migrations: Alembic for schema changes

## Security Considerations

- **JWT authentication** with access and refresh tokens
- **Password hashing** with bcrypt
- **CORS configuration** for frontend-backend communication
- **Input validation** with Pydantic models
- **Database locking** (SELECT FOR UPDATE) to prevent race conditions
- **Security linting** with flake8-bandit (Ruff)
- **Auth state management** through Zustand store (single source of truth)
- **Redis integration** for caching (optional, not currently used)

## Pull Request Guidelines

### Title Format

- `[frontend] Brief description of changes`
- `[backend] Brief description of changes`
- `[docs] Update documentation`

### Required Checks Before Submission

1. **Backend**: Run `pytest` to ensure all tests pass
2. **Backend**: Run `ruff check . && ruff format .` for code quality
3. **Frontend**: Run `yarn lint && yarn typecheck && yarn build` to ensure no errors
4. **Frontend**: Run `yarn format:check` to verify formatting

### Review Process

- At least one reviewer required
- All automated checks must pass
- Tests should maintain or improve coverage
- Breaking changes require discussion

## Additional Notes

### Common Development Patterns

- **API Communication**: Frontend uses generated API client (Orval) with React Query for caching and error handling
- **State Management**:
  - Zustand stores for global state (auth, theme)
  - React Query for server state
  - **Auth store is single source of truth** - do NOT use localStorage directly for auth
- **Authentication**:
  - JWT tokens with automatic refresh on 401 responses
  - Tokens stored in Zustand with persist middleware
  - Axios interceptors read from store (not localStorage)
- **Internationalization**: i18next setup for multi-language support (French primary)
- **Table Availability**: Centralized `TableAvailabilityService` for conflict detection
- **Database Locking**: Pessimistic locking (SELECT FOR UPDATE) prevents double bookings

### Troubleshooting

**Common Issues:**

- **Port conflicts**: Ensure ports 3000 (frontend) and 5001 (backend) are available
- **API connection issues**:
  - Verify VITE_API_URL environment variable
  - Check backend is running on correct port
  - Check CORS configuration
- **Import errors**: Run `yarn generate:api` after backend schema changes
- **Database issues**:
  - Check SQLite file permissions
  - Run migrations if needed
  - PostgreSQL connection settings for production
- **Auth issues**:
  - Clear localStorage and restart if state seems corrupted
  - Check Zustand persist middleware is working
  - Verify JWT secret is consistent
- **Test failures**:
  - Run `pytest --lf` to re-run last failed tests
  - Check factory data is being committed
  - Verify test database isolation
- **Linting errors**: Run `ruff check . --fix` to auto-fix
- **Build errors**:
  - Clear node_modules and reinstall: `rm -rf node_modules && yarn install`
  - Clear Python cache: `find . -type d -name __pycache__ -exec rm -r {} +`

### Performance Considerations

- Frontend bundle size monitoring (current: ~231KB gzipped)
- React Query caching for API responses
- Lazy loading for routes and components
- Database indexes for reservation/table queries
- Redis caching for backend performance (optional, not currently implemented)

### CI/CD Pipeline

**GitHub Actions**: `.github/workflows/ci.yml`

**Automated checks on PR and push:**

- Backend: Ruff linting, formatting, tests with 85%+ coverage
- Frontend: TypeScript check, ESLint, Prettier, build
- Quality gate: All checks must pass

**Run locally before pushing:**

```bash
# Backend
cd spotpass_backend && ./check.sh

# Frontend
cd frontend && yarn typecheck && yarn lint && yarn format:check && yarn build
```

### Key Services & Features

**Table Availability Service** (`spotpass_backend/reservations/services.py`):

- Centralized business logic for table availability
- Prevents double bookings with duration-based conflict detection
- Handles edge cases: exact boundaries, overnight reservations, multi-day
- Database locking (SELECT FOR UPDATE) prevents race conditions
- 26 comprehensive tests with 98% coverage
- Reusable across all reservation endpoints

**Documentation:**

- `spotpass_backend/reservations/SERVICE_DOCUMENTATION.md` - API reference
- `spotpass_backend/TABLE_AVAILABILITY_IMPLEMENTATION_SUMMARY.md` - Implementation details
- `spotpass_backend/INTEGRATION_COMPLETE.md` - Integration guide
- `spotpass_backend/TESTING_AND_CI.md` - Testing guide
- `frontend/AUTH_IMPROVEMENTS.md` - Auth state management guide

### Frontend UI Features

**Reservation Management:**

- **List View**: Traditional table with advanced filters
- **Calendar View**: Monthly overview with daily reservation details
- **Table Grid View**: Visual availability by zone with color coding
- **Wizard**: Multi-step reservation creation with validation

**Components:**

- `ReservationWizard.tsx` - 3-step guided reservation creation
- `ReservationCalendar.tsx` - Calendar view with filtering
- `TableAvailabilityGrid.tsx` - Visual table availability

**State Management Best Practices:**

- Use Zustand store for auth (single source of truth)
- Do NOT use localStorage directly for auth operations
- Axios reads from store via `useAuthStore.getState()`
- Zustand persist middleware handles localStorage automatically

This AGENTS.md file provides the essential context for coding agents to work effectively across both frontend and backend components of this restaurant management system.
