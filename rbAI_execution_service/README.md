# rbAI Code Execution Microservice

This is a standalone microservice that handles secure code execution for the rbAI platform.

## Features

- 🔒 Isolated code execution using Docker containers
- 🚀 FastAPI-based REST API
- 🔑 API key authentication
- ⏱️ Configurable timeouts
- 🐍 Python support (easily extensible to Java, JavaScript, etc.)
- 📊 Resource limits (CPU, memory)

## Architecture

This microservice is designed to run separately from the main rbAI application, allowing:
- Better security isolation
- Independent scaling
- Easy deployment on platforms with Docker support (AWS EC2, DigitalOcean, etc.)

## Deployment Options

1. **AWS EC2** (Recommended for production)
2. **DigitalOcean Droplet**
3. **Hetzner Cloud VPS**
4. **Local development**

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## API Endpoints

### `POST /execute`
Execute code in isolated container.

**Request**:
```json
{
  "code": "print('Hello World')",
  "language": "python",
  "timeout": 30
}
```

**Response**:
```json
{
  "success": true,
  "output": "Hello World\n",
  "exit_code": 0,
  "execution_time": 0.123
}
```

### `GET /health`
Health check endpoint.

### `GET /languages`
List supported languages.

## Local Development

### Prerequisites
- Python 3.10+
- Docker installed and running
- `uv` (recommended) or `pip`

### Setup

```bash
# Install dependencies using uv (recommended - uses lockfile)
uv sync

# Or using pip (without lockfile benefits)
pip install -e .

# Create .env file
cp .env.example .env
# Edit .env and set EXECUTION_API_KEY

# Run the service
uv run uvicorn main:app --reload --port 8080

# Or if using pip
uvicorn main:app --reload --port 8080
```

### Updating Dependencies

```bash
# Add a new dependency
uv add package-name

# Update lockfile after changing pyproject.toml
uv sync

# Update all dependencies to latest compatible versions
uv sync --upgrade
```

### Testing
```bash
# Install dev dependencies
uv sync --group dev

# Run tests (if available)
uv run pytest

# Test the API
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"code":"print(\"Hello!\")", "language":"python", "timeout":30}'
```

## Security

- API key authentication required
- Docker container isolation
- Network disabled in execution containers
- Resource limits enforced
- Timeout protection
