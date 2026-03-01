# GitHub Copilot Instructions for rbAI


## Code Conventions and Standards

### General Principles

1. **Security First**: Never expose sensitive data in logs, errors, or responses
2. **Type Safety**: Use TypeScript interfaces and Pydantic models for all data structures
3. **Explicit over Implicit**: Clear naming, no magic values
4. **Fail Gracefully**: Handle errors with user-friendly messages
5. **Document Intent**: Comments explain "why", not "what"

### Python Backend Conventions

#### Naming Conventions
- **Classes**: PascalCase (e.g., `DataFusionEngine`, `PedagogicalFirewall`)
- **Functions/Methods**: snake_case (e.g., `process_request`, `verify_password`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `SCOPE_VALIDATOR`, `API_KEY`)
- **Private Methods**: Prefix with underscore (e.g., `_validate_scope`)
- **Database Models**: Singular nouns (e.g., `User`, `Activity`, `Session`)

#### Code Style
```python
# Imports: Standard library, third-party, local (separated by blank lines)
import logging
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from app.db.database import get_db
from app.utils import get_logger

logger = get_logger(__name__)

# Pydantic models with Field descriptions
class LoginRequest(BaseModel):
    username: str = Field(..., description="Username for login")
    password: str = Field(..., description="Password for login")

# Docstrings for all public functions/classes
async def process_request(context: ChatContext) -> ChatResponse:
    """
    Process a chat request with full pipeline.
    
    Args:
        context: ChatContext with query and optional behavioral data
        
    Returns:
        ChatResponse with message and metadata
    """
    pass
```

#### Error Handling
```python
# NEVER expose internal errors to clients
try:
    result = perform_operation()
except Exception as e:
    logger.error("Operation failed", exc_info=True)  # Full details in logs
    raise handle_database_error(e, "operation", "Operation failed")  # Generic to client
```

Use appropriate error handling utilities for different error types:
- Database errors
- External service errors
- Execution errors
- Generic/unexpected errors

### TypeScript Frontend Conventions

#### Naming Conventions
- **Components**: PascalCase (e.g., `CodePlayground`, `Header`)
- **Functions**: camelCase (e.g., `handleLogin`, `showNotification`)
- **Interfaces/Types**: PascalCase (e.g., `UserData`, `LoginProps`)
- **Constants**: UPPER_SNAKE_CASE or camelCase for config objects
- **CSS Variables**: kebab-case with `--` prefix (e.g., `--bg-primary`, `--text-secondary`)

#### Code Style
```typescript
// Imports: React, libraries, local (separated)
import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';

// Interfaces before component
interface LoginProps {
  onLogin: (userData: UserData) => void;
}

export interface UserData {
  id: string;
  username: string;
  accountType: string;
}

// Function components with typed props
function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  
  // Event handlers with clear names
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // API calls with error handling
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      if (!response.ok) {
        throw new Error('Login failed');
      }
      
      const userData = await response.json();
      onLogin(userData);
    } catch (error) {
      logger.error('Login error', error);
      setError('Login failed. Please try again.');
    }
  };
  
  return (/* JSX */);
}
```

---

## Security Requirements

### Critical Security Rules

1. **Never Use `console.log` in Production**
   - Use secure logger utilities (debug/info/warn/error)
   - Frontend and backend have separate logger implementations

2. **Sanitize All Errors**
   - Backend: Never expose stack traces, file paths, or SQL queries to clients
   - Frontend: Never log sensitive data (tokens, passwords, API keys)
   - Use dedicated error handling utilities

3. **Sensitive Data Filters**
   - Backend logger automatically filters passwords, API keys, tokens, secrets
   - Frontend logger sanitizes in production
   - Never log authentication headers or credentials

4. **API Security**
   - Implement rate limiting on all public endpoints
   - Configure CORS for development and production origins
   - Never use default API keys: All keys must be set in environment variables
   - Separate sensitive environment variables from code

---

## Testing Standards

### Test Organization

Organize tests into:
- **Unit tests**: Fast, isolated tests with no external dependencies
- **Integration tests**: Tests requiring external services (Docker, databases, APIs)

#### Test Markers
```python
import pytest

@pytest.mark.unit
def test_pure_function():
    """Unit test - fast, no external dependencies"""
    pass

@pytest.mark.integration
def test_api_endpoint():
    """Integration test - requires Docker"""
    pass

@pytest.mark.slow
def test_long_running():
    """Test that takes >1 second"""
    pass

@pytest.mark.asyncio
async def test_async_function():
    """Async test"""
    pass
```

#### Running Tests
```bash
# All tests
pytest

# Unit tests only (fast)
pytest -m unit

# Integration tests
pytest -m integration

# With coverage
pytest --cov=app --cov-report=html
```

---

## API Endpoint Patterns

### Standard Endpoint Structure

```python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.utils import get_logger, handle_database_error

logger = get_logger(__name__)
router = APIRouter(prefix="/api/resource", tags=["Resource"])

# Request/Response Models
class ResourceRequest(BaseModel):
    field: str = Field(..., description="Field description")

class ResourceResponse(BaseModel):
    id: str
    field: str
    
    class Config:
        from_attributes = True  # For SQLAlchemy model conversion

# Endpoints
@router.post("/", response_model=ResourceResponse)
async def create_resource(
    request: ResourceRequest,
    db: Session = Depends(get_db)
):
    """
    Create a new resource.
    
    Returns resource data if successful.
    """
    try:
        # Implementation
        pass
    except Exception as e:
        logger.error("Failed to create resource", exc_info=True)
        raise handle_database_error(e, "resource", "Failed to create resource")
```

### Rate Limiting

Apply rate limits to endpoints to prevent abuse:
```python
@router.post("/endpoint")
@limiter.limit("10/minute")  # Customize per endpoint
async def limited_endpoint():
    pass
```

---

## Frontend Patterns

### State Management

Use React hooks for local state:
```typescript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [data, setData] = useState<DataType[]>([]);

// Effects for side effects
useEffect(() => {
  loadData();
}, [dependency]);
```

### API Calls

Centralized configuration:
```typescript
import { API_URL } from '../config';

const response = await fetch(`${API_URL}/api/endpoint`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

if (!response.ok) {
  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}

const result = await response.json();
```

### Conditional Rendering

Clear, readable patterns:
```typescript
// Simple conditional
{isLoading && <LoadingSpinner />}

// Ternary for two cases
{user ? <Dashboard user={user} /> : <Login />}

// Multiple conditions
{error && <ErrorMessage error={error} />}
{!error && data && <DataDisplay data={data} />}
```
---

## Common Patterns and Idioms

### Backend

1. **Dependency Injection**
   ```python
   def endpoint(db: Session = Depends(get_db)):
       pass
   ```

2. **Database Queries**
   ```python
   user = db.query(User).filter(User.username == username).first()
   if not user:
       raise HTTPException(status_code=404, detail="User not found")
   ```

3. **Async Functions**
   ```python
   async def async_operation():
       result = await some_async_call()
       return result
   ```

### Frontend

1. **Lazy Loading**
   ```typescript
   const Component = lazy(() => import('./Component'));
   
   <Suspense fallback={<LoadingSpinner />}>
     <Component />
   </Suspense>
   ```

2. **Event Handlers**
   ```typescript
   const handleClick = (e: React.MouseEvent) => {
     e.preventDefault();
     // Handle click
   };
   ```

3. **Controlled Inputs**
   ```typescript
   <input
     value={inputValue}
     onChange={(e) => setInputValue(e.target.value)}
   />
   ```
---

## Documentation Standards

### Code Comments

1. **Module Docstrings**: Explain purpose and architecture
   ```python
   """
   Data Fusion Engine - Core Detection Algorithms Implementation.
   
   Implements four core behavioral detection algorithms:
   1. Idle Detection
   2. Focus Violation Detection
   3. Keystroke Burst Analysis
   4. Edit Magnitude Detection
   """
   ```

2. **Function Docstrings**: Args, returns, and purpose
   ```python
   def calculate_ces(session_data: SessionData) -> float:
       """
       Calculate Cognitive Engagement Score.
       
       Args:
           session_data: SessionData with telemetry and metrics
           
       Returns:
           float: CES score between 0.0 and 1.0
       """
   ```

3. **Inline Comments**: Explain non-obvious logic
   ```python
   # Apply integrity penalty for suspected external assistance
   if provenance_state == "SUSPECTED_PASTE":
       ces_score *= (1 - integrity_penalty)
   ```

### README Files

Maintain comprehensive README files for major components:
- Frontend: Setup, structure, and development guide
- Backend: API documentation and architecture
- Services: Individual service documentation

---

## Development Workflow

### Starting a New Feature

1. **Understand the Context**: Read relevant documentation and existing code
2. **Plan the Approach**: Identify affected files and dependencies
3. **Write Tests First**: For backend features, start with tests
4. **Implement Incrementally**: Small, testable changes
5. **Log Appropriately**: Use secure loggers, never console.log
6. **Handle Errors**: Use error utilities, sanitize messages
7. **Test Thoroughly**: Unit tests and integration tests
8. **Update Documentation**: Update comments and README if needed

### Code Review Checklist

- [ ] No `console.log` statements (use logger)
- [ ] No exposed sensitive data in logs/errors
- [ ] All errors use secure error handlers
- [ ] Type annotations on all functions (Python) / interfaces (TypeScript)
- [ ] Docstrings/comments for public APIs
- [ ] Tests added/updated
- [ ] No hardcoded credentials or API keys
- [ ] Follows naming conventions

---

## Domain Knowledge

### Pedagogical Constraints

1. **Never Generate Solutions**: AI provides hints, questions, and guidance—never complete code solutions
2. **Scope Enforcement**: AI only answers questions about the current problem
3. **Language Enforcement**: English-only for academic integrity in multilingual contexts
4. **Behavioral Adaptation**: AI responses adapt based on student engagement state

### System Calibration

The system is calibrated for a specific educational context:
- **Target Audience**: Novice programmers (introductory courses)
- **Problem Scope**: Short algorithmic exercises
- **Supported Languages**: Python and Java primarily (can be extended to other programming languages in the future)

Thresholds and behavioral metrics are tuned for this specific domain.
---

## When Generating Code

### Always:
- Use secure loggers (`logger.debug/info/warn/error`)
- Use type hints (Python) and TypeScript interfaces
- Handle errors with utility functions
- Follow naming conventions
- Add docstrings/comments for public APIs
- Validate inputs with Pydantic models
- Use dependency injection for database sessions

### Never:
- Use `console.log` or `print()` for production code
- Expose internal errors to clients
- Hardcode credentials or API keys
- Use magic numbers (define constants)
- Ignore type safety
- Skip error handling

### Prefer:
- Explicit over implicit
- Composition over inheritance
- Pure functions when possible
- Single Responsibility Principle
- Clear, descriptive names

---

## Questions to Ask Before Implementing

1. **Security**: Does this expose any sensitive data?
2. **Type Safety**: Are all types properly defined?
3. **Error Handling**: What can go wrong, and how do we handle it?
4. **Testing**: How will this be tested?
5. **Logging**: What needs to be logged for debugging?
6. **Performance**: Will this scale with expected usage?
7. **Pedagogy**: Does this align with educational goals? (for AI features)
8. **Documentation**: Is the intent clear from the code and comments?

---

## Copilot Skills

Skills are structured behavioral patterns that guide development approach. Located in `.github/skills/`.

### 🎓 Reflective Learning
When mistakes are made and resolved, document them in [reflective-learning.md](.github/skills/reflective-learning.md):
- Record the issue, root cause, and solution
- Extract lessons learned for future prevention
- Build a knowledge base of project-specific pitfalls

**Apply after**: Resolving bugs, fixing incorrect assumptions, implementing better approaches

### 🔧 Error Resolution
Use systematic debugging from [error-resolution.md](.github/skills/error-resolution.md):
- Gather full error context before attempting fixes
- Form hypotheses based on evidence, not guesses
- Test solutions thoroughly before moving on

**Apply when**: Encountering errors, debugging issues, investigating unexpected behavior

### 🔍 Context Gathering
Follow efficient context collection from [context-gathering.md](.github/skills/context-gathering.md):
- Understand fully before implementing
- Use parallel reads for efficiency
- Check conventions and existing patterns
- Verify all dependencies and integration points

**Apply before**: Implementing features, making changes to unfamiliar code, refactoring

### 📦 Incremental Development
Break down work using [incremental-development.md](.github/skills/incremental-development.md):
- Use `manage_todo_list` for complex tasks
- Keep each step small and testable
- Verify after each increment
- Maintain working code at all times

**Apply for**: Multi-step features, complex refactoring, unfamiliar codebases

See [skills/README.md](.github/skills/README.md) for full skill documentation.

---
