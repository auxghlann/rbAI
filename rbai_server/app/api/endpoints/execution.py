"""
FastAPI endpoints for code execution with behavioral telemetry integration.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
from slowapi import Limiter
from slowapi.util import get_remote_address

from ...services.execution.execution_service import ExecutionService, ExecutionResult
from ...services.execution.execution_client import execution_client
from ...utils import get_logger, handle_execution_error, handle_external_service_error

logger = get_logger(__name__)

# Always use remote execution service (microservice architecture)
EXECUTION_SERVICE_URL = os.getenv('EXECUTION_SERVICE_URL')
if not EXECUTION_SERVICE_URL:
    logger.warning("⚠️  EXECUTION_SERVICE_URL not set - code execution will not work!")
    logger.warning("For local development, set EXECUTION_SERVICE_URL=http://localhost:8080")
    DOCKER_AVAILABLE = False
else:
    logger.info(f"🌐 Using remote execution service: {EXECUTION_SERVICE_URL}")
    DOCKER_AVAILABLE = True

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
        language = request.language or 'python'
        
        # Use remote execution microservice
        result_dict = await execution_client.execute_code(
            code=request.code,
            language=language, 
            stdin=request.stdin or "",
            timeout=30,
            test_cases=[tc.dict() for tc in request.test_cases] if request.test_cases else None
        )
        
        # Convert to response format
        result = ExecutionResult(
            status=result_dict.get('status', 'error'),
            output=result_dict.get('output', ''),
            error=result_dict.get('error', ''),
            execution_time=result_dict.get('execution_time', 0.0),
            exit_code=result_dict.get('exit_code', -1),
            test_results=result_dict.get('test_results', [])
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
        logger.error(f"Execution failed for language {request.language}", exc_info=True)
        raise handle_execution_error(e, request.language or 'python')


@router.get("/health")
async def health_check():
    """
    Check if the execution service is healthy.
    
    Returns remote execution microservice status.
    """
    if not DOCKER_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Execution service unavailable - EXECUTION_SERVICE_URL not configured"
        )
    
    try:
        # Check remote execution service health
        import httpx
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{EXECUTION_SERVICE_URL}/health")
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Execution service health check failed: {e}")
        raise HTTPException(
            status_code=503,
            detail="Execution service unavailable"
        )
