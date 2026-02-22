"""
Shared test fixtures for integration tests.
"""

import pytest
import os


@pytest.fixture(scope="session")
def groq_api_key():
    """Get GROQ API key from environment"""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        pytest.skip("GROQ_API_KEY not set - skipping AI generation tests")
    return api_key


@pytest.fixture(scope="session")
def docker_available():
    """Check if Docker is available for integration tests"""
    import docker
    try:
        client = docker.from_env()
        client.ping()
        return True
    except Exception:
        pytest.skip("Docker not available - skipping execution tests")
        return False
