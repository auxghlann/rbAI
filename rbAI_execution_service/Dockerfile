# Dockerfile for rbAI Execution Microservice
# Designed for AWS EC2 deployment with Docker socket access

FROM python:3.10-slim

WORKDIR /app

# Install Docker CLI and system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    docker.io \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user and add to docker group
RUN groupadd -g 999 docker || true && \
    useradd -m -u 1000 -G docker appuser

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install uv for faster dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Install Python dependencies using uv with lockfile (faster, deterministic)
RUN uv sync --frozen --no-dev

# Copy application code
COPY main.py executor.py ./

# Change ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start server using uv run (uses the venv created by uv sync)
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "2"]
