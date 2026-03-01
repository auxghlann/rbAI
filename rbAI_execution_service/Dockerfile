# Dockerfile for rbAI Execution Microservice
# Designed for AWS EC2 deployment with Docker socket access

FROM python:3.10-alpine

WORKDIR /app

# Install Docker CLI (binary only) and system dependencies  
RUN apk add --no-cache curl \
    && curl -fsSL https://download.docker.com/linux/static/stable/x86_64/docker-24.0.7.tgz | tar xzvf - --strip 1 -C /usr/local/bin docker/docker \
    && chmod +x /usr/local/bin/docker \
    && rm -rf /tmp/*

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install uv for faster dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Install Python dependencies using uv with lockfile (faster, deterministic)
RUN uv sync --frozen --no-dev

# Copy application code
COPY main.py ./
COPY executors/ ./executors/
COPY validators/ ./validators/

# Run as root to access Docker socket (required for code execution isolation)
# Note: Security trade-off for isolated code execution capability

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start server using uv run (uses the venv created by uv sync)
# Workers can be overridden via WORKERS env var (default: 1 for 1GB droplet, 2 for 2GB+)
CMD ["sh", "-c", "uv run uvicorn main:app --host 0.0.0.0 --port 8080 --workers ${WORKERS:-1}"]
