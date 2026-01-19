# AGENTS.md

## Project Overview

This is a monorepo containing a restaurant reservation and management system with two main components:

- **Frontend**: Modern React 18 application with TypeScript, built with Vite, using Mantine UI, React Query, and Zustand for state management
- **Backend**: FastAPI-based REST API with SQLModel for database interactions, Pydantic for validation, and JWT authentication

The system allows restaurants to manage reservations, tables, clients, and establishments through a web interface backed by a robust API.

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
# Install dependencies with dev extras
uv pip install -e ".[dev]"
```

### Environment Variables

Create `.env` file in frontend directory:

```
VITE_API_URL=http://localhost:5001
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
uvicorn spotpass_backend.main:app --reload --port 5001
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
# Run all tests with coverage
pytest
# Run specific test file
pytest tests/test_filename.py
# Run with coverage report
pytest --cov=. --cov-report=html
```

Test configuration:

- Tests located in `tests/` directory
- Coverage reports generated in `htmlcov/` directory
- Uses pytest-asyncio for async tests
- Factory Boy for test data generation

### Frontend Testing

Currently no automated test suite configured. Focus on:

- TypeScript compilation: `yarn typecheck`
- Linting: `yarn lint`
- Build verification: `yarn build`

## Code Style Guidelines

### Python (Backend)

- **Linter/Formatter**: Ruff with line length 100
- **Rules**: pycodestyle (E, W), pyflakes (F), isort (I), flake8-bugbear (B), flake8-comprehensions (C4), pyupgrade (UP)
- **Import sorting**: Configured with known-first-party modules
- **Ignored rules**: E501 (line length), B008, C901, W191, E712

Run linting:

```bash
cd spotpass_backend
ruff check .
ruff format .
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
uvicorn spotpass_backend.main:app --host 0.0.0.0 --port 5001
```

### Database

- Default: SQLite (development)
- Production: PostgreSQL recommended
- Migrations: Alembic for schema changes

## Security Considerations

- JWT authentication with access and refresh tokens
- Password hashing with bcrypt
- CORS configuration for frontend-backend communication
- Input validation with Pydantic models
- Redis integration for caching (optional)

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

- **API Communication**: Frontend uses generated API client with React Query for caching and error handling
- **State Management**: Zustand stores for global state, React Query for server state
- **Authentication**: JWT tokens with automatic refresh on 401 responses
- **Internationalization**: i18next setup for multi-language support

### Troubleshooting

- **Port conflicts**: Ensure ports 3000 (frontend) and 5001 (backend) are available
- **API connection issues**: Verify VITE_API_URL environment variable and backend is running
- **Import errors**: Run `yarn generate:api` after backend schema changes
- **Database issues**: Check SQLite file permissions or PostgreSQL connection settings

### Performance Considerations

- Frontend bundle size monitoring (current: ~585KB gzipped)
- React Query caching for API responses
- Lazy loading for routes and components
- Redis caching for backend performance (optional)

This AGENTS.md file provides the essential context for coding agents to work effectively across both frontend and backend components of this restaurant management system.
