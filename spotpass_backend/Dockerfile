# Python build stage
FROM python:3.11-slim AS builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_CACHE_DIR=/root/.cache/uv \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_NO_MANAGED_PYTHON=1 \
    UV_PROJECT_ENVIRONMENT=/home/app/venv \
    UV_PYTHON_DOWNLOADS=never \
    VIRTUAL_ENV=/home/app/venv

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Create virtual environment and install dependencies and project
RUN --mount=type=cache,target=/root/.cache/uv \
    uv venv $VIRTUAL_ENV && \
    uv sync --no-editable

# Production stage
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    LC_ALL=C.UTF-8 \
    VIRTUAL_ENV=/home/app/venv \
    PATH=/home/app/venv/bin:$PATH

# Install runtime system dependencies
RUN apt-get update && \
    apt-get install --no-install-recommends -y \
    curl \
    && apt-get clean && \
    apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false && \
    rm -rf /var/lib/apt/lists/* && \
    useradd -m app

WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /home/app/venv /home/app/venv

# Copy source code
COPY --chown=app:app . /app

# Make init script executable
RUN chmod +x init.sh

USER app

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5001/health || exit 1

# Start the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5001"]