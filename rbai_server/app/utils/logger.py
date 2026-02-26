"""
Secure logging configuration for rbAI backend.

Provides structured logging with sensitive data filtering.
"""

import logging
import sys
import os
import re
from typing import Any, Dict
from logging.handlers import RotatingFileHandler


class SensitiveDataFilter(logging.Filter):
    """Filter to remove sensitive data from logs"""
    
    SENSITIVE_PATTERNS = [
        (re.compile(r'(password["\']?\s*[:=]\s*["\']?)([^"\'}\s]+)', re.IGNORECASE), r'\1***'),
        (re.compile(r'(api[_-]?key["\']?\s*[:=]\s*["\']?)([^"\'}\s]+)', re.IGNORECASE), r'\1***'),
        (re.compile(r'(token["\']?\s*[:=]\s*["\']?)([^"\'}\s]+)', re.IGNORECASE), r'\1***'),
        (re.compile(r'(secret["\']?\s*[:=]\s*["\']?)([^"\'}\s]+)', re.IGNORECASE), r'\1***'),
        (re.compile(r'(Bearer\s+)[\w\-\.]+', re.IGNORECASE), r'\1***'),
        (re.compile(r'(authorization["\']?\s*[:=]\s*["\']?)([^"\'}\s]+)', re.IGNORECASE), r'\1***'),
    ]
    
    def filter(self, record: logging.LogRecord) -> bool:
        """Sanitize log message before output"""
        if isinstance(record.msg, str):
            for pattern, replacement in self.SENSITIVE_PATTERNS:
                record.msg = pattern.sub(replacement, record.msg)
        
        # Also sanitize args if present
        if record.args:
            sanitized_args = []
            for arg in record.args:
                if isinstance(arg, str):
                    for pattern, replacement in self.SENSITIVE_PATTERNS:
                        arg = pattern.sub(replacement, arg)
                sanitized_args.append(arg)
            record.args = tuple(sanitized_args)
        
        return True


def setup_logger(name: str = "rbai") -> logging.Logger:
    """
    Configure structured logging with security filters.
    
    Args:
        name: Logger name
        
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    
    # Prevent duplicate handlers
    if logger.hasHandlers():
        return logger
    
    # Set level from environment or default to INFO
    log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
    logger.setLevel(getattr(logging, log_level, logging.INFO))
    
    # Create formatters
    detailed_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    simple_formatter = logging.Formatter(
        '%(levelname)s - %(message)s'
    )
    
    # Console handler (stderr)
    console_handler = logging.StreamHandler(sys.stderr)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(simple_formatter)
    console_handler.addFilter(SensitiveDataFilter())
    
    # File handler (if log directory exists)
    log_dir = os.getenv('LOG_DIR', './logs')
    if os.path.exists(log_dir) or os.getenv('ENABLE_FILE_LOGGING') == 'true':
        try:
            os.makedirs(log_dir, exist_ok=True)
            file_handler = RotatingFileHandler(
                os.path.join(log_dir, 'rbai.log'),
                maxBytes=10 * 1024 * 1024,  # 10MB
                backupCount=5
            )
            file_handler.setLevel(logging.DEBUG)
            file_handler.setFormatter(detailed_formatter)
            file_handler.addFilter(SensitiveDataFilter())
            logger.addHandler(file_handler)
        except Exception as e:
            print(f"Warning: Could not setup file logging: {e}", file=sys.stderr)
    
    logger.addHandler(console_handler)
    
    return logger


# Create default logger instance
app_logger = setup_logger("rbai")


def get_logger(name: str = "rbai") -> logging.Logger:
    """Get or create a logger instance"""
    return logging.getLogger(name)


class SecurityLogger:
    """Specialized logger for security events"""
    
    def __init__(self):
        self.logger = get_logger("rbai.security")
    
    def log_auth_attempt(self, username: str, success: bool, ip: str = "unknown"):
        """Log authentication attempt"""
        status = "SUCCESS" if success else "FAILED"
        self.logger.info(f"Auth attempt - User: {username} - Status: {status} - IP: {ip}")
    
    def log_unauthorized_access(self, resource: str, user_id: str = "unknown", ip: str = "unknown"):
        """Log unauthorized access attempt"""
        self.logger.warning(f"Unauthorized access attempt - Resource: {resource} - User: {user_id} - IP: {ip}")
    
    def log_rate_limit_exceeded(self, endpoint: str, ip: str):
        """Log rate limit violation"""
        self.logger.warning(f"Rate limit exceeded - Endpoint: {endpoint} - IP: {ip}")
    
    def log_suspicious_activity(self, description: str, context: Dict[str, Any]):
        """Log suspicious activity"""
        # Ensure context doesn't contain sensitive data
        safe_context = {k: v for k, v in context.items() if k not in ['password', 'token', 'api_key']}
        self.logger.warning(f"Suspicious activity - {description} - Context: {safe_context}")


# Create security logger instance
security_logger = SecurityLogger()
