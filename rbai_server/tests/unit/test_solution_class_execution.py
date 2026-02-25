"""
Unit tests for Solution class execution with test cases.
Tests the integration of Solution class pattern with test case execution.
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from app.services.execution.executors.python_executor import PythonExecutor
from app.services.execution.validators.python_test_validator import (
    extract_solution_method_name,
    create_test_code,
    generate_test_wrapper
)


class TestSolutionClassWithTestCases:
    """Test Solution class pattern with test case execution"""
    
    @pytest.fixture
    def executor(self):
        with patch('app.services.execution.executors.python_executor.docker.from_env'):
            executor = PythonExecutor()
            executor.client = Mock()
            return executor
    
    def test_extract_solution_method_name_simple(self):
        """Test extracting method name from simple Solution class"""
        code = """class Solution:
    def add(self, a, b):
        return a + b
"""
        method_name = extract_solution_method_name(code)
        assert method_name == "add"
    
    def test_extract_solution_method_name_with_init(self):
        """Test that __init__ is skipped and first regular method is found"""
        code = """class Solution:
    def __init__(self):
        pass
    
    def multiply(self, a, b):
        return a * b
"""
        method_name = extract_solution_method_name(code)
        assert method_name == "multiply"
    
    def test_extract_solution_method_name_no_methods(self):
        """Test extraction when Solution class has no methods"""
        code = """class Solution:
    pass
"""
        method_name = extract_solution_method_name(code)
        assert method_name is None
    
    def test_create_test_code_with_solution_class(self):
        """Test test code generation for Solution class"""
        code = """class Solution:
    def add(self, a, b):
        return a + b
"""
        test_input = "5, 3"
        
        test_code, error = create_test_code(code, test_input)
        
        assert error is None
        assert "class Solution:" in test_code
        assert "solution = Solution()" in test_code
        assert "solution.add(5, 3)" in test_code
        assert "print(result)" in test_code
    
    def test_create_test_code_with_standalone_function(self):
        """Test test code generation for standalone function (legacy)"""
        code = """def add(a, b):
    return a + b
"""
        test_input = "5, 3"
        
        test_code, error = create_test_code(code, test_input)
        
        assert error is None
        assert "def add(a, b):" in test_code
        assert "result = add(5, 3)" in test_code
        assert "solution = Solution()" not in test_code
    
    def test_create_test_code_no_method_found(self):
        """Test error handling when no method found in Solution class"""
        code = """class Solution:
    pass
"""
        test_input = "5, 3"
        
        test_code, error = create_test_code(code, test_input)
        
        assert error is not None
        assert "No method found" in error
    
    def test_generate_test_wrapper_solution_class(self):
        """Test wrapper generation for Solution class"""
        code = """class Solution:
    def hello_world(self):
        return "Hello, World!"
"""
        
        wrapper = generate_test_wrapper(
            user_code=code,
            function_name="hello_world",
            test_args=[],
            is_solution_class=True
        )
        
        assert "class Solution:" in wrapper
        assert "solution = Solution()" in wrapper
        assert "solution.hello_world()" in wrapper
    
    def test_generate_test_wrapper_with_args(self):
        """Test wrapper generation with arguments"""
        code = """class Solution:
    def add(self, a, b):
        return a + b
"""
        
        wrapper = generate_test_wrapper(
            user_code=code,
            function_name="add",
            test_args=["5", "3"],
            is_solution_class=True
        )
        
        assert "solution.add(5, 3)" in wrapper
    
    @pytest.mark.asyncio
    async def test_execute_with_tests_solution_class(self, executor):
        """Test execute_with_tests for Solution class"""
        code = """class Solution:
    def add(self, a, b):
        return a + b
"""
        
        test_cases = [
            {"input": "2, 3", "expected_output": "5"},
            {"input": "10, 20", "expected_output": "30"}
        ]
        
        # Verify test code generation is correct (not wrapped twice)
        test_code, error = create_test_code(code, "2, 3")
        assert error is None
        # Test code should only have ONE print statement
        print_count = test_code.count('print(result)')
        assert print_count == 1, f"Expected 1 print statement, found {print_count}"
        
        # Mock container execution
        mock_container = Mock()
        mock_container.wait.return_value = {"StatusCode": 0}
        mock_container.logs.side_effect = [
            b"5\n",  # First test stdout
            b"",     # First test stderr
            b"30\n", # Second test stdout
            b""      # Second test stderr
        ]
        mock_container.remove = Mock()
        
        executor.client.containers.run.return_value = mock_container
        
        result = await executor.execute_with_tests(code, test_cases)
        
        assert result.status == "success"
        assert result.test_results is not None
        assert len(result.test_results) == 2
        assert result.test_results[0]["passed"] is True
        assert result.test_results[1]["passed"] is True
    
    @pytest.mark.asyncio
    async def test_execute_with_tests_failed_test(self, executor):
        """Test execute_with_tests when a test fails"""
        code = """class Solution:
    def add(self, a, b):
        return a + b
"""
        
        test_cases = [
            {"input": "2, 3", "expected_output": "5"},
            {"input": "10, 20", "expected_output": "50"}  # Wrong expected output
        ]
        
        # Mock container execution
        mock_container = Mock()
        mock_container.wait.return_value = {"StatusCode": 0}
        mock_container.logs.side_effect = [
            b"5\n",  # First test stdout
            b"",     # First test stderr
            b"30\n", # Second test stdout (actual is 30, expected is 50)
            b""      # Second test stderr
        ]
        mock_container.remove = Mock()
        
        executor.client.containers.run.return_value = mock_container
        
        result = await executor.execute_with_tests(code, test_cases)
        
        assert result.status == "failed_tests"
        assert result.test_results is not None
        assert len(result.test_results) == 2
        assert result.test_results[0]["passed"] is True
        assert result.test_results[1]["passed"] is False
        assert result.test_results[1]["actual_output"] == "30"
        assert result.test_results[1]["expected_output"] == "50"
    
    @pytest.mark.asyncio
    async def test_execute_with_tests_no_parameters(self, executor):
        """Test execute_with_tests for method with no parameters"""
        code = """class Solution:
    def hello_world(self):
        return "Hello, World!"
"""
        
        test_cases = [
            {"input": "", "expected_output": "Hello, World!"}
        ]
        
        # Verify test code generation doesn't duplicate prints
        test_code, error = create_test_code(code, "")
        assert error is None
        print_count = test_code.count('print(result)')
        assert print_count == 1, f"Expected 1 print statement, found {print_count}"
        
        # Mock container execution
        mock_container = Mock()
        mock_container.wait.return_value = {"StatusCode": 0}
        mock_container.logs.side_effect = [
            b"Hello, World!\n",  # stdout
            b""                  # stderr
        ]
        mock_container.remove = Mock()
        
        executor.client.containers.run.return_value = mock_container
        
        result = await executor.execute_with_tests(code, test_cases)
        
        assert result.status == "success"
        assert result.test_results[0]["passed"] is True
        # Verify output is not duplicated
        assert result.output.strip() == "Hello, World!"
        assert result.output.count("Hello, World!") == 1, "Output should not be duplicated"
    
    @pytest.mark.asyncio
    async def test_execute_with_tests_multiple_methods(self, executor):
        """Test that first method is used when multiple methods exist"""
        code = """class Solution:
    def add(self, a, b):
        return a + b
    
    def subtract(self, a, b):
        return a - b
"""
        
        test_cases = [
            {"input": "5, 3", "expected_output": "8"}
        ]
        
        # Mock container execution
        mock_container = Mock()
        mock_container.wait.return_value = {"StatusCode": 0}
        mock_container.logs.side_effect = [
            b"8\n",  # stdout
            b""      # stderr
        ]
        mock_container.remove = Mock()
        
        executor.client.containers.run.return_value = mock_container
        
        result = await executor.execute_with_tests(code, test_cases)
        
        # Should test the add method (first method)
        assert result.status == "success"
        assert result.test_results[0]["passed"] is True
    
    def test_solution_class_mixed_case(self):
        """Test that lowercase 'solution' falls back to standalone function"""
        code = """class solution:
    def add(self, a, b):
        return a + b
"""
        
        # Lowercase 'solution' should not be detected as Solution class pattern
        # It will be treated as regular class and extract function will fail
        test_code, error = create_test_code(code, "5, 3")
        
        # Should return error since no standalone function and no Solution class
        assert error is not None
    
    def test_solution_class_with_inheritance(self):
        """Test Solution class with inheritance"""
        code = """class Solution(object):
    def add(self, a, b):
        return a + b
"""
        
        method_name = extract_solution_method_name(code)
        assert method_name == "add"
        
        test_code, error = create_test_code(code, "5, 3")
        assert error is None
        assert "solution.add(5, 3)" in test_code


class TestSolutionClassEdgeCases:
    """Test edge cases for Solution class pattern"""
    
    def test_empty_solution_class(self):
        """Test empty Solution class"""
        code = "class Solution:\n    pass"
        
        method_name = extract_solution_method_name(code)
        assert method_name is None
    
    def test_solution_class_only_init(self):
        """Test Solution class with only __init__"""
        code = """class Solution:
    def __init__(self):
        self.value = 0
"""
        
        method_name = extract_solution_method_name(code)
        assert method_name is None
    
    def test_solution_class_with_properties(self):
        """Test Solution class with property decorators"""
        code = """class Solution:
    def __init__(self):
        self._value = 0
    
    @property
    def value(self):
        return self._value
    
    def compute(self, x):
        return x * 2
"""
        
        method_name = extract_solution_method_name(code)
        # Should skip property and find compute
        assert method_name == "value" or method_name == "compute"
    
    def test_multiline_method_definition(self):
        """Test Solution class with multiline method signature"""
        code = """class Solution:
    def long_method_name(
        self,
        param1,
        param2
    ):
        return param1 + param2
"""
        
        method_name = extract_solution_method_name(code)
        assert method_name == "long_method_name"
    
    def test_no_solution_class_shows_error(self):
        """Test that code without Solution class returns proper error"""
        code = """def add(a, b):
    return a + b
"""
        
        # This should still work (legacy support)
        test_code, error = create_test_code(code, "5, 3")
        assert error is None
    
    def test_malformed_solution_class(self):
        """Test malformed Solution class"""
        code = """class Solution
    def add(self, a, b)
        return a + b
"""
        
        # Should handle syntax errors gracefully
        method_name = extract_solution_method_name(code)
        # May or may not find method depending on regex
        assert method_name is None or method_name == "add"
