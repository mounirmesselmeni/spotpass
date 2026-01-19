# ServeMe Frontend

Modern React frontend for the ServeMe restaurant management system.

## Tech Stack

- **React 18** with TypeScript
- **Vite** - Fast build tool
- **Mantine UI** - Modern React component library
- **React Query** - Data fetching and caching
- **Zustand** - State management
- **Orval** - OpenAPI client generator
- **React Router** - Navigation
- **Tabler Icons** - Icon library
- **Yarn 4** - Package manager

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn 4+
- Backend API running on http://localhost:5001

### Installation

```bash
# Enable Yarn 4 (if not already)
corepack enable
yarn set version 4.0.2

# Install dependencies
yarn install

# Generate API client from OpenAPI schema
yarn generate:api

# Start development server
yarn dev
```

The app will be available at http://localhost:3000

### Environment Variables

Create a `.env` file:

```bash
VITE_API_URL=http://localhost:5001
```

## Features

### Authentication
- JWT-based authentication
- Automatic token refresh
- Protected routes
- Logout functionality

### Dashboard
- Overview statistics
- Quick access to all modules
- Recent activity

### Reservations Management
- List all reservations
- Create new reservations
- Edit reservation details
- Delete reservations
- Filter by status and date
- Search functionality

### Clients Management
- Client CRUD operations
- VIP status management
- Blacklist management
- Search by name or email

### Tables Management
- Table CRUD operations
- Capacity management
- Zone assignment
- Availability status

### Zones Management
- Zone CRUD operations
- View tables per zone

### UI/UX Features
- Dark mode support
- Responsive design (mobile-friendly)
- Modern Material Design
- Loading states
- Error handling
- Toast notifications

## Scripts

```bash
# Development
yarn dev              # Start dev server
yarn build            # Build for production
yarn preview          # Preview production build

# Code Quality
yarn lint             # Run ESLint

# API Client
yarn generate:api     # Generate API client from OpenAPI schema
```

## Project Structure

```
frontend/
├── src/
│   ├── api/
│   │   ├── generated/      # Auto-generated API client
│   │   └── mutator/        # Axios instance configuration
│   ├── components/
│   │   └── Layout/         # Layout components
│   ├── pages/              # Page components
│   ├── stores/             # Zustand stores
│   ├── App.tsx             # Main app component
│   └── main.tsx            # Entry point
├── public/                 # Static assets
├── index.html             # HTML template
├── orval.config.ts        # Orval configuration
├── vite.config.ts         # Vite configuration
└── package.json           # Dependencies

```

## API Integration

The frontend uses Orval to generate a type-safe API client from the backend's OpenAPI specification.

### Generating API Client

```bash
yarn generate:api
```

This reads `../openapi_apiflask.json` and generates:
- Type-safe API functions
- React Query hooks
- TypeScript types

### Using API Hooks

```typescript
import { useGetClientsStaffClientsList } from '@/api/generated/clients';

function ClientsList() {
  const { data, isLoading, error } = useGetClientsStaffClientsList();
  
  // Use the data
}
```

## Authentication Flow

1. User logs in via `/login`
2. JWT token is stored in localStorage
3. Axios interceptor adds token to all requests
4. On 401 error, user is redirected to login
5. Token is automatically added to protected routes

## Dark Mode

Dark mode is managed via Zustand store and persisted to localStorage:

```typescript
import { useThemeStore } from '@/stores/theme.store';

function Component() {
  const { colorScheme, toggleColorScheme } = useThemeStore();
  // Use in UI
}
```

## Deployment

### Build for Production

```bash
yarn build
```

The build output will be in the `dist/` directory.

### Environment Variables for Production

```bash
VITE_API_URL=https://api.yourdomain.com
```

### Deploy Options

- **Vercel** - Automatic deployments from Git
- **Netlify** - Simple drag & drop
- **AWS S3 + CloudFront** - Scalable static hosting
- **Docker** - Containerized deployment

Example Dockerfile:

```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN corepack enable && yarn install
COPY . .
RUN yarn build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Proprietary
