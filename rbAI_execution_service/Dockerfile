# Dockerfile for rbAI Execution Microservice
# Designed for AWS EC2 deployment with Docker socket access

FROM python:3.10-alpine

WORKDIR /app

# Install Docker CLI (binary only) and system dependencies  
RUN apk add --no-cache curl \
    && curl -fsSL https://download.docker.com/linux/static/stable/x86_64/docker-24.0.7.tgz | tar xzvf - --strip 1 -C /usr/local/bin docker/docker \
    && chmod +x /usr/local/bin/docker \
    && rm -rf /tmp/*

# Copy all files
COPY . .

# Install Python dependencies using pip (simpler and more reliable for production)
RUN pip install --no-cache-dir -r requirements.txt

# Run as root to access Docker socket (required for code execution isolation)

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start server with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "2"]
