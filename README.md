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

- **Node.js** 20+ (for frontend)
- **Python** 3.11+ (for backend)
- **uv** (recommended for Python dependency management)
- **Yarn** 4+ (for frontend package management)
- **Docker & Docker Compose** (for containerized deployment)

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

### Docker Compose (Recommended)

#### Production Setup

1. **Clone and configure:**
```bash
git clone <your-repo-url>
cd serveme-be

# Copy environment file and configure
cp .env.example .env
# Edit .env with your production values
```

2. **Start production services:**
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

3. **Initialize database (first time only):**
```bash
docker-compose exec backend uv run python -m cli init-db
```

#### Development Setup

```bash
# Start development services with hot reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Frontend will be available at http://localhost:3000
# Backend API at http://localhost:5001
```

#### Using Makefile (Convenient Commands)

```bash
# Build all services
make build

# Start production
make prod

# Start development
make dev

# View logs
make logs

# Run tests
make test

# Clean up
make clean
```

#### Nginx Reverse Proxy Configuration

1. **Install nginx on your server:**
```bash
sudo apt update && sudo apt install nginx
```

2. **Copy nginx configuration:**
```bash
sudo cp nginx.conf /etc/nginx/sites-available/spotpass
sudo ln -s /etc/nginx/sites-available/spotpass /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

3. **SSL Configuration (Let's Encrypt):**
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificates
sudo certbot --nginx -d spotpass.mounirmesselmeni.de -d spotpass-backend.mounirmesselmeni.de

# Certificates will auto-renew
```

### Manual Production Deployment

#### Backend Deployment

```bash
cd spotpass_backend

# Install uv
pip install uv

# Install dependencies
uv pip install -e ".[dev]"

# Set environment variables
export ENVIRONMENT=production
export DATABASE_URL="postgresql://user:pass@host:port/db"
export SECRET_KEY="your-secret-key"

# Run with gunicorn
uv run gunicorn spotpass_backend.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

#### Frontend Deployment

```bash
cd frontend

# Install dependencies
yarn install

# Generate API client
yarn generate

# Build for production
yarn build

# Serve with nginx (copy dist/ to web server)
```

## 🔧 Configuration

### Environment Variables

**Production (.env):**
```bash
# Database
DB_PASSWORD=your-secure-password

# Security
SECRET_KEY=your-super-secret-key-change-this

# Optional Redis
REDIS_HOST=redis
REDIS_PORT=6379
```

**Frontend (.env):**
```bash
VITE_API_URL=https://spotpass-backend.mounirmesselmeni.de
```

### Domain Configuration

- **Frontend**: `spotpass.mounirmesselmeni.de`
- **Backend API**: `spotpass-backend.mounirmesselmeni.de`

Make sure both domains point to your server's IP address.

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
