"""
Unit tests for JavaExecutor.
Tests Java code wrapping, compilation, and execution.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from app.services.execution.executors.java_executor import JavaExecutor
from app.services.execution.base_executor import ExecutionResult


class TestJavaExecutor:
    """Test suite for JavaExecutor"""
    
    @pytest.fixture
    def executor(self):
        """Create a JavaExecutor instance for testing"""
        with patch('app.services.execution.executors.java_executor.docker.from_env'):
            executor = JavaExecutor()
            # Mock the client to avoid actual Docker calls
            executor.client = Mock()
            executor.client.ping = Mock()
            return executor
    
    def test_initialization(self):
        """Test JavaExecutor initialization"""
        with patch('app.services.execution.executors.java_executor.docker.from_env') as mock_docker:
            mock_client = Mock()
            mock_client.ping = Mock()
            mock_docker.return_value = mock_client
            
            executor = JavaExecutor()
            
            assert executor.image_name == "eclipse-temurin:17-alpine"
            assert executor.memory_limit == "256m"
            assert executor.timeout == 10
            mock_docker.assert_called_once()
    
    def test_is_method_definition_detects_public_static_method(self, executor):
        """Test detection of public static method definitions"""
        code = "public static int add(int a, int b) { return a + b; }"
        assert executor._is_method_definition(code) is True
    
    def test_is_method_definition_detects_public_method(self, executor):
        """Test detection of public method definitions"""
        code = "public void display() { System.out.println('test'); }"
        assert executor._is_method_definition(code) is True
    
    def test_is_method_definition_detects_private_method(self, executor):
        """Test detection of private method definitions"""
        code = "private int calculate(int x) { return x * 2; }"
        assert executor._is_method_definition(code) is True
    
    def test_is_method_definition_rejects_statements(self, executor):
        """Test that regular statements are not detected as methods"""
        code = "System.out.println('Hello');"
        assert executor._is_method_definition(code) is False
    
    def test_is_method_definition_rejects_variable_declarations(self, executor):
        """Test that variable declarations are not detected as methods"""
        code = "int x = 5;"
        assert executor._is_method_definition(code) is False
    
    def test_prepare_code_with_method_definition(self, executor, sample_java_method):
        """Test that code without Solution class gets an error message"""
        wrapped = executor._prepare_code(sample_java_method, "")
        
        # Check that it shows the error message guiding students to use Solution class
        assert "Please define a Solution class" in wrapped
        assert "public class Main {" in wrapped
        assert "public static void main(String[] args)" in wrapped
    
    def test_prepare_code_with_executable_statements(self, executor):
        """Test that code without Solution class gets an error message"""
        code = "System.out.println('Hello');"
        wrapped = executor._prepare_code(code, "")
        
        # Check that it shows the error message
        assert "Please define a Solution class" in wrapped
        assert "public static void main(String[] args)" in wrapped
    
    def test_prepare_code_with_stdin_injection(self, executor):
        """Test that stdin data is properly escaped and injected with Solution class"""
        code = """class Solution {
    public void test() {
        System.out.println("test");
    }
}"""
        stdin = "Alice\nBob"
        wrapped = executor._prepare_code(code, stdin)
        
        # Check stdin is escaped and injected
        assert 'String input = "Alice\\nBob"' in wrapped
        assert "System.setIn(new ByteArrayInputStream(input.getBytes()))" in wrapped
    
    def test_prepare_code_escapes_special_characters(self, executor):
        """Test that special characters in stdin are properly escaped"""
        code = """class Solution {
    public void test() {
        System.out.println("test");
    }
}"""
        stdin = 'Test "quotes" and \\ backslashes \n newlines \t tabs'
        wrapped = executor._prepare_code(code, stdin)
        
        # Check escaping
        assert '\\"' in wrapped  # Quotes escaped
        assert '\\\\' in wrapped  # Backslashes escaped
        assert '\\n' in wrapped   # Newlines escaped
        assert '\\t' in wrapped   # Tabs escaped
    
    def test_prepare_code_with_solution_class(self, executor):
        """Test handling of Solution class definition"""
        code = """class Solution {
    public int add(int a, int b) {
        return a + b;
    }
}"""
        wrapped = executor._prepare_code(code, "")
        
        # Should wrap with Main class and create Solution instance
        assert "class Solution" in wrapped
        assert "public class Main" in wrapped
        assert "Solution solution = new Solution();" in wrapped
        assert "System.setIn(new ByteArrayInputStream(input.getBytes()));" in wrapped
    
    def test_extract_main_body(self, executor):
        """Test extraction of main method body from full class"""
        full_class = """
public class Main {
    public static void main(String[] args) {
        System.out.println("test");
        int x = 5;
    }
}
"""
        body = executor._extract_main_body(full_class)
        
        # Should contain the main body content
        assert "System.out.println" in body
        assert "int x = 5" in body
        # Should NOT contain the method signature or outer braces
        assert "public static void main" not in body
    
    def test_indent_code(self, executor):
        """Test code indentation utility"""
        code = "line1\nline2\nline3"
        indented = executor._indent_code(code, 4)
        
        lines = indented.split('\n')
        assert all(line.startswith('    ') for line in lines)
    
    @pytest.mark.asyncio
    async def test_execute_code_success_mock(self, executor):
        """Test successful code execution with mocked Docker"""
        # Mock container behavior
        mock_container = Mock()
        mock_container.wait.return_value = {"StatusCode": 0}
        mock_container.logs.return_value = b"Hello, World!\n"
        mock_container.remove = Mock()
        
        executor.client.containers.run.return_value = mock_container
        
        code = "System.out.println('Hello, World!');"
        result = await executor.execute_code(code)
        
        assert result.status == "success"
        assert "Hello, World!" in result.output
        assert result.exit_code == 0
    
    @pytest.mark.skip(reason="Complex async mock setup - covered by integration tests")
    @pytest.mark.asyncio
    async def test_execute_code_compilation_error_mock(self, executor):
        """Test handling of compilation errors with mocked Docker"""
        # Mock container with compilation error
        mock_container = Mock()
        mock_container.wait.return_value = {"StatusCode": 1}
        # logs() is called twice: stdout then stderr
        mock_container.logs.side_effect = [b"", b"Main.java:5: error: ';' expected\n"]
        mock_container.remove = Mock()
        
        executor.client.containers.run.return_value = mock_container
        
        code = "invalid java code"
        result = await executor.execute_code(code)
        
        assert result.status == "error"
        assert "error" in result.output.lower()
    
    @pytest.mark.asyncio
    async def test_execute_with_tests_all_pass(self, executor):
        """Test code execution with passing test cases"""
        # Mock successful execution - each run calls logs twice (stdout, stderr)
        mock_container = Mock()
        mock_container.wait.return_value = {"StatusCode": 0}
        # First test: stdout="8", stderr="", Second test: stdout="30", stderr=""
        mock_container.logs.side_effect = [b"8\n", b"", b"30\n", b""]
        mock_container.remove = Mock()
        
        executor.client.containers.run.return_value = mock_container
        
        # Use proper Solution class pattern
        code = """class Solution {
    public int add(int a, int b) {
        return a + b;
    }
}"""
        test_cases = [
            {"input": "5, 3", "expected_output": "8"},
            {"input": "10, 20", "expected_output": "30"}
        ]
        
        result = await executor.execute_with_tests(code, test_cases)
        
        assert result.status == "success"
        assert len(result.test_results) == 2
        assert all(test["passed"] for test in result.test_results)
    
    def test_health_check_healthy(self, executor):
        """Test health check when Docker is available"""
        executor.client.ping = Mock()
        executor.client.images.get = Mock()
        
        health = executor.health_check()
        
        assert health["status"] == "healthy"
        assert health["docker_available"] is True
        assert health["image_available"] is True
        assert health["language"] == "java"
    
    def test_health_check_unhealthy(self, executor):
        """Test health check when Docker is unavailable"""
        executor.client.ping.side_effect = Exception("Docker unavailable")
        
        health = executor.health_check()
        
        assert health["status"] == "unhealthy"
        assert health["docker_available"] is False


class TestJavaCodeWrappingEdgeCases:
    """Test edge cases in Java code wrapping"""
    
    @pytest.fixture
    def executor(self):
        with patch('app.services.execution.executors.java_executor.docker.from_env'):
            executor = JavaExecutor()
            executor.client = Mock()
            return executor
    
    def test_method_with_multiple_modifiers(self, executor):
        """Test method with multiple modifiers (public static final)"""
        code = "public static final String getMessage() { return 'test'; }"
        assert executor._is_method_definition(code) is True
    
    def test_method_with_throws_clause(self, executor):
        """Test method with throws clause"""
        code = "public void process() throws IOException { }"
        assert executor._is_method_definition(code) is True
    
    def test_method_with_generic_return_type(self, executor):
        """Test method with generic return type"""
        code = "public List<String> getItems() { return null; }"
        assert executor._is_method_definition(code) is True
    
    def test_multiline_method_definition(self, executor):
        """Test multiline method definition without Solution class"""
        code = """public static int calculate(
            int a, 
            int b) {
    return a + b;
}"""
        wrapped = executor._prepare_code(code, "")
        # Should show error message
        assert "Please define a Solution class" in wrapped
