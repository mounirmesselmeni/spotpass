# SpotPass - Restaurant Reservation System

A modern, full-stack restaurant reservation and management system built with FastAPI and React.

## 🚀 Features

### Core Functionality

- **Staff Management**: User authentication and role-based access control
- **Client Management**: VIP status tracking and blacklist management
- **Table Management**: Dynamic table availability and zone organization
- **Reservation System**: Complete booking workflow with status tracking
- **Real-time Updates**: Live reservation status and availability

### Technical Features

- **Responsive Design**: Mobile-first UI with Mantine components
- **Type Safety**: Full TypeScript coverage with generated API clients
- **Automated Testing**: Comprehensive test suite with 70+ tests
- **API Documentation**: Auto-generated OpenAPI/Swagger docs
- **Internationalization**: Multi-language support (English/French)
- **Caching**: Redis integration for performance optimization

## 🛠️ Tech Stack

### Backend

- **FastAPI** - Modern Python web framework
- **SQLModel** - SQLAlchemy + Pydantic integration
- **SQLite/PostgreSQL** - Database support
- **JWT** - Authentication tokens
- **Redis** - Caching (optional)
- **uv** - Fast Python package manager

### Frontend

- **React 18** - UI framework with hooks
- **TypeScript** - Type-safe JavaScript
- **Mantine** - Modern React components
- **React Query** - Data fetching and caching
- **Vite** - Fast build tool
- **i18next** - Internationalization

### Development Tools

- **pytest** - Testing framework
- **ruff** - Code linting and formatting
- **orval** - API client generation
- **ESLint/Prettier** - Code quality

## 📋 Prerequisites

- **Node.js** 18+ (for frontend)
- **Python** 3.11+ (for backend)
- **uv** (recommended for Python dependency management)
- **Yarn** 4+ (for frontend package management)
- **Redis** (optional, for caching)

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd serveme-be
```

### 2. Backend Setup

```bash
cd spotpass_backend

# Install dependencies
uv pip install -e ".[dev]"

# Initialize database
uv run python -m cli init-db

# Start development server
uv run uvicorn spotpass_backend.main:app --reload --port 5001
```

### 3. Frontend Setup

```bash
cd frontend

# Enable Yarn 4
corepack enable
yarn set version 4.0.2

# Install dependencies
yarn install

# Generate API client
yarn generate

# Start development server
yarn dev
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001
- **API Documentation**: http://localhost:5001/docs
- **Alternative Docs**: http://localhost:5001/redoc

## 🏗️ Development Workflow

### Code Quality

```bash
# Backend
cd spotpass_backend
uv run ruff check .  # Lint
uv run ruff format . # Format

# Frontend
cd frontend
yarn lint           # Lint
yarn format         # Format
yarn typecheck      # Type check
```

### Testing

```bash
# Backend tests
cd spotpass_backend
uv run pytest

# Frontend build check
cd frontend
yarn build
```

### API Client Generation

When backend API changes:

```bash
cd frontend
yarn generate
```

## 📁 Project Structure

```
serveme-be/
├── frontend/                 # React TypeScript application
│   ├── src/
│   │   ├── api/             # Generated API client
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── stores/         # Zustand state management
│   │   ├── hooks/          # Custom React hooks
│   │   ├── i18n/           # Internationalization
│   │   └── theme.ts        # Mantine theme configuration
│   ├── package.json
│   └── vite.config.ts
├── spotpass_backend/         # FastAPI application
│   ├── accounts/            # Account management
│   ├── clients/             # Client management
│   ├── core/                # Core functionality
│   ├── establishments/      # Establishment management
│   ├── reservations/        # Reservation system
│   ├── tables/              # Table management
│   ├── users/               # User management
│   ├── tests/               # Test suite
│   ├── main.py              # Application entry point
│   ├── cli.py               # Command-line interface
│   └── pyproject.toml       # Python dependencies
└── README.md
```

## 🔐 Authentication

The system supports two user types:

- **Staff Users**: Restaurant staff with access to management features
- **Back-office Users**: Administrative users with full system access

Authentication uses JWT tokens with automatic refresh.

## 🌐 API Endpoints

### Authentication

- `POST /api/staff/auth/login` - Staff login
- `POST /api/bo/auth/login` - Back-office login
- `POST /api/{user_type}/auth/refresh` - Refresh tokens

### Core Resources

- `GET/POST /api/staff/clients` - Client management
- `GET/POST /api/staff/reservations` - Reservation management
- `GET/POST /api/staff/tables` - Table management
- `GET/POST /api/staff/zones` - Zone management

### Dashboard

- `GET /api/staff/auth/dashboard-stats` - Dashboard statistics

## 🧪 Testing

### Backend Testing

```bash
cd spotpass_backend
uv run pytest                    # Run all tests
uv run pytest tests/test_auth.py # Run specific test file
uv run pytest -v                 # Verbose output
uv run pytest --cov=.           # With coverage
```

### Test Coverage

- **70+ test cases** covering all major functionality
- **73% code coverage** with detailed HTML reports
- Integration tests for complete workflows

## 🚀 Deployment

### Production Backend

```bash
cd spotpass_backend

# Set environment variables
export ENVIRONMENT=production
export DATABASE_URL="postgresql://user:pass@localhost/db"

# Run with gunicorn
uv run gunicorn spotpass_backend.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Production Frontend

```bash
cd frontend

# Build for production
yarn build

# Serve static files (nginx, etc.)
```

### Environment Variables

**Backend (.env):**

```bash
ENVIRONMENT=development
DATABASE_URL=sqlite:///serveme.db
SECRET_KEY=your-secret-key
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Frontend (.env):**

```bash
VITE_API_URL=http://localhost:5001
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

### Commit Guidelines

- Use clear, descriptive commit messages
- Reference issue numbers when applicable
- Keep commits focused on single changes

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/) and [React](https://reactjs.org/)
- UI components by [Mantine](https://mantine.dev/)
- Icons by [Tabler Icons](https://tabler-icons.io/)

---

For more information, check the API documentation at `/docs` when the server is running.</content>
<parameter name="filePath">/Users/mounir/private/chi5na/serveme-be/README.md
