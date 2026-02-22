"""
Integration tests for multi-language code execution.
Tests Python and Java executors with actual Docker containers.
"""

import pytest
from app.services.execution import get_executor


class TestPythonExecution:
    """Integration tests for Python executor"""
    
    @pytest.mark.asyncio
    async def test_simple_print(self):
        """Test basic print statement execution"""
        executor = get_executor('python')
        code = "print('Hello from Python!')"
        
        result = await executor.execute_code(code)
        
        assert result.status == "success"
        assert "Hello from Python!" in result.output
        assert result.execution_time > 0
    
    @pytest.mark.asyncio
    async def test_stdin_input(self):
        """Test reading from stdin"""
        executor = get_executor('python')
        code = """
name = input()
print(f"Hello, {name}!")
"""
        
        result = await executor.execute_code(code, stdin="Alice")
        
        assert result.status == "success"
        assert "Hello, Alice!" in result.output
    
    @pytest.mark.asyncio
    async def test_math_operations(self):
        """Test arithmetic operations"""
        executor = get_executor('python')
        code = """
a = 5
b = 3
print(f"Sum: {a + b}")
print(f"Product: {a * b}")
"""
        
        result = await executor.execute_code(code)
        
        assert result.status == "success"
        assert "Sum: 8" in result.output
        assert "Product: 15" in result.output
    
    @pytest.mark.asyncio
    async def test_with_test_cases(self):
        """Test execution with automated test cases"""
        executor = get_executor('python')
        code = """
def add(a, b):
    return a + b

# Test execution
a, b = map(int, input().split())
print(add(a, b))
"""
        
        test_cases = [
            {"input": "5 3", "expected_output": "8"},
            {"input": "10 20", "expected_output": "30"},
            {"input": "0 0", "expected_output": "0"}
        ]
        
        result = await executor.execute_with_tests(code, test_cases)
        
        assert result.status == "success"
        passed = sum(1 for tc in result.test_results if tc['passed'])
        assert passed == len(test_cases)


class TestJavaExecution:
    """Integration tests for Java executor"""
    
    @pytest.mark.asyncio
    async def test_simple_print(self):
        """Test basic print statement execution"""
        executor = get_executor('java')
        code = 'System.out.println("Hello from Java!");'
        
        result = await executor.execute_code(code)
        
        assert result.status == "success"
        assert "Hello from Java!" in result.output
        assert result.execution_time > 0
    
    @pytest.mark.asyncio
    async def test_scanner_stdin(self):
        """Test reading from Scanner with stdin"""
        executor = get_executor('java')
        code = """
Scanner scanner = new Scanner(System.in);
String name = scanner.nextLine();
System.out.println("Hello, " + name + "!");
scanner.close();
"""
        
        result = await executor.execute_code(code, stdin="Alice")
        
        assert result.status == "success"
        assert "Hello, Alice!" in result.output
    
    @pytest.mark.asyncio
    async def test_math_operations(self):
        """Test arithmetic operations"""
        executor = get_executor('java')
        code = """
int a = 5;
int b = 3;
System.out.println("Sum: " + (a + b));
System.out.println("Product: " + (a * b));
"""
        
        result = await executor.execute_code(code)
        
        assert result.status == "success"
        assert "Sum: 8" in result.output
        assert "Product: 15" in result.output
    
    @pytest.mark.asyncio
    async def test_full_class_definition(self):
        """Test executing a full class with main method"""
        executor = get_executor('java')
        code = """
public class Main {
    public static void main(String[] args) {
        System.out.println("From full class!");
    }
}
"""
        
        result = await executor.execute_code(code)
        
        assert result.status == "success"
        assert "From full class!" in result.output
    
    @pytest.mark.asyncio
    async def test_with_test_cases(self):
        """Test execution with automated test cases"""
        executor = get_executor('java')
        code = """
Scanner scanner = new Scanner(System.in);
int a = scanner.nextInt();
int b = scanner.nextInt();
System.out.println(a + b);
scanner.close();
"""
        
        test_cases = [
            {"input": "5 3", "expected_output": "8"},
            {"input": "10 20", "expected_output": "30"},
            {"input": "0 0", "expected_output": "0"}
        ]
        
        result = await executor.execute_with_tests(code, test_cases)
        
        assert result.status == "success"
        passed = sum(1 for tc in result.test_results if tc['passed'])
        assert passed == len(test_cases)


class TestMultiLanguageSupport:
    """Cross-language integration tests"""
    
    @pytest.mark.asyncio
    @pytest.mark.parametrize("language,code,expected", [
        ("python", "print(2 + 2)", "4"),
        ("java", "System.out.println(2 + 2);", "4"),
    ])
    async def test_same_logic_different_languages(self, language, code, expected):
        """Test that same logic works across languages"""
        executor = get_executor(language)
        result = await executor.execute_code(code)
        
        assert result.status == "success"
        assert expected in result.output
