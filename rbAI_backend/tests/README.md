# rbAI Backend Tests

This directory contains all test files for the rbAI backend, organized by test type.

## Directory Structure

```
tests/
├── conftest.py              # Shared fixtures for all tests
├── unit/                    # Fast, isolated unit tests
│   ├── __init__.py
│   ├── test_chat_memory.py
│   ├── test_executor_factory.py
│   ├── test_java_executor.py
│   └── test_python_executor.py
└── integration/             # Tests requiring external services
    ├── __init__.py
    ├── conftest.py
    ├── test_ai_activity_generation.py
    └── test_multi_language_execution.py
```

## Test Categories

### Unit Tests (`tests/unit/`)

Fast, isolated tests that use mocks and don't require external services.

- **test_java_executor.py** - JavaExecutor unit tests (26 tests)
- **test_python_executor.py** - PythonExecutor unit tests (15 tests)
- **test_executor_factory.py** - Factory pattern tests (9 tests)
- **test_chat_memory.py** - Chat context and prompting tests

### Integration Tests (`tests/integration/`)

Tests that require external services (Docker, AI API).

- **test_multi_language_execution.py** - Docker execution tests
- **test_ai_activity_generation.py** - AI generation tests

## Running Tests

### Run All Tests
```bash
# Inside Docker container
docker exec rbai-backend pytest tests/ -v

# Run all unit tests (fast)
docker exec rbai-backend pytest tests/unit/ -v

# Run all integration tests (slower, requires Docker/API)
docker exec rbai-backend pytest tests/integration/ -v
```

### Run Specific Tests
```bash
# Run specific test file
docker exec rbai-backend pytest tests/unit/test_java_executor.py -v

# Run specific test class
docker exec rbai-backend pytest tests/unit/test_java_executor.py::TestJavaExecutor -v

# Run specific test method
docker exec rbai-backend pytest tests/unit/test_java_executor.py::TestJavaExecutor::test_prepare_code_with_method_definition -v
```

### Test Options
```bash
# Quiet mode (summary only)
docker exec rbai-backend pytest tests/ -q

# With coverage report
docker exec rbai-backend pytest tests/ --cov=app --cov-report=term-missing

# Stop on first failure
docker exec rbai-backend pytest tests/ -x

# Show local variables on failure
docker exec rbai-backend pytest tests/ -l

# Run only failed tests from last run
docker exec rbai-backend pytest tests/ --lf
```

## Writing New Tests

### Unit Test Example

```python
import pytest
from app.services.execution import get_executor

class TestMyFeature:
    @pytest.fixture
    def executor(self):
        return get_executor('python')
    
    def test_something(self, executor):
        result = executor.some_method()
        assert result.status == "success"
    
    @pytest.mark.asyncio
    async def test_async_feature(self, executor):
        result = await executor.execute_code("print('test')")
        assert "test" in result.output
```

### Using Fixtures

Shared fixtures are defined in `conftest.py`:

```python
def test_with_sample_code(sample_python_code):
    # sample_python_code fixture is automatically available
    assert "print" in sample_python_code
```

## Key Test Cases

### Java Executor Tests

- ✅ Method definition detection (fixes the compilation error bug)
- ✅ Code wrapping for methods vs statements
- ✅ Stdin injection and escaping
- ✅ Compilation error handling
- ✅ Test case validation

### Python Executor Tests

- ✅ Code preparation and stdin injection
- ✅ Syntax error handling
- ✅ Runtime error handling
- ✅ Test case validation

### Factory Tests

- ✅ Language-specific executor selection
- ✅ Case-insensitive language names
- ✅ Unsupported language error handling

## Continuous Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/test.yml
- name: Install dependencies
  run: pip install -e ".[dev]"

- name: Run tests
  run: pytest --cov=app --cov-report=xml

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Debugging Failed Tests

### Show full traceback

```bash
pytest --tb=long
```

### Stop at first failure

```bash
pytest -x
```

### Run last failed tests only

```bash
pytest --lf
```

### Enter debugger on failure

```bash
pytest --pdb
```

## Performance

- Unit tests (mocked): ~0.1-0.5s each
- Integration tests (Docker): ~2-10s each

Run unit tests frequently during development. Run integration tests before commits.
