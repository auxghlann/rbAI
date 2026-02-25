"""
Test stripping user's main blocks when running test cases.
Ensures user's own main doesn't interfere with test execution.
"""

import pytest
from app.services.execution.validators.python_test_validator import (
    strip_user_main_block,
    generate_test_wrapper
)
from app.services.execution.validators.java_test_validator import (
    strip_user_main_method,
    generate_java_test_wrapper
)


class TestPythonStripUserMain:
    """Test Python main block removal"""
    
    def test_strip_main_block_simple(self):
        """Test removing simple main block"""
        code = """
class Solution:
    def hello_world(self):
        return "Hello, World!"

if __name__ == "__main__":
    print("Test output")
"""
        result = strip_user_main_block(code)
        
        assert "if __name__ == " not in result
        assert "class Solution:" in result
        assert "def hello_world" in result
    
    def test_strip_main_block_inside_class(self):
        """Test removing main block even if incorrectly placed inside class"""
        code = """
class Solution:
    def hello_world(self):
        return "Hello, World!"
    
    if __name__ == "__main__":
        print("Hello, World!!!!")
"""
        result = strip_user_main_block(code)
        
        assert "if __name__ == " not in result
        assert "class Solution:" in result
    
    def test_strip_main_block_with_double_quotes(self):
        """Test stripping main with double quotes"""
        code = '''
if __name__ == "__main__":
    print("Test")
'''
        result = strip_user_main_block(code)
        assert "if __name__" not in result
    
    def test_strip_main_block_with_single_quotes(self):
        """Test stripping main with single quotes"""
        code = """
if __name__ == '__main__':
    print("Test")
"""
        result = strip_user_main_block(code)
        assert "if __name__" not in result
    
    def test_no_main_block(self):
        """Test code without main block remains unchanged"""
        code = """
class Solution:
    def add(self, a, b):
        return a + b
"""
        result = strip_user_main_block(code)
        assert result.strip() == code.strip()
    
    def test_generate_wrapper_strips_main(self):
        """Test that generate_test_wrapper strips user's main"""
        code = """
class Solution:
    def hello_world(self):
        return "Hello, World!"

if __name__ == "__main__":
    print("User's test")
"""
        wrapper = generate_test_wrapper(code, "hello_world", [], is_solution_class=True)
        
        # Should have test's main, not user's
        assert wrapper.count("if __name__ == ") == 1
        assert "User's test" not in wrapper
        assert "Automated test execution" in wrapper


class TestJavaStripUserMain:
    """Test Java main method removal"""
    
    def test_strip_main_method_simple(self):
        """Test removing simple main method"""
        code = """
class Solution {
    public String helloWorld() {
        return "Hello, World";
    }
    
    public static void main(String[] args) {
        Solution s = new Solution();
        System.out.println(s.helloWorld());
    }
}
"""
        result = strip_user_main_method(code)
        
        assert "public static void main" not in result
        assert "class Solution" in result
        assert "public String helloWorld" in result
    
    def test_strip_main_method_with_nested_braces(self):
        """Test removing main method with nested braces"""
        code = """
class Solution {
    public int add(int a, int b) {
        return a + b;
    }
    
    public static void main(String[] args) {
        Solution s = new Solution();
        if (true) {
            System.out.println(s.add(5, 3));
        }
    }
}
"""
        result = strip_user_main_method(code)
        
        assert "public static void main" not in result
        assert "public int add" in result
        # Should not accidentally remove the if statement from the result
        # (since we're removing the entire main method)
    
    def test_strip_main_method_different_param_name(self):
        """Test stripping main with different parameter names"""
        code = """
class Solution {
    public String test() {
        return "test";
    }
    
    public static void main(String[] params) {
        System.out.println("Test");
    }
}
"""
        result = strip_user_main_method(code)
        
        assert "public static void main" not in result
        assert "public String test" in result
    
    def test_no_main_method(self):
        """Test code without main method remains unchanged"""
        code = """
class Solution {
    public int add(int a, int b) {
        return a + b;
    }
}
"""
        result = strip_user_main_method(code)
        assert "class Solution" in result
        assert "public int add" in result
    
    def test_generate_wrapper_strips_main(self):
        """Test that generate_java_test_wrapper strips user's main"""
        code = """
class Solution {
    public String helloWorld() {
        return "Hello, World";
    }
    
    public static void main(String[] args) {
        System.out.println("User's test");
    }
}
"""
        wrapper = generate_java_test_wrapper(code, "helloWorld", [], "String")
        
        # Should have only one Main class (the test's)
        assert wrapper.count("public class Main") == 1
        assert "User's test" not in wrapper
        # User's main method should be gone
        lines_with_main = [line for line in wrapper.split('\n') if 'public static void main' in line]
        assert len(lines_with_main) == 1  # Only the test's main


class TestIntegrationStripMain:
    """Integration tests for main stripping"""
    
    def test_python_no_duplicate_output(self):
        """Test that Python doesn't produce duplicate output with user's main"""
        code = """
class Solution:
    def hello_world(self):
        return "Hello, World!"

if __name__ == "__main__":
    print("Hello, World!!!!")
"""
        wrapper = generate_test_wrapper(code, "hello_world", [], is_solution_class=True)
        
        # Count how many print statements execute
        # User's print should be removed, only test's result print should remain
        assert "Hello, World!!!!" not in wrapper
        assert "result = solution.hello_world()" in wrapper
    
    def test_java_no_duplicate_output(self):
        """Test that Java doesn't produce duplicate output with user's main"""
        code = """
class Solution {
    public String helloWorld() {
        return "Hello, World";
    }
    
    public static void main(String[] args) {
        System.out.println("Hello, World!!!!");
    }
}
"""
        wrapper = generate_java_test_wrapper(code, "helloWorld", [], "String")
        
        # User's print should be removed
        assert "Hello, World!!!!" not in wrapper
        assert "result = solution.helloWorld()" in wrapper
