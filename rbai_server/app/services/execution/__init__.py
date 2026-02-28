"""
Execution service for sandboxed code execution.
Backend client for remote execution microservice.
"""

from .execution_service import ExecutionService, ExecutionResult
from .execution_client import ExecutionServiceClient, execution_client

__all__ = [
    "ExecutionService",
    "ExecutionResult",
    "ExecutionServiceClient",
    "execution_client"
]
