# Dockerfile for rbAI Execution Microservice
# Designed for AWS EC2 deployment with Docker socket access

FROM python:3.10-alpine

WORKDIR /app

# Install Docker CLI (binary only) and system dependencies  
RUN apk add --no-cache curl \
    && curl -fsSL https://download.docker.com/linux/static/stable/x86_64/docker-24.0.7.tgz | tar xzvf - --strip 1 -C /usr/local/bin docker/docker \
    && chmod +x /usr/local/bin/docker \
    && rm -rf /tmp/* \
    && addgroup docker \
    && adduser -D -u 1000 -G docker appuser

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

# Change ownership (combined with user creation to avoid layer issues)
RUN chown -R 1000:1000 /app

# Switch to non-root user
USER 1000:1000

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start server using uv run (uses the venv created by uv sync)
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "2"]
