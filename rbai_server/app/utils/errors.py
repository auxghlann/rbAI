"""
Secure error handling utilities for API responses.

Prevents information leakage through error messages while maintaining
useful debugging information in logs.
"""

from fastapi import HTTPException, status
from typing import Optional, Dict, Any
import logging
from enum import Enum

logger = logging.getLogger("rbai.errors")


class ErrorCode(str, Enum):
    """Standardized error codes for client"""
    # Authentication & Authorization
    AUTH_FAILED = "AUTH_FAILED"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    
    # Resource errors
    NOT_FOUND = "NOT_FOUND"
    ALREADY_EXISTS = "ALREADY_EXISTS"
    
    # Validation errors
    INVALID_INPUT = "INVALID_INPUT"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    
    # Service errors
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"
    
    # Execution errors
    EXECUTION_TIMEOUT = "EXECUTION_TIMEOUT"
    EXECUTION_FAILED = "EXECUTION_FAILED"
    
    # Generic
    INTERNAL_ERROR = "INTERNAL_ERROR"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"


class SecureHTTPException(HTTPException):
    """
    HTTPException that includes error code and sanitized messages.
    """
    
    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: ErrorCode = ErrorCode.INTERNAL_ERROR,
        headers: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.error_code = error_code


def handle_database_error(
    error: Exception,
    operation: str = "database operation",
    user_message: str = "A database error occurred"
) -> HTTPException:
    """
    Handle database errors securely.
    
    Args:
        error: Original exception
        operation: Description of operation for logging
        user_message: Safe message for user
        
    Returns:
        SecureHTTPException with sanitized message
    """
    # Log full error for debugging
    logger.error(f"Database error during {operation}: {type(error).__name__}", exc_info=True)
    
    # Return generic message to client
    return SecureHTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=user_message,
        error_code=ErrorCode.DATABASE_ERROR
    )


def handle_external_service_error(
    error: Exception,
    service_name: str,
    operation: str = "external service call"
) -> HTTPException:
    """
    Handle external service errors securely.
    
    Args:
        error: Original exception
        service_name: Name of external service
        operation: Description of operation
        
    Returns:
        SecureHTTPException with sanitized message
    """
    # Log full error
    logger.error(f"External service error [{service_name}] during {operation}: {type(error).__name__}", exc_info=True)
    
    # Return generic message
    return SecureHTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=f"{service_name} is temporarily unavailable. Please try again later.",
        error_code=ErrorCode.EXTERNAL_SERVICE_ERROR
    )


def handle_execution_error(
    error: Exception,
    language: str = "unknown"
) -> HTTPException:
    """
    Handle code execution errors securely.
    """
    logger.error(f"Execution error ({language}): {type(error).__name__}", exc_info=True)
    
    return SecureHTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Code execution service encountered an error. Please try again.",
        error_code=ErrorCode.EXECUTION_FAILED
    )


def handle_validation_error(
    field: str,
    message: str = "Invalid input"
) -> HTTPException:
    """
    Handle validation errors.
    """
    return SecureHTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"{field}: {message}",
        error_code=ErrorCode.VALIDATION_ERROR
    )


def handle_not_found(
    resource: str = "Resource"
) -> HTTPException:
    """
    Handle not found errors.
    """
    return SecureHTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"{resource} not found",
        error_code=ErrorCode.NOT_FOUND
    )


def handle_unauthorized(
    message: str = "Authentication required"
) -> HTTPException:
    """
    Handle unauthorized access.
    """
    return SecureHTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=message,
        error_code=ErrorCode.UNAUTHORIZED
    )


def handle_forbidden(
    message: str = "Access forbidden"
) -> HTTPException:
    """
    Handle forbidden access.
    """
    return SecureHTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=message,
        error_code=ErrorCode.FORBIDDEN
    )


def handle_generic_error(
    error: Exception,
    operation: str = "operation",
    user_message: str = "An error occurred"
) -> HTTPException:
    """
    Handle generic errors with secure logging.
    
    Args:
        error: Original exception
        operation: Description of operation for logging
        user_message: Safe message for user
        
    Returns:
        SecureHTTPException with sanitized message
    """
    # Log with full context
    error_type = type(error).__name__
    logger.error(f"Error during {operation}: {error_type}", exc_info=True)
    
    # Return sanitized error to client
    return SecureHTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"{user_message}. Please try again later.",
        error_code=ErrorCode.INTERNAL_ERROR
    )


def sanitize_error_message(message: str) -> str:
    """
    Remove sensitive information from error messages.
    
    Args:
        message: Original error message
        
    Returns:
        Sanitized message
    """
    import re
    
    # Remove file paths
    message = re.sub(r'[A-Za-z]:[/\\][^\s]+', '[PATH]', message)
    message = re.sub(r'/[^\s]+\.py', '[FILE]', message)
    
    # Remove SQL queries
    message = re.sub(r'SELECT .+ FROM', 'SELECT ... FROM', message, flags=re.IGNORECASE)
    message = re.sub(r'INSERT INTO .+ VALUES', 'INSERT INTO ... VALUES', message, flags=re.IGNORECASE)
    
    # Remove stack trace indicators
    message = re.sub(r'Traceback.*$', '', message, flags=re.DOTALL)
    message = re.sub(r'File ".*", line \d+', '', message)
    
    return message.strip()


__all__ = [
    'ErrorCode',
    'SecureHTTPException',
    'handle_database_error',
    'handle_external_service_error',
    'handle_execution_error',
    'handle_validation_error',
    'handle_not_found',
    'handle_unauthorized',
    'handle_forbidden',
    'handle_generic_error',
    'sanitize_error_message',
]
