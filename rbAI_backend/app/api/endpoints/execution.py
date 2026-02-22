"""
FastAPI endpoints for code execution with behavioral telemetry integration.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
from slowapi import Limiter
from slowapi.util import get_remote_address

from ...services.execution.execution_service import ExecutionService

logger = logging.getLogger(__name__)

# Initialize executor (singleton) - make Docker optional
try:
    from ...services.execution import DockerExecutor, ExecutionResult
    executor = DockerExecutor()
    DOCKER_AVAILABLE = True
except RuntimeError as e:
    logger.warning(f"Docker not available: {e}")
    logger.warning("Code execution endpoints will not be available")
    DOCKER_AVAILABLE = False
    executor = None

router = APIRouter(prefix="/api/execution", tags=["execution"])


# --- REQUEST/RESPONSE MODELS ---

class TestCase(BaseModel):
    """Individual test case for code validation"""
    input: str = Field(default="", description="Standard input for the test")
    expected_output: str = Field(..., description="Expected program output")
    description: Optional[str] = Field(None, description="Test case description")


class ExecutionRequest(BaseModel):
    """Request body for code execution"""
    session_id: str = Field(..., description="Unique session identifier")
    code: str = Field(..., description="Code to execute")
    problem_id: str = Field(..., description="Problem/activity identifier")
    language: Optional[str] = Field(default="python", description="Programming language (e.g., 'python', 'java')")
    stdin: Optional[str] = Field(default="", description="Standard input")
    test_cases: Optional[List[TestCase]] = Field(None, description="Test cases for validation")
    
    # Telemetry data for behavioral monitoring
    telemetry: Optional[Dict[str, Any]] = Field(
        None,
        description="Telemetry data: keystroke_count, time_since_last_run, etc."
    )


class ExecutionResponse(BaseModel):
    """Response body for code execution"""
    status: str
    output: str
    error: Optional[str] = None
    execution_time: float
    exit_code: int
    test_results: Optional[List[Dict]] = None
    timestamp: datetime
    
    # Behavioral monitoring flags
    behavioral_flags: Optional[Dict[str, Any]] = None


# --- ENDPOINTS ---

@router.post("/run", response_model=ExecutionResponse)
async def run_code(
    request: ExecutionRequest,
    background_tasks: BackgroundTasks
):
    """
    Execute code in a sandboxed Docker container (multi-language support).
    
    This endpoint:
    1. Executes user code securely in isolation (Python or Java)
    2. Captures output and errors
    3. Stores code in session for chat context retrieval
    4. Logs execution event for behavioral analysis
    5. Returns results immediately to frontend
    
    Security Features:
    - Memory limits (128MB Python, 256MB Java)
    - Execution timeouts (5s Python, 10s Java)
    - No network access
    - Isolated filesystems
    
    Rate limit: 30 executions per minute per IP.
    """
    
    if not DOCKER_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Code execution is not available. Docker is not running."
        )
    
    logger.info(f"Execution request for session {request.session_id}, problem {request.problem_id}, language {request.language}")
    
    try:
        # Get language-specific executor
        from ...services.execution import get_executor
        language = request.language or 'python'
        
        try:
            executor = get_executor(language)
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail=str(e)
            )
        
        # Note: Code storage is handled by frontend via /api/sessions/save-code endpoint
        # This keeps execution focused on running code, not persistence
        
        # Execute code
        if request.test_cases:
            # Run with test validation
            result = await executor.execute_with_tests(
                code=request.code,
                test_cases=[tc.dict() for tc in request.test_cases]
            )
        else:
            # Simple execution
            result = await executor.execute_code(
                code=request.code,
                stdin=request.stdin or ""
            )
        
        # Prepare behavioral flags (to be analyzed by Data Fusion Engine)
        behavioral_flags = ExecutionService.analyze_execution_behavior(
            result_status=result.status,
            execution_time=result.execution_time,
            telemetry=request.telemetry
        )
        
        # Note: Execution storage is handled by frontend calling /api/sessions/run endpoint
        # This keeps execution.py focused on running code, sessions.py handles persistence
        
        # Return response immediately
        return ExecutionResponse(
            status=result.status,
            output=result.output,
            error=result.error if result.error else None,
            execution_time=result.execution_time,
            exit_code=result.exit_code,
            test_results=result.test_results,
            timestamp=datetime.now(),
            behavioral_flags=behavioral_flags
        )
        
    except Exception as e:
        logger.error(f"Execution failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Execution service error: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """
    Check if the execution service is healthy.
    
    Returns Docker status and configuration for all supported languages.
    """
    if not DOCKER_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Execution service unavailable - Docker not running"
        )
    
    from ...services.execution import get_executor, EXECUTOR_MAP
    
    health_status = {
        "docker_available": True,
        "languages": {}
    }
    
    # Check health for each supported language
    for lang in EXECUTOR_MAP.keys():
        try:
            lang_executor = get_executor(lang)
            health_status["languages"][lang] = lang_executor.health_check()
        except Exception as e:
            health_status["languages"][lang] = {
                "status": "unhealthy",
                "error": str(e)
            }
    
    # Overall status is healthy if at least one language is available
    any_healthy = any(
        lang_health.get("status") == "healthy" 
        for lang_health in health_status["languages"].values()
    )
    
    if not any_healthy:
        raise HTTPException(
            status_code=503,
            detail="No execution environments available"
        )
    
    return health_status


# --- TESTING/DEBUG ENDPOINTS (Remove in production) ---

@router.post("/test/simple")
async def test_simple_execution(language: str = "python"):
    """Quick test endpoint to verify Docker execution works"""
    from ...services.execution import get_executor
    
    executor = get_executor(language)
    
    if language == "python":
        result = await executor.execute_code("print('Hello from Docker!')")
    elif language == "java":
        result = await executor.execute_code("System.out.println(\"Hello from Docker!\");")
    else:
        result = await executor.execute_code("print('Hello from Docker!')")
    
    return result.to_dict()


@router.post("/test/timeout")
async def test_timeout(language: str = "python"):
    """Test timeout handling"""
    from ...services.execution import get_executor
    
    executor = get_executor(language)
    
    if language == "python":
        result = await executor.execute_code("import time; time.sleep(15)")
    elif language == "java":
        result = await executor.execute_code("Thread.sleep(15000);")
    else:
        result = await executor.execute_code("import time; time.sleep(15)")
    
    return result.to_dict()


@router.post("/test/memory")
async def test_memory_limit(language: str = "python"):
    """Test memory limit enforcement"""
    from ...services.execution import get_executor
    
    executor = get_executor(language)
    
    if language == "python":
        result = await executor.execute_code("data = 'x' * (200 * 1024 * 1024)")  # Try to allocate 200MB
    elif language == "java":
        result = await executor.execute_code("byte[] data = new byte[200 * 1024 * 1024];")
    else:
        result = await executor.execute_code("data = 'x' * (200 * 1024 * 1024)")
    
    return result.to_dict()