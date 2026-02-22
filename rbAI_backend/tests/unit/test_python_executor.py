"""
Unit tests for PythonExecutor.
Tests Python code execution and validation.
"""

import pytest
from unittest.mock import Mock, patch
from app.services.execution.executors.python_executor import PythonExecutor
from app.services.execution.base_executor import ExecutionResult


class TestPythonExecutor:
    """Test suite for PythonExecutor"""
    
    @pytest.fixture
    def executor(self):
        """Create a PythonExecutor instance for testing"""
        with patch('app.services.execution.executors.python_executor.docker.from_env'):
            executor = PythonExecutor()
            executor.client = Mock()
            executor.client.ping = Mock()
            return executor
    
    def test_initialization(self):
        """Test PythonExecutor initialization"""
        with patch('app.services.execution.executors.python_executor.docker.from_env') as mock_docker:
            mock_client = Mock()
            mock_client.ping = Mock()
            mock_docker.return_value = mock_client
            
            executor = PythonExecutor()
            
            assert executor.image_name == "python:3.10-alpine"
            assert executor.memory_limit == "128m"
            assert executor.timeout == 5
            mock_docker.assert_called_once()
    
    def test_prepare_code_simple(self, executor):
        """Test simple code preparation without Solution class"""
        code = "print('Hello')"
        stdin = ""
        
        wrapped = executor._prepare_code(code, stdin)
        
        # Should show error message guiding to use Solution class
        assert "Please define a Solution class" in wrapped
        assert "class Solution:" in wrapped  # Error message shows example
    
    def test_prepare_code_with_stdin(self, executor):
        """Test code preparation with stdin injection and Solution class"""
        code = """class Solution:
    def greet(self, name):
        print(f'Hello, {name}')
"""
        stdin = "Alice"
        
        wrapped = executor._prepare_code(code, stdin)
        
        # Check that stdin is properly escaped and injected
        assert "sys.stdin = io.StringIO(" in wrapped
        assert "class Solution:" in wrapped
        assert "solution = Solution()" in wrapped
    
    def test_prepare_code_escapes_quotes(self, executor):
        """Test that quotes in stdin are properly escaped"""
        code = """class Solution:
    def test(self):
        print('test')
"""
        stdin = "Text with 'single' and \"double\" quotes"
        
        wrapped = executor._prepare_code(code, stdin)
        
        # Should escape quotes properly
        assert "sys.stdin = io.StringIO(" in wrapped
        assert "\\" in wrapped  # Has some escaping
    
    @pytest.mark.asyncio
    async def test_execute_code_success_mock(self, executor):
        """Test successful Python code execution with mocked Docker"""
        # Mock container behavior
        mock_container = Mock()
        mock_container.wait.return_value = {"StatusCode": 0}
        mock_container.logs.return_value = b"Hello, World!\n"
        mock_container.remove = Mock()
        
        executor.client.containers.run.return_value = mock_container
        
        code = "print('Hello, World!')"
        result = await executor.execute_code(code)
        
        assert result.status == "success"
        assert "Hello, World!" in result.output
        assert result.exit_code == 0
    
    @pytest.mark.asyncio
    async def test_execute_code_syntax_error_mock(self, executor):
        """Test handling of Python syntax errors with mocked Docker"""
        mock_container = Mock()
        mock_container.wait.return_value = {"StatusCode": 1}
        mock_container.logs.return_value = b"SyntaxError: invalid syntax\n"
        mock_container.remove = Mock()
        
        executor.client.containers.run.return_value = mock_container
        
        code = "print('test'"  # Missing closing paren
        result = await executor.execute_code(code)
        
        assert result.status == "error"
        assert "SyntaxError" in result.output or "SyntaxError" in result.error
    
    @pytest.mark.asyncio
    async def test_execute_code_runtime_error_mock(self, executor):
        """Test handling of Python runtime errors with mocked Docker"""
        mock_container = Mock()
        mock_container.wait.return_value = {"StatusCode": 1}
        mock_container.logs.return_value = b"ZeroDivisionError: division by zero\n"
        mock_container.remove = Mock()
        
        executor.client.containers.run.return_value = mock_container
        
        code = "x = 1 / 0"
        result = await executor.execute_code(code)
        
        assert result.status == "error"
        assert result.exit_code == 1
    
    @pytest.mark.skip(reason="Complex async mock with test generation - covered by integration tests")
    @pytest.mark.asyncio
    async def test_execute_with_tests_all_pass(self, executor):
        """Test code execution with all test cases passing"""
        # Create separate mock containers for each test execution
        mock_container1 = Mock()
        mock_container1.wait.return_value = {"StatusCode": 0}
        mock_container1.logs.side_effect = [b"8\n", b""]  # stdout, stderr
        mock_container1.remove = Mock()
        
        mock_container2 = Mock()
        mock_container2.wait.return_value = {"StatusCode": 0}
        mock_container2.logs.side_effect = [b"30\n", b""]  # stdout, stderr
        mock_container2.remove = Mock()
        
        # Return different containers for each test case
        executor.client.containers.run.side_effect = [mock_container1, mock_container2]
        
        code = "a, b = map(int, input().split())\nprint(a + b)"
        test_cases = [
            {"input": "5 3", "expected_output": "8"},
            {"input": "10 20", "expected_output": "30"}
        ]
        
        result = await executor.execute_with_tests(code, test_cases)
        
        assert result.status == "success"
        assert len(result.test_results) == 2
        assert all(test["passed"] for test in result.test_results)
    
    @pytest.mark.skip(reason="Complex async mock with test generation - covered by integration tests")
    @pytest.mark.asyncio
    async def test_execute_with_tests_some_fail(self, executor):
        """Test code execution with some failing test cases"""
        # Create separate mock containers for each test execution
        mock_container1 = Mock()
        mock_container1.wait.return_value = {"StatusCode": 0}
        mock_container1.logs.side_effect = [b"8\n", b""]  # stdout, stderr
        mock_container1.remove = Mock()
        
        mock_container2 = Mock()
        mock_container2.wait.return_value = {"StatusCode": 0}
        mock_container2.logs.side_effect = [b"25\n", b""]  # Wrong output
        mock_container2.remove = Mock()
        
        # Return different containers for each test case
        executor.client.containers.run.side_effect = [mock_container1, mock_container2]
        
        code = "print('8')"
        test_cases = [
            {"input": "5 3", "expected_output": "8"},
            {"input": "10 20", "expected_output": "30"}  # Will fail
        ]
        
        result = await executor.execute_with_tests(code, test_cases)
        
        assert result.status == "failed_tests"
        assert len(result.test_results) == 2
        assert result.test_results[0]["passed"] is True
        assert result.test_results[1]["passed"] is False
    
    @pytest.mark.asyncio
    async def test_execute_code_timeout_mock(self, executor):
        """Test handling of execution timeout"""
        import docker.errors
        
        # Mock timeout exception
        executor.client.containers.run.side_effect = docker.errors.ContainerError(
            container="test",
            exit_status=137,
            command="python",
            image="python:3.10-alpine",
            stderr=b"Timeout"
        )
        
        code = "while True: pass"  # Infinite loop
        result = await executor.execute_code(code)
        
        assert result.status == "error"
    
    def test_health_check_healthy(self, executor):
        """Test health check when Docker is available"""
        executor.client.ping = Mock()
        executor.client.images.get = Mock()
        
        health = executor.health_check()
        
        assert health["status"] == "healthy"
        assert health["docker_available"] is True
        assert health["language"] == "python"
    
    def test_health_check_unhealthy(self, executor):
        """Test health check when Docker is unavailable"""
        executor.client.ping.side_effect = Exception("Docker unavailable")
        
        health = executor.health_check()
        
        assert health["status"] == "unhealthy"
        assert health["docker_available"] is False


class TestPythonCodePreparationEdgeCases:
    """Test edge cases in Python code preparation"""
    
    @pytest.fixture
    def executor(self):
        with patch('app.services.execution.executors.python_executor.docker.from_env'):
            executor = PythonExecutor()
            executor.client = Mock()
            return executor
    
    def test_multiline_code(self, executor):
        """Test preparation of multiline Solution class code"""
        code = """
class Solution:
    def add(self, a, b):
        return a + b
    
    def test(self):
        result = self.add(5, 3)
        print(result)
"""
        wrapped = executor._prepare_code(code, "")
        
        assert "class Solution:" in wrapped
        assert "def add(self, a, b):" in wrapped
        assert "solution = Solution()" in wrapped
    
    def test_code_with_imports(self, executor):
        """Test Solution class with import statements"""
        code = """
import math

class Solution:
    def get_pi(self):
        return math.pi
"""
        wrapped = executor._prepare_code(code, "")
        
        assert "import math" in wrapped
        assert "class Solution:" in wrapped
    
    def test_stdin_with_newlines(self, executor):
        """Test stdin with multiple newlines in Solution class"""
        code = """class Solution:
    def read_lines(self):
        lines = [input() for _ in range(3)]
        print(lines)
"""
        stdin = "line1\nline2\nline3"
        
        wrapped = executor._prepare_code(code, stdin)
        
        assert "sys.stdin = io.StringIO(" in wrapped
        assert "class Solution:" in wrapped
