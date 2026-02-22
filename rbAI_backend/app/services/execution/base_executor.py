"""
Abstract base class for language-specific code executors.
Enables extensible multi-language support in rbAI.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import time


class ExecutionResult:
    """Data class for execution results (language-agnostic)"""
    def __init__(
        self,
        status: str,
        output: str,
        error: str = "",
        execution_time: float = 0.0,
        exit_code: int = 0,
        test_results: Optional[List[Dict]] = None
    ):
        self.status = status  # "success", "error", "timeout", "failed_tests"
        self.output = output
        self.error = error
        self.execution_time = execution_time
        self.exit_code = exit_code
        self.test_results = test_results or []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status,
            "output": self.output,
            "error": self.error,
            "execution_time": round(self.execution_time, 3),
            "exit_code": self.exit_code,
            "test_results": self.test_results
        }


class LanguageExecutor(ABC):
    """
    Abstract base class for language-specific code executors.
    
    Each language implementation must provide:
    1. Code preparation/wrapping logic
    2. Execution in isolated Docker container
    3. Test case validation (optional)
    """
    
    def __init__(
        self,
        image_name: str,
        memory_limit: str,
        cpu_quota: int,
        timeout: int
    ):
        """
        Initialize executor with resource limits.
        
        Args:
            image_name: Docker image to use for execution
            memory_limit: Memory limit (e.g., "128m", "256m")
            cpu_quota: CPU quota (e.g., 50000 = 50% of one core)
            timeout: Execution timeout in seconds
        """
        self.image_name = image_name
        self.memory_limit = memory_limit
        self.cpu_quota = cpu_quota
        self.timeout = timeout
    
    @abstractmethod
    async def execute_code(
        self,
        code: str,
        stdin: str = "",
        test_cases: Optional[List[Dict]] = None
    ) -> ExecutionResult:
        """
        Execute code in language-specific container.
        
        Args:
            code: Source code to execute
            stdin: Standard input for the program
            test_cases: Optional test cases for validation
            
        Returns:
            ExecutionResult with status, output, errors
        """
        pass
    
    @abstractmethod
    def _prepare_code(self, user_code: str, stdin_data: str) -> str:
        """
        Wrap user code with language-specific safety measures and stdin injection.
        
        Args:
            user_code: The raw code provided by the user
            stdin_data: Standard input to inject
            
        Returns:
            Wrapped code ready for execution
        """
        pass
    
    def _indent_code(self, code: str, spaces: int) -> str:
        """
        Indent each line of code by specified spaces.
        
        Args:
            code: Code to indent
            spaces: Number of spaces to indent
            
        Returns:
            Indented code
        """
        indent = ' ' * spaces
        lines = code.split('\n')
        return '\n'.join(indent + line for line in lines)
    
    @abstractmethod
    async def execute_with_tests(
        self,
        code: str,
        test_cases: List[Dict[str, Any]]
    ) -> ExecutionResult:
        """
        Execute code and validate against test cases.
        
        Args:
            code: Source code to execute
            test_cases: List of dicts with 'input' and 'expected_output'
            
        Returns:
            ExecutionResult with test_results populated
        """
        pass
    
    @abstractmethod
    def health_check(self) -> Dict[str, Any]:
        """
        Check if executor is healthy and image is available.
        
        Returns:
            Dict with status and configuration details
        """
        pass
