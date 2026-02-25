"""
rbAI Code Execution Microservice
FastAPI server for isolated code execution
"""

from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import logging
import os
import time
from datetime import datetime

from executor import CodeExecutor, ExecutionResult

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="rbAI Execution Service",
    version="1.0.0",
    description="Secure code execution microservice for rbAI platform"
)

# CORS - allow requests from main backend
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:8000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# API Key authentication
API_KEY = os.getenv("EXECUTION_API_KEY", "dev-key-change-in-production")

# Initialize executor
executor = CodeExecutor()


# Request/Response models
class ExecutionRequest(BaseModel):
    code: str = Field(..., description="Code to execute")
    language: str = Field(default="python", description="Programming language")
    stdin: str = Field(default="", description="Standard input")
    timeout: int = Field(default=30, ge=1, le=60, description="Timeout in seconds")
    test_cases: Optional[List[Dict[str, Any]]] = Field(default=None, description="Test cases for validation")


class ExecutionResponse(BaseModel):
    success: bool
    status: str
    output: str
    error: str = ""
    execution_time: float
    exit_code: int
    test_results: List[Dict[str, Any]] = []
    timestamp: str


class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: str
    docker_available: bool


class LanguagesResponse(BaseModel):
    languages: List[str]


# Authentication dependency
async def verify_api_key(x_api_key: Optional[str] = Header(None)):
    """Verify API key from request header"""
    if x_api_key != API_KEY:
        logger.warning(f"Unauthorized access attempt with key: {x_api_key}")
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions"""
    logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "timestamp": datetime.now().isoformat()
        }
    )


# Endpoints
@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint"""
    return {
        "service": "rbAI Execution Service",
        "version": "1.0.0",
        "status": "operational"
    }


@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint"""
    docker_available = executor.check_docker_available()
    
    return HealthResponse(
        status="healthy" if docker_available else "degraded",
        service="rbAI Execution Service",
        timestamp=datetime.now().isoformat(),
        docker_available=docker_available
    )


@app.get("/languages", response_model=LanguagesResponse)
async def list_languages():
    """List supported programming languages"""
    return LanguagesResponse(
        languages=executor.get_supported_languages()
    )


@app.post("/execute", response_model=ExecutionResponse, dependencies=[])
async def execute_code(
    request: ExecutionRequest,
    x_api_key: str = Header(None, alias="X-API-Key")
):
    """
    Execute code in isolated Docker container
    
    Requires API key authentication via X-API-Key header
    """
    # Verify API key
    if x_api_key != API_KEY:
        logger.warning(f"Unauthorized execution attempt")
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    
    logger.info(f"Executing {request.language} code (timeout: {request.timeout}s)")
    
    try:
        # Execute code
        start_time = time.time()
        
        result: ExecutionResult = await executor.execute(
            code=request.code,
            language=request.language,
            stdin=request.stdin,
            timeout=request.timeout,
            test_cases=request.test_cases
        )
        
        execution_time = time.time() - start_time
        
        logger.info(
            f"Execution completed: status={result.status}, "
            f"time={execution_time:.3f}s, exit_code={result.exit_code}"
        )
        
        return ExecutionResponse(
            success=result.status == "success",
            status=result.status,
            output=result.output,
            error=result.error,
            execution_time=round(execution_time, 3),
            exit_code=result.exit_code,
            test_results=result.test_results,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Execution error: {e}", exc_info=True)
        return ExecutionResponse(
            success=False,
            status="error",
            output="",
            error=f"Execution service error: {str(e)}",
            execution_time=0.0,
            exit_code=-1,
            test_results=[],
            timestamp=datetime.now().isoformat()
        )


# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize service on startup"""
    logger.info("Starting rbAI Execution Service")
    logger.info(f"Allowed origins: {ALLOWED_ORIGINS}")
    
    # Check Docker availability
    if executor.check_docker_available():
        logger.info("✅ Docker is available")
    else:
        logger.warning("⚠️  Docker is NOT available - execution will fail!")
    
    # Pull required Docker images
    logger.info("Pulling Docker images...")
    executor.pull_images()
    logger.info("✅ Service ready")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down rbAI Execution Service")
    executor.cleanup()


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    )
