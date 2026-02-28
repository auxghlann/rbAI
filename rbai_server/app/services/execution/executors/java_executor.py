"""
Java-specific code executor for rbAI.
Implements secure, isolated Java code execution with compilation and runtime.
"""

import docker
import time
from typing import Dict, Any, List, Optional
import logging
import re

from ..base_executor import LanguageExecutor, ExecutionResult
from ..validators.java_test_validator import create_java_test_code, extract_java_method_name

logger = logging.getLogger(__name__)


class JavaExecutor(LanguageExecutor):
    """
    Executes Java code in isolated Docker containers with compilation step.
    
    Security Features:
    - Network disabled
    - Memory limit: 256MB (higher for JVM)
    - CPU limit: 50% of one core
    - Execution timeout: 10 seconds (compilation + execution)
    - Isolated tmpfs for .class files
    - JVM heap limited to 128MB
    """
    
    def __init__(
        self,
        image_name: str = "eclipse-temurin:17-jdk-alpine",
        memory_limit: str = "256m",
        cpu_quota: int = 50000,  # 50% of one CPU core
        timeout: int = 10
    ):
        """Initialize Java executor with Docker client"""
        super().__init__(image_name, memory_limit, cpu_quota, timeout)
        
        try:
            self.client = docker.from_env()
            # Test connection
            self.client.ping()
            logger.info("Docker client initialized successfully for Java")
        except docker.errors.DockerException as e:
            logger.error(f"Failed to initialize Docker client: {e}")
            raise RuntimeError(
                "Docker is not available. Please ensure Docker is installed and running."
            )
    
    def _has_user_main(self, code: str) -> bool:
        """
        Check if user has defined their own main method.
        This allows users to write their own sanity checks.
        
        Args:
            code: User's Java code
            
        Returns:
            True if code contains a main method, False otherwise
        """
        # Pattern for main method: public static void main(String[] args) or variations
        main_pattern = r'public\s+static\s+void\s+main\s*\(\s*String\s*\[\s*\]\s+\w+\s*\)'
        return bool(re.search(main_pattern, code))
    
    def _is_method_definition(self, code: str) -> bool:
        """
        Check if code is a method definition (needs to be at class level).
        
        Args:
            code: Code to check
            
        Returns:
            True if code is a method definition, False otherwise
        """
        # Strip leading/trailing whitespace
        code_stripped = code.strip()
        
        # Pattern for method definition: (public|private|protected|static|final)+ ReturnType<Generics>? methodName(...)
        # This handles:
        # - Multiple modifiers (public static final)
        # - Generic return types (List<String>, Map<K,V>)
        # - Throws clauses
        # - Array return types (String[])
        method_pattern = r'^\s*(public|private|protected|static|final|\s)+\s+[\w\<\>\,\[\]]+\s+\w+\s*\([^)]*\)\s*(\{|throws)'
        
        return bool(re.match(method_pattern, code_stripped, re.MULTILINE))
    
    def _has_executable_statements(self, code: str) -> bool:
        """
        Check if code contains executable statements (not just method definitions).
        This helps distinguish between:
        - Just methods: public static int add(...) { }
        - Methods + calls: public static int add(...) { } System.out.println(add(1,2));
        
        Args:
            code: Code to check
            
        Returns:
            True if code has statements that need to execute in main
        """
        # Remove method definitions to see what's left
        # This is a heuristic: look for common statement patterns outside method bodies
        
        lines = code.strip().split('\n')
        in_method = False
        brace_count = 0
        
        for line in lines:
            stripped = line.strip()
            if not stripped or stripped.startswith('//'):
                continue
            
            # Track if we're inside a method definition
            if re.match(r'(public|private|protected|static|final)+.*\w+\s*\([^)]*\)', stripped):
                in_method = True
            
            # Count braces to track method scope
            brace_count += stripped.count('{') - stripped.count('}')
            
            # If braces are balanced, we've exited the method
            if in_method and brace_count == 0:
                in_method = False
            
            # If we're not in a method and find executable code, return True
            if not in_method and brace_count == 0:
                # Check for common statement patterns
                if (stripped.endswith(';') and 
                    not stripped.startswith('import') and
                    not stripped.startswith('package')):
                    return True
        
        return False
    
    def _prepare_code(self, user_code: str, stdin_data: str = "") -> str:
        """
        Wraps user code in a LeetCode-style test harness with Solution class.
        
        Smart detection:
        1. If user has their own main() → Use it (for sanity checks)
        2. If no main() → Auto-call first Solution method
        3. Remind users they can write their own main for testing
        
        Args:
            user_code: User's Solution class code
            stdin_data: Standard input to inject
            
        Returns:
            Complete Java source ready for compilation
        """
        # Escape stdin for Java string literal
        stdin_escaped = (stdin_data
            .replace('\\', '\\\\')
            .replace('"', '\\"')
            .replace('\n', '\\n')
            .replace('\r', '\\r')
            .replace('\t', '\\t'))
        
        # Check if user has their own main method
        has_user_main = self._has_user_main(user_code)
        
        # If user has their own main, use their code directly with Main class wrapper
        if has_user_main:
            # User is doing their own testing - respect that
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
            method_name = extract_java_method_name(user_code)
            
            if method_name:
                # User provided Solution class with method - wrap and call it
                wrapper = f'''
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
            // For methods with parameters, use test cases instead
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
                wrapper = f'''
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
            wrapper = f'''
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
        
        return wrapper
    
    def _extract_main_body(self, code: str) -> str:
        """
        Extract the body of the main method from a full class definition.
        
        Args:
            code: Full Java class code
            
        Returns:
            Body of the main method
        """
        # Try to find main method and extract its body
        main_match = re.search(
            r'public\s+static\s+void\s+main\s*\([^)]*\)\s*(?:throws[^{]*)?\{',
            code,
            re.DOTALL
        )
        
        if not main_match:
            # No main method found, return entire code
            return code
        
        # Find the matching closing brace
        start_idx = main_match.end()
        brace_count = 1
        idx = start_idx
        
        while idx < len(code) and brace_count > 0:
            if code[idx] == '{':
                brace_count += 1
            elif code[idx] == '}':
                brace_count -= 1
            idx += 1
        
        # Extract body (without the outer braces)
        if brace_count == 0:
            return code[start_idx:idx-1].strip()
        else:
            # Couldn't match braces, return original
            return code
    
    async def execute_code(
        self,
        code: str,
        stdin: str = "",
        test_cases: Optional[List[Dict]] = None,
        skip_wrapper: bool = False
    ) -> ExecutionResult:
        """
        Execute Java code with compilation step.
        
        Args:
            code: Java code to execute
            stdin: Standard input for the program
            test_cases: Optional test cases (not used in simple execution)
            skip_wrapper: If True, skip _prepare_code wrapper (code is already complete)
            
        Returns:
            ExecutionResult with compilation and runtime output
        """
        start_time = time.time()
        
        # Skip wrapper if code is already a complete test wrapper
        if skip_wrapper:
            wrapped_code = code
        else:
            wrapped_code = self._prepare_code(code, stdin)
        
        # Escape code for shell (wrap in single quotes and escape single quotes)
        escaped_code = wrapped_code.replace("'", "'\"'\"'")
        
        try:
            logger.info("Starting Java container execution...")
            container = self.client.containers.run(
                self.image_name,
                # Compile and run in one command
                command=[
                    "sh", "-c",
                    f"echo '{escaped_code}' > /tmp/Main.java && "
                    f"javac /tmp/Main.java 2>&1 && "
                    f"cd /tmp && java -Xmx128m Main 2>&1"
                ],
                detach=True,
                remove=False,
                mem_limit=self.memory_limit,
                cpu_quota=self.cpu_quota,
                network_disabled=True,
                tmpfs={'/tmp': 'size=50M,mode=1777'},  # Need space for .class files
            )
            
            # Wait with timeout
            try:
                result = container.wait(timeout=self.timeout)
                exit_code = result['StatusCode']
            except Exception:
                container.stop(timeout=0)
                container.remove(force=True)
                execution_time = time.time() - start_time
                logger.warning(f"Java execution timeout after {execution_time:.3f}s")
                return ExecutionResult(
                    status="timeout",
                    output="",
                    error=f"Execution exceeded {self.timeout} second time limit",
                    execution_time=execution_time
                )
            
            # Get output (Java outputs everything to stdout by default in our wrapper)
            output = container.logs(stdout=True, stderr=False).decode('utf-8', errors='replace')
            error_output = container.logs(stdout=False, stderr=True).decode('utf-8', errors='replace')
            
            container.remove(force=True)
            execution_time = time.time() - start_time
            
            # Check for compilation errors (javac outputs to stderr in container)
            if ".java:" in output or "error:" in output.lower():
                logger.info(f"Java compilation failed in {execution_time:.3f}s")
                return ExecutionResult(
                    status="error",
                    output="",
                    error=output + "\n" + error_output,
                    execution_time=execution_time,
                    exit_code=1
                )
            
            # Check for runtime errors
            if "Runtime Error:" in output or "Exception" in output:
                logger.info(f"Java runtime error in {execution_time:.3f}s")
                return ExecutionResult(
                    status="error",
                    output="",
                    error=output + "\n" + error_output,
                    execution_time=execution_time,
                    exit_code=exit_code
                )
            
            # Success
            status = "success" if exit_code == 0 else "error"
            logger.info(f"Java execution completed: {status} in {execution_time:.3f}s")
            
            return ExecutionResult(
                status=status,
                output=output,
                error=error_output,
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
                error="Java environment not available. Please contact administrator.",
                execution_time=0
            )
            
        except Exception as e:
            logger.error(f"Unexpected Java execution error: {e}", exc_info=True)
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
        Execute Java code and validate against test cases.
        
        Args:
            code: Java code to execute
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
            
            # Generate test code that calls the Solution method with inputs
            test_code, error = create_java_test_code(code, test_input)
            
            if error:
                # Failed to generate test code (e.g., no Solution class found)
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
            # No valid test executions
            return ExecutionResult(
                status="error",
                output="",
                error="No valid test cases executed",
                test_results=test_results
            )
    
    def health_check(self) -> Dict[str, Any]:
        """
        Check if Docker is healthy and Java image is available.
        
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
                "language": "java",
                "resource_limits": {
                    "memory": self.memory_limit,
                    "cpu_quota": self.cpu_quota,
                    "timeout": self.timeout,
                    "jvm_heap": "128m"
                }
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "docker_available": False,
                "language": "java",
                "error": str(e)
            }
