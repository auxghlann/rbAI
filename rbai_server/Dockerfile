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
RUN apk add --no-cache curl libpq \
    && addgroup docker \
    && adduser -D -u 1000 -G docker appuser

# Copy Python packages from builder to appuser's home
COPY --from=builder --chown=1000:1000 /root/.local /home/appuser/.local

# Copy application code
COPY --chown=1000:1000 app ./app

# Create directories for data and db
RUN mkdir -p /app/data /app/db && chown -R 1000:1000 /app

# Note: User is set in docker-compose.yml with proper group for Docker socket access

# Make sure scripts in .local are usable
ENV PATH=/home/appuser/.local/bin:$PATH

# Expose port
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Production command with 2 workers (optimized for SQLite)
# For PostgreSQL, increase to 4-8 workers
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
