# Production Dockerfile for rbAI Backend
FROM python:3.10-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    gcc \
    musl-dev \
    libffi-dev \
    curl \
    docker-cli

# Copy application code first
COPY app ./app
COPY scripts ./scripts
COPY pyproject.toml ./

# Install Python dependencies
RUN pip install --no-cache-dir -e .

# Create directories for data and db
RUN mkdir -p /app/data /app/db

# Run as root to access Docker socket (if needed for legacy execution)

# Expose port
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Production command with 2 workers (optimized for SQLite)
# For PostgreSQL, increase to 4-8 workers
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
