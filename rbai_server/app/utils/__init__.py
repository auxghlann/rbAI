"""Utility modules for rbAI backend"""

from .logger import app_logger, get_logger, security_logger, setup_logger
from .errors import (
    ErrorCode,
    SecureHTTPException,
    handle_database_error,
    handle_external_service_error,
    handle_execution_error,
    handle_validation_error,
    handle_not_found,
    handle_unauthorized,
    handle_forbidden,
    handle_generic_error,
    sanitize_error_message,
)

__all__ = [
    'app_logger',
    'get_logger',
    'security_logger',
    'setup_logger',
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
