# Production Dockerfile for rbAI Backend
# Multi-stage build for smaller, optimized image

# Stage 1: Builder
FROM python:3.10-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache gcc musl-dev libffi-dev postgresql-dev

# Install Python dependencies
COPY pyproject.toml ./
RUN pip install --no-cache-dir --user -e .

# Stage 2: Runtime
FROM python:3.10-alpine

WORKDIR /app

# Install only runtime dependencies (curl for healthcheck, libpq for postgres)
RUN apk add --no-cache curl libpq

# Copy Python packages from builder
COPY --from=builder /root/.local /usr/local

# Copy application code
COPY app ./app
COPY scripts ./scripts

# Create directories for data and db
RUN mkdir -p /app/data /app/db

# Run as root to access Docker socket (if needed for legacy execution)

# Expose port
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Production command with configurable workers
# Default: 1 worker for 1GB droplet (optimized for SQLite)
# For 2GB+ droplets: set WORKERS=2
# For PostgreSQL: increase to 4-8 workers
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers ${WORKERS:-1}"]
