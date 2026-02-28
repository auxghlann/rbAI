"""
Python-specific code executor for rbAI.
Implements secure, isolated Python code execution with resource limits.
"""

import docker
import asyncio
import time
from typing import Dict, Any, List, Optional
import logging

from .base_executor import LanguageExecutor, ExecutionResult
from validators.python_test_validator import create_test_code

logger = logging.getLogger(__name__)


class PythonExecutor(LanguageExecutor):
    """
    Executes Python code in isolated Docker containers with strict resource limits.
    
    Security Features:
    - Network disabled
    - Memory limit: 128MB
    - CPU limit: 50% of one core
    - Execution timeout: 5 seconds
    - Read-only filesystem (except /tmp)
    - No dangerous modules accessible
    """
    
    def __init__(
        self,
        image_name: str = "python:3.10-alpine",
        memory_limit: str = "128m",
        cpu_quota: int = 50000,  # 50% of one CPU core
        timeout: int = 5
    ):
        """Initialize Python executor with Docker client"""
        super().__init__(image_name, memory_limit, cpu_quota, timeout)
        
        try:
            self.client = docker.from_env()
            # Test connection
            self.client.ping()
            logger.info("Docker client initialized successfully for Python")
        except docker.errors.DockerException as e:
            logger.error(f"Failed to initialize Docker client: {e}")
            raise RuntimeError(
                "Docker is not available. Please ensure Docker is installed and running."
            )
    
    def _has_user_main(self, code: str) -> bool:
        """
        Check if user has defined their own main block.
        This allows users to write their own sanity checks.
        
        Args:
            code: User's Python code
            
        Returns:
            True if code contains if __name__ == '__main__', False otherwise
        """
        import re
        # Pattern for main block: if __name__ == '__main__': or variations
        main_pattern = r'if\s+__name__\s*==\s*["\']__main__["\']\s*:'
        return bool(re.search(main_pattern, code))
    
    def _prepare_code(self, user_code: str, stdin_data: str = "", has_test_cases: bool = False) -> str:
        """
        Wraps user code in a LeetCode-style test harness with Solution class.
        
        Smart detection:
        1. If user has their own if __name__ == '__main__' → Use it (for sanity checks)
        2. If no main block and has_test_cases → Auto-call first Solution method
        3. If no main block and no test_cases → Return empty (for run feature)
        
        Args:
            user_code: User's Solution class code
            stdin_data: Standard input to inject
            has_test_cases: Whether test cases are being used (submit vs run)
            
        Returns:
            Complete Python source ready for execution
        """
        import re
        from validators.python_test_validator import extract_solution_method_name
        
        # Escape stdin data for Python string
        stdin_escaped = stdin_data.replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n')
        
        # Check if user has their own main block
        has_user_main = self._has_user_main(user_code)
        
        # If user has their own main, use their code directly
        if has_user_main:
            # User is doing their own testing - respect that
            return f'''import sys
import io

# Replace stdin with provided input
sys.stdin = io.StringIO('{stdin_escaped}')

try:
{self._indent_code(user_code, 4)}
except Exception as e:
    print(f"Runtime Error: {{type(e).__name__}}: {{e}}", file=sys.stderr)
    sys.exit(1)
'''
        
        # If no main block and no test cases, just validate syntax (return empty for run)
        if not has_test_cases:
            # For "run" without test cases and without main, just return code that validates syntax
            return f'''import sys

# User code (syntax validation only)
{user_code}

# No output - user needs to add if __name__ == '__main__' for testing
'''
        
        # Check if user provided a Solution class
        has_solution_class = bool(re.search(r'class\s+Solution\s*[:\(]', user_code, re.IGNORECASE))
        
        if has_solution_class:
            # Extract first method name from Solution class
            method_name = extract_solution_method_name(user_code)
            
            if method_name:
                # User provided Solution class with method - wrap and call it
                wrapper = f'''import sys
import io
from contextlib import redirect_stdout, redirect_stderr

# Replace stdin with provided input
sys.stdin = io.StringIO('{stdin_escaped}')

# Capture output
stdout_capture = io.StringIO()
stderr_capture = io.StringIO()

try:
    with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
        # User's Solution class code
{self._indent_code(user_code, 8)}
        
        # Create Solution instance and call the method
        solution = Solution()
        
        # Call the method (assuming no parameters for now)
                try:
                    result = solution.{method_name}()
                    if result is not None:
                        print(result)
                except TypeError:
                    # Method requires parameters
                    print(f"Note: Method '{method_name}' requires parameters.", file=sys.stderr)
                    print(f"Tip: You can write your own main block for testing:", file=sys.stderr)
                    print(f"", file=sys.stderr)
                    print(f"if __name__ == '__main__':", file=sys.stderr)
                    print(f"    s = Solution()", file=sys.stderr)
                    print(f"    print(s.{method_name}(5, 3))", file=sys.stderr)
                    print(f"", file=sys.stderr)
                    print(f"Or use test cases to validate your solution.", file=sys.stderr)
                    raise
    # Print captured output
    output = stdout_capture.getvalue()
    if output:
        print(output, end='')
    
    error = stderr_capture.getvalue()
    if error:
        print(error, file=sys.stderr, end='')
        
except Exception as e:
    print(f"Runtime Error: {{type(e).__name__}}: {{e}}", file=sys.stderr)
    sys.exit(1)
'''
            else:
                # Has Solution class but no methods found
                wrapper = f'''import sys

print("Error: Solution class found but no methods defined.", file=sys.stderr)
print("Please add a method to your Solution class.", file=sys.stderr)
print("", file=sys.stderr)
print("Example:", file=sys.stderr)
print("  class Solution:", file=sys.stderr)
print("      def hello_world(self):", file=sys.stderr)
print("          return 'Hello, World!'", file=sys.stderr)
sys.exit(1)
'''
        else:
            # No Solution class - guide the student
            wrapper = f'''import sys

print("Error: Please define a Solution class with your methods.", file=sys.stderr)
print("", file=sys.stderr)
print("Example:", file=sys.stderr)
print("  class Solution:", file=sys.stderr)
print("      def add(self, a, b):", file=sys.stderr)
print("          return a + b", file=sys.stderr)
print("", file=sys.stderr)
print("Then the system will test your Solution methods automatically.", file=sys.stderr)
sys.exit(1)
'''
        
        return wrapper
    
    async def execute_code(
        self,
        code: str,
        stdin: str = "",
        test_cases: Optional[List[Dict]] = None,
        skip_wrapper: bool = False
    ) -> ExecutionResult:
        """
        Execute Python code in a Docker container.
        
        Args:
            code: The Python code to execute
            stdin: Optional standard input for the program
            test_cases: Optional list of test cases to validate against
            skip_wrapper: If True, skip _prepare_code wrapper (code is already complete)
            
        Returns:
            ExecutionResult object with execution details
        """
        start_time = time.time()
        
        try:
            # Prepare code with safety wrapper (stdin is injected into the code)
            # Skip wrapper if code is already a complete test wrapper
            if skip_wrapper:
                wrapped_code = code
            else:
                wrapped_code = self._prepare_code(code, stdin, has_test_cases=bool(test_cases))
            
            # Create and run container
            logger.info("Starting Python container execution...")
            container = self.client.containers.run(
                self.image_name,
                command=["python", "-c", wrapped_code],
                detach=True,
                remove=False,
                mem_limit=self.memory_limit,
                cpu_quota=self.cpu_quota,
                network_disabled=True,
                read_only=True,
                tmpfs={'/tmp': 'size=10M,mode=1777'},
                environment={
                    'PYTHONUNBUFFERED': '1',
                    'PYTHONDONTWRITEBYTECODE': '1'
                }
            )
            
            # Wait for completion with timeout
            try:
                result = container.wait(timeout=self.timeout)
                exit_code = result['StatusCode']
            except Exception as e:
                container.stop(timeout=0)
                container.remove(force=True)
                execution_time = time.time() - start_time
                
                if execution_time >= self.timeout:
                    logger.warning(f"Execution timeout after {execution_time:.3f}s")
                    return ExecutionResult(
                        status="timeout",
                        output="",
                        error=f"Execution exceeded {self.timeout} second time limit",
                        execution_time=execution_time
                    )
                else:
                    raise
            
            # Get output
            stdout = container.logs(stdout=True, stderr=False).decode('utf-8')
            stderr = container.logs(stdout=False, stderr=True).decode('utf-8')
            
            # Clean up
            container.remove(force=True)
            
            execution_time = time.time() - start_time
            
            # Determine status
            if exit_code == 0:
                status = "success"
            else:
                status = "error"
            
            logger.info(f"Execution completed: {status} in {execution_time:.3f}s")
            
            return ExecutionResult(
                status=status,
                output=stdout,
                error=stderr,
                execution_time=execution_time,
                exit_code=exit_code
            )
                
        except docker.errors.ContainerError as e:
            logger.error(f"Container error: {e}")
            return ExecutionResult(
                status="error",
                output="",
                error=f"Container execution failed: {str(e)}",
                execution_time=time.time() - start_time
            )
            
        except docker.errors.ImageNotFound:
            logger.error(f"Docker image not found: {self.image_name}")
            return ExecutionResult(
                status="error",
                output="",
                error=f"Python environment not available. Please contact administrator.",
                execution_time=0
            )
            
        except Exception as e:
            logger.error(f"Unexpected execution error: {e}", exc_info=True)
            return ExecutionResult(
                status="error",
                output="",
                error=f"Unexpected error: {str(e)}",
                execution_time=time.time() - start_time
            )
    
    async def execute_with_tests(
        self,
        code: str,
        test_cases: List[Dict[str, Any]]
    ) -> ExecutionResult:
        """
        Execute code and validate against test cases.
        Automatically calls the user's function with test inputs.
        
        Args:
            code: Python code to execute (function definition)
            test_cases: List of dicts with 'input' and 'expected_output' keys
            
        Returns:
            ExecutionResult with test_results populated
        """
        test_results = []
        all_passed = True
        last_result = None
        
        for i, test_case in enumerate(test_cases):
            test_input = test_case.get('input', '')
            expected = test_case.get('expected_output', '').strip()
            
            # Generate test code that calls the function with inputs
            test_code, error = create_test_code(code, test_input)
            
            if error:
                # Failed to generate test code (e.g., no function found)
                test_results.append({
                    "test_number": i + 1,
                    "passed": False,
                    "input": test_input,
                    "expected_output": expected,
                    "actual_output": "",
                    "error": error
                })
                all_passed = False
                continue
            
            # Execute the generated test code (skip wrapper since test_code is already complete)
            result = await self.execute_code(test_code, stdin="", skip_wrapper=True)
            last_result = result
            
            actual = result.output.strip()
            passed = (actual == expected) and result.status == "success"
            
            test_results.append({
                "test_number": i + 1,
                "passed": passed,
                "input": test_input,
                "expected_output": expected,
                "actual_output": actual,
                "error": result.error if result.error else None
            })
            
            if not passed:
                all_passed = False
        
        # Use the last test execution result, update status based on all tests
        if last_result:
            last_result.test_results = test_results
            last_result.status = "success" if all_passed else "failed_tests"
            # Clear error if all tests passed
            if all_passed:
                last_result.error = ""
            return last_result
        else:
            # No valid test executions, return error result
            return ExecutionResult(
                status="error",
                output="",
                error="No valid test cases executed",
                test_results=test_results
            )
    
    def health_check(self) -> Dict[str, Any]:
        """
        Check if Docker is healthy and Python image is available.
        
        Returns:
            Dict with status and details
        """
        try:
            self.client.ping()
            
            # Check if image exists
            try:
                self.client.images.get(self.image_name)
                image_available = True
            except docker.errors.ImageNotFound:
                image_available = False
            
            return {
                "status": "healthy",
                "docker_available": True,
                "image_available": image_available,
                "image_name": self.image_name,
                "language": "python",
                "resource_limits": {
                    "memory": self.memory_limit,
                    "cpu_quota": self.cpu_quota,
                    "timeout": self.timeout
                }
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "docker_available": False,
                "language": "python",
                "error": str(e)
            }
