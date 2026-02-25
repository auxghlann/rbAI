"""
Unit tests for Java method-only submission handling.
Ensures students are guided to write executable code.
"""

import pytest
from unittest.mock import Mock, patch
from app.services.execution.executors.java_executor import JavaExecutor


class TestJavaMethodCallDetection:
    """Test that bare method definitions are handled appropriately"""
    
    @pytest.fixture
    def executor(self):
        with patch('app.services.execution.executors.java_executor.docker.from_env'):
            executor = JavaExecutor()
            executor.client = Mock()
            return executor
    
    def test_method_only_includes_error_message(self, executor):
        """Test that method-only code (no Solution class) shows error message"""
        code = "public static int add(int a, int b) { return a + b; }"
        
        wrapped = executor._prepare_code(code, "")
        
        # Should show error message guiding to use Solution class
        assert "Please define a Solution class" in wrapped
        assert "class Solution" in wrapped  # Error message shows example
    
    def test_method_with_call_works(self, executor):
        """Test that method without Solution class shows error"""
        code = """public static int add(int a, int b) { 
    return a + b; 
}
System.out.println(add(5, 3));"""
        
        wrapped = executor._prepare_code(code, "")
        
        # Should show error message guiding to use Solution class
        assert "Please define a Solution class" in wrapped
    
    def test_simple_call_is_executable(self, executor):
        """Test that code without Solution class shows error"""
        code = "System.out.println(5 + 3);"
        
        wrapped = executor._prepare_code(code, "")
        
        # Should show error message guiding to use Solution class
        assert "Please define a Solution class" in wrapped
    
    def test_void_method_only(self, executor):
        """Test void method without Solution class gets error"""
        code = "public static void greet() { System.out.println(\"Hello\"); }"
        
        wrapped = executor._prepare_code(code, "")
        
        assert "Please define a Solution class" in wrapped
    
    def test_private_method_only(self, executor):
        """Test private method without Solution class gets error"""
        code = "private static String getMessage() { return \"test\"; }"
        
        wrapped = executor._prepare_code(code, "")
        
        assert "Please define a Solution class" in wrapped
    
    @pytest.mark.asyncio
    async def test_method_only_execution_fails(self, executor):
        """Test that executing bare method returns error status"""
        # Mock container that returns the error message
        mock_container = Mock()
        mock_container.wait.return_value = {"StatusCode": 1}
        mock_container.logs.side_effect = [
            b"",  # stdout
            b"Error: You defined a method but didn't call it.\n"  # stderr
        ]
        mock_container.remove = Mock()
        
        executor.client.containers.run.return_value = mock_container
        
        code = "public static int add(int a, int b) { return a + b; }"
        result = await executor.execute_code(code)
        
        assert result.status == "error"
        # Error message goes to stderr, which is in the error property or output
        assert "You defined a method but didn't call it" in (result.output + result.error)
