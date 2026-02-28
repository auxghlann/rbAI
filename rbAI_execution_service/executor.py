"""
Code executor for rbAI Execution Microservice
Handles Docker-based code execution with isolation and resource limits
"""

import docker
import asyncio
import time
import re
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class ExecutionResult:
    """Result of code execution"""
    status: str  # "success", "error", "timeout"
    output: str
    error: str
    execution_time: float
    exit_code: int
    test_results: List[Dict[str, Any]]


class CodeExecutor:
    """
    Executes code in isolated Docker containers
    Supports: Python, Java (extensible to other languages)
    """
    
    # Language configurations
    LANGUAGE_CONFIGS = {
        "python": {
            "image": "python:3.10-alpine",
            "memory_limit": "128m",
            "cpu_quota": 50000,
            "extension": ".py",
            "cmd": ["python", "/code/main.py"]
        },
        "java": {
            "image": "eclipse-temurin:17-jdk-alpine",
            "memory_limit": "256m",
            "cpu_quota": 100000,
            "extension": ".java",
            "cmd": ["/bin/sh", "-c", "javac /code/Solution.java && java -cp /code Solution"]
        }
    }
    
    def __init__(self):
        """Initialize Docker client"""
        try:
            self.client = docker.from_env()
            self.client.ping()
            logger.info("✅ Docker client initialized")
        except docker.errors.DockerException as e:
            logger.error(f"❌ Docker initialization failed: {e}")
            self.client = None
    
    def check_docker_available(self) -> bool:
        """Check if Docker is available"""
        return self.client is not None
    
    def get_supported_languages(self) -> List[str]:
        """Get list of supported languages"""
        return list(self.LANGUAGE_CONFIGS.keys())
    
    def pull_images(self):
        """Pull required Docker images"""
        if not self.client:
            return
        
        for lang, config in self.LANGUAGE_CONFIGS.items():
            try:
                logger.info(f"Pulling {lang} image: {config['image']}")
                self.client.images.pull(config['image'])
                logger.info(f"✅ {lang} image ready")
            except Exception as e:
                logger.warning(f"Failed to pull {lang} image: {e}")
    
    async def execute(
        self,
        code: str,
        language: str = "python",
        stdin: str = "",
        timeout: int = 30,
        test_cases: Optional[List[Dict]] = None
    ) -> ExecutionResult:
        """
        Execute code in isolated container
        
        Args:
            code: Source code to execute
            language: Programming language
            stdin: Standard input
            timeout: Execution timeout in seconds
            test_cases: Optional test cases for validation
            
        Returns:
            ExecutionResult with output, errors, and execution time
        """
        # If test cases provided, run with test validation
        if test_cases:
            return await self._execute_with_tests(code, language, test_cases, timeout)
        
        # Otherwise, simple execution
        if not self.client:
            return ExecutionResult(
                status="error",
                output="",
                error="Docker is not available",
                execution_time=0.0,
                exit_code=-1,
                test_results=[]
            )
        
        language = language.lower()
        if language not in self.LANGUAGE_CONFIGS:
            return ExecutionResult(
                status="error",
                output="",
                error=f"Unsupported language: {language}",
                execution_time=0.0,
                exit_code=-1,
                test_results=[]
            )
        
        config = self.LANGUAGE_CONFIGS[language]
        
        # Prepare code based on language
        if language == "python":
            prepared_code = self._prepare_python_code(code, stdin)
        elif language == "java":
            prepared_code = self._prepare_java_code(code, stdin)
        else:
            prepared_code = code
        
        # Execute in container
        start_time = time.time()
        
        try:
            # Create container
            container = self.client.containers.create(
                image=config['image'],
                command=config['cmd'],
                mem_limit=config['memory_limit'],
                cpu_quota=config['cpu_quota'],
                network_disabled=True,
                read_only=False,
                detach=True,
                stdin_open=False,
                tty=False,
                # Mount code as volume
                volumes={
                    '/tmp': {'bind': '/code', 'mode': 'rw'}
                },
                working_dir='/code'
            )
            
            # Write code to container
            if language == "python":
                container.put_archive('/code', self._create_tar('main.py', prepared_code))
            elif language == "java":
                container.put_archive('/code', self._create_tar('Solution.java', prepared_code))
            
            # Start container
            container.start()
            
            # Wait for completion with timeout
            try:
                exit_code = container.wait(timeout=timeout)['StatusCode']
            except Exception:
                container.kill()
                container.remove(force=True)
                execution_time = time.time() - start_time
                return ExecutionResult(
                    status="timeout",
                    output="",
                    error=f"Execution timed out after {timeout} seconds",
                    execution_time=execution_time,
                    exit_code=-1,
                    test_results=[]
                )
            
            # Get logs
            stdout = container.logs(stdout=True, stderr=False).decode('utf-8', errors='replace')
            stderr = container.logs(stdout=False, stderr=True).decode('utf-8', errors='replace')
            
            # Cleanup
            container.remove(force=True)
            
            execution_time = time.time() - start_time
            
            # Determine status
            if exit_code == 0:
                status = "success"
            else:
                status = "error"
            
            return ExecutionResult(
                status=status,
                output=stdout,
                error=stderr,
                execution_time=execution_time,
                exit_code=exit_code,
                test_results=[]
            )
            
        except docker.errors.ImageNotFound:
            return ExecutionResult(
                status="error",
                output="",
                error=f"Docker image not found: {config['image']}",
                execution_time=0.0,
                exit_code=-1,
                test_results=[]
            )
        except Exception as e:
            logger.error(f"Execution error: {e}", exc_info=True)
            return ExecutionResult(
                status="error",
                output="",
                error=f"Execution failed: {str(e)}",
                execution_time=time.time() - start_time,
                exit_code=-1,
                test_results=[]
            )
    
    async def _execute_with_tests(
        self,
        code: str,
        language: str,
        test_cases: List[Dict],
        timeout: int
    ) -> ExecutionResult:
        """
        Execute code with test case validation
        
        Args:
            code: Source code
            language: Programming language
            test_cases: List of test cases with 'input' and 'expected_output'
            timeout: Execution timeout
            
        Returns:
            ExecutionResult with test results
        """
        test_results = []
        all_passed = True
        total_time = 0.0
        last_result = None
        
        for i, test_case in enumerate(test_cases):
            test_input = test_case.get('input', '')
            expected_output = test_case.get('expected_output', '').strip()
            
            # Execute with this test's input
            result = await self.execute(
                code=code,
                language=language,
                stdin=test_input,
                timeout=timeout,
                test_cases=None  # Prevent recursion
            )
            
            last_result = result
            total_time += result.execution_time
            
            # Compare output
            actual_output = result.output.strip()
            passed = (actual_output == expected_output) and result.status == "success"
            
            test_results.append({
                "test_number": i + 1,
                "passed": passed,
                "input": test_input,
                "expected_output": expected_output,
                "actual_output": actual_output,
                "error": result.error if result.error else None
            })
            
            if not passed:
                all_passed = False
        
        # Return result with test results
        if last_result:
            return ExecutionResult(
                status="success" if all_passed else "failed_tests",
                output=last_result.output,
                error=last_result.error if not all_passed else "",
                execution_time=total_time,
                exit_code=0 if all_passed else 1,
                test_results=test_results
            )
        else:
            return ExecutionResult(
                status="error",
                output="",
                error="No test cases executed",
                execution_time=0.0,
                exit_code=-1,
                test_results=test_results
            )
    
    def _prepare_python_code(self, user_code: str, stdin: str) -> str:
        """Prepare Python code for execution"""
        stdin_escaped = stdin.replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n')
        
        # Check if user has their own main block
        if self._has_user_main(user_code):
            return f'''import sys
import io

sys.stdin = io.StringIO('{stdin_escaped}')

{user_code}
'''
        
        # Otherwise, just run the code
        return f'''import sys
import io

sys.stdin = io.StringIO('{stdin_escaped}')

{user_code}
'''
    
    def _prepare_java_code(self, user_code: str, stdin: str) -> str:
        """
        Prepare Java code for execution with Solution class support.
        
        Smart detection:
        1. If user has their own main() → Use it (for sanity checks)
        2. If no main() → Auto-call first Solution method
        3. Remind users they can write their own main for testing
        """
        # Escape stdin for Java string literal
        stdin_escaped = (stdin
            .replace('\\', '\\\\')
            .replace('"', '\\"')
            .replace('\n', '\\n')
            .replace('\r', '\\r')
            .replace('\t', '\\t'))
        
        # Check if user has their own main method
        has_user_main = bool(re.search(
            r'public\s+static\s+void\s+main\s*\(\s*String\s*\[\s*\]\s+\w+\s*\)',
            user_code
        ))
        
        # If user has their own main, use their code directly with Main class wrapper
        if has_user_main:
            return f'''
import java.io.*;
import java.util.*;

{user_code}

public class Main {{
    public static void main(String[] args) throws Exception {{
        // Inject stdin
        String input = "{stdin_escaped}";
        System.setIn(new ByteArrayInputStream(input.getBytes()));
        
        // Call user's main method from Solution class
        Solution.main(args);
    }}
}}
'''
        
        # Check if user provided a Solution class
        has_solution_class = bool(re.search(r'class\s+Solution\s*\{', user_code, re.IGNORECASE))
        
        if has_solution_class:
            # Extract method name from Solution class
            method_name = self._extract_java_method_name(user_code)
            
            if method_name:
                # User provided Solution class with method - wrap and call it
                return f'''
import java.io.*;
import java.util.*;

{user_code}

public class Main {{
    public static void main(String[] args) throws Exception {{
        // Inject stdin
        String input = "{stdin_escaped}";
        System.setIn(new ByteArrayInputStream(input.getBytes()));
        
        try {{
            // Create Solution instance
            Solution solution = new Solution();
            
            // Try to call the method (assuming no parameters for direct execution)
            try {{
                Object result = solution.{method_name}();
                if (result != null) {{
                    System.out.println(result);
                }}
            }} catch (Exception e) {{
                // Method might require parameters
                System.err.println("Note: Method '{method_name}' may require parameters.");
                System.err.println("Tip: You can write your own main() method for testing:");
                System.err.println("");
                System.err.println("  public static void main(String[] args) {{");
                System.err.println("      Solution s = new Solution();");
                System.err.println("      System.out.println(s.{method_name}(5, 3));");
                System.err.println("  }}");
                System.err.println("");
                System.err.println("Or use test cases to validate your solution.");
                throw e;
            }}
            
        }} catch (Exception e) {{
            System.err.println("Runtime Error: " + e.getClass().getSimpleName() + ": " + e.getMessage());
            e.printStackTrace(System.err);
            System.exit(1);
        }}
    }}
}}
'''
            else:
                # Has Solution class but no methods found
                return f'''
import java.io.*;
import java.util.*;

{user_code}

public class Main {{
    public static void main(String[] args) throws Exception {{
        System.err.println("Error: Solution class found but no methods defined.");
        System.err.println("Please add a method to your Solution class.");
        System.err.println("");
        System.err.println("Example:");
        System.err.println("  class Solution {{");
        System.err.println("      public String helloWorld() {{");
        System.err.println("          return \\"Hello, World!\\";");
        System.err.println("      }}");
        System.err.println("");
        System.err.println("      // Optional: Add your own main for testing");
        System.err.println("      public static void main(String[] args) {{");
        System.err.println("          Solution s = new Solution();");
        System.err.println("          System.out.println(s.helloWorld());");
        System.err.println("      }}");
        System.err.println("  }}");
        System.exit(1);
    }}
}}
'''
        else:
            # No Solution class - guide the student
            return f'''
import java.io.*;
import java.util.*;

public class Main {{
    public static void main(String[] args) throws Exception {{
        System.err.println("Error: Please define a Solution class with your methods.");
        System.err.println("");
        System.err.println("Example:");
        System.err.println("  class Solution {{");
        System.err.println("      public int add(int a, int b) {{");
        System.err.println("          return a + b;");
        System.err.println("      }}");
        System.err.println("  }}");
        System.err.println("");
        System.err.println("Then the system will test your Solution methods automatically.");
        System.exit(1);
    }}
}}
'''
    
    def _extract_java_method_name(self, code: str) -> Optional[str]:
        """
        Extract the first public method name from a Java Solution class.
        
        Args:
            code: Java code containing a Solution class
            
        Returns:
            Method name or None if no method found
        """
        # First, check if there's a Solution class
        solution_pattern = r'class\s+Solution\s*\{'
        if not re.search(solution_pattern, code):
            return None
        
        # Extract the Solution class body
        solution_match = re.search(r'class\s+Solution\s*\{(.*)', code, re.DOTALL)
        if not solution_match:
            return None
        
        class_body = solution_match.group(1)
        
        # Find first public method (not constructor)
        # Pattern: public ReturnType methodName(params) {
        method_pattern = r'public\s+(?:static\s+)?(?!Solution)(\w+(?:<[^>]+>)?(?:\[\])?)\s+(\w+)\s*\('
        match = re.search(method_pattern, class_body)
        
        if match:
            method_name = match.group(2)
            return method_name
        
        return None
    
    def _has_user_main(self, code: str) -> bool:
        """Check if code has main block"""
        return bool(re.search(r'if\s+__name__\s*==\s*["\']__main__["\']\s*:', code))
    
    def _create_tar(self, filename: str, content: str) -> bytes:
        """Create tar archive with file"""
        import tarfile
        import io
        
        tar_stream = io.BytesIO()
        tar = tarfile.TarFile(fileobj=tar_stream, mode='w')
        
        # Create file info
        file_data = content.encode('utf-8')
        tarinfo = tarfile.TarInfo(name=filename)
        tarinfo.size = len(file_data)
        tarinfo.mode = 0o644
        
        # Add to tar
        tar.addfile(tarinfo, io.BytesIO(file_data))
        tar.close()
        
        return tar_stream.getvalue()
    
    def cleanup(self):
        """Cleanup resources"""
        if self.client:
            try:
                # Remove any dangling containers
                containers = self.client.containers.list(
                    all=True,
                    filters={"status": "exited"}
                )
                for container in containers:
                    container.remove()
                logger.info("Cleanup completed")
            except Exception as e:
                logger.error(f"Cleanup error: {e}")
