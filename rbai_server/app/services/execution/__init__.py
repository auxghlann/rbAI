"""
Execution service for sandboxed code execution.
Multi-language support via executor factory pattern.
"""

from .base_executor import LanguageExecutor, ExecutionResult
from .executors.python_executor import PythonExecutor
from .executors.java_executor import JavaExecutor

# Backward compatibility alias
DockerExecutor = PythonExecutor

# Language executor mapping
EXECUTOR_MAP = {
    'python': PythonExecutor,
    'java': JavaExecutor
}


def get_executor(language: str) -> LanguageExecutor:
    """
    Factory method to get language-specific executor.
    
    Args:
        language: Programming language ('python' or 'java')
        
    Returns:
        LanguageExecutor instance for the specified language
        
    Raises:
        ValueError: If language is not supported
    """
    executor_class = EXECUTOR_MAP.get(language.lower())
    if not executor_class:
        supported = ', '.join(EXECUTOR_MAP.keys())
        raise ValueError(f"Unsupported language: {language}. Supported languages: {supported}")
    return executor_class()


__all__ = [
    "DockerExecutor",  # Backward compatibility
    "ExecutionResult",
    "LanguageExecutor",
    "PythonExecutor",
    "JavaExecutor",
    "get_executor"
]
