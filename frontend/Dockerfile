# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Enable Yarn 4
RUN corepack enable && corepack prepare yarn@4.0.2 --activate

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies (fresh install for correct platform)
RUN yarn install --frozen-lockfile

# Copy source code (excluding node_modules from host)
COPY . .
RUN rm -rf node_modules

# Reinstall dependencies for correct platform
RUN yarn install --frozen-lockfile

# Build the application (API client is already generated)
RUN yarn build

# Production stage - use a simple web server
FROM node:20-alpine AS production

# Install serve globally
RUN npm install -g serve

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the application
CMD ["serve", "-s", "dist", "-l", "3000"]
