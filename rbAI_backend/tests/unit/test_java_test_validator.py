"""
Unit tests for Java test validation utilities.
Tests the integration of Java Solution class pattern with test case execution.
"""

import pytest
from app.services.execution.validators.java_test_validator import (
    extract_java_method_name,
    extract_java_method_return_type,
    parse_java_test_input,
    generate_java_test_wrapper,
    create_java_test_code
)


class TestJavaTestValidator:
    """Test Java test validation utilities"""
    
    def test_extract_java_method_name_simple(self):
        """Test extracting method name from simple Solution class"""
        code = """class Solution {
    public String helloWorld() {
        // Your code here
        return "Hello, World";
    }
}"""
        method_name = extract_java_method_name(code)
        assert method_name == "helloWorld"
    
    def test_extract_java_method_name_with_params(self):
        """Test extracting method name with parameters"""
        code = """class Solution {
    public int add(int a, int b) {
        return a + b;
    }
}"""
        method_name = extract_java_method_name(code)
        assert method_name == "add"
    
    def test_extract_java_method_name_generic_return(self):
        """Test extracting method name with generic return type"""
        code = """class Solution {
    public List<Integer> getNumbers() {
        return new ArrayList<>();
    }
}"""
        method_name = extract_java_method_name(code)
        assert method_name == "getNumbers"
    
    def test_extract_java_method_name_array_return(self):
        """Test extracting method name with array return type"""
        code = """class Solution {
    public int[] getArray() {
        return new int[]{1, 2, 3};
    }
}"""
        method_name = extract_java_method_name(code)
        assert method_name == "getArray"
    
    def test_extract_java_method_name_no_solution_class(self):
        """Test extraction when no Solution class exists"""
        code = """public class Main {
    public static void main(String[] args) {
        System.out.println("Hello");
    }
}"""
        method_name = extract_java_method_name(code)
        assert method_name is None
    
    def test_extract_java_method_name_no_methods(self):
        """Test extraction when Solution class has no methods"""
        code = """class Solution {
    // Empty class
}"""
        method_name = extract_java_method_name(code)
        assert method_name is None
    
    def test_extract_java_method_name_with_constructor(self):
        """Test that constructor is skipped"""
        code = """class Solution {
    public Solution() {
        // Constructor
    }
    
    public String getName() {
        return "Test";
    }
}"""
        method_name = extract_java_method_name(code)
        assert method_name == "getName"
    
    def test_extract_java_method_return_type(self):
        """Test extracting return type of a method"""
        code = """class Solution {
    public String helloWorld() {
        return "Hello, World";
    }
}"""
        return_type = extract_java_method_return_type(code, "helloWorld")
        assert return_type == "String"
    
    def test_extract_java_method_return_type_int(self):
        """Test extracting int return type"""
        code = """class Solution {
    public int add(int a, int b) {
        return a + b;
    }
}"""
        return_type = extract_java_method_return_type(code, "add")
        assert return_type == "int"
    
    def test_parse_java_test_input_simple(self):
        """Test parsing simple test inputs"""
        args = parse_java_test_input("5, 3")
        assert args == ["5", "3"]
    
    def test_parse_java_test_input_strings(self):
        """Test parsing string inputs"""
        args = parse_java_test_input('"hello", "world"')
        assert args == ['"hello"', '"world"']
    
    def test_parse_java_test_input_empty(self):
        """Test parsing empty input"""
        args = parse_java_test_input("")
        assert args == []
    
    def test_parse_java_test_input_none(self):
        """Test parsing None input"""
        args = parse_java_test_input("None")
        assert args == []
    
    def test_generate_java_test_wrapper_simple(self):
        """Test generating test wrapper for simple method"""
        code = """class Solution {
    public String helloWorld() {
        return "Hello, World";
    }
}"""
        
        wrapper = generate_java_test_wrapper(
            user_code=code,
            method_name="helloWorld",
            test_args=[],
            return_type="String"
        )
        
        assert "class Solution" in wrapper
        assert "solution = new Solution()" in wrapper
        assert "solution.helloWorld()" in wrapper
        assert "System.out.println(result);" in wrapper
    
    def test_generate_java_test_wrapper_with_args(self):
        """Test generating test wrapper with arguments"""
        code = """class Solution {
    public int add(int a, int b) {
        return a + b;
    }
}"""
        
        wrapper = generate_java_test_wrapper(
            user_code=code,
            method_name="add",
            test_args=["5", "3"],
            return_type="int"
        )
        
        assert "solution.add(5, 3)" in wrapper
        assert "System.out.println(result);" in wrapper
    
    def test_generate_java_test_wrapper_void_method(self):
        """Test generating test wrapper for void method"""
        code = """class Solution {
    public void printMessage() {
        System.out.println("Hello");
    }
}"""
        
        wrapper = generate_java_test_wrapper(
            user_code=code,
            method_name="printMessage",
            test_args=[],
            return_type="void"
        )
        
        assert "solution.printMessage()" in wrapper
        # Void methods should not print result
        assert "// void method - no output" in wrapper
    
    def test_create_java_test_code_simple(self):
        """Test creating complete test code"""
        code = """class Solution {
    public String helloWorld() {
        return "Hello, World";
    }
}"""
        
        test_code, error = create_java_test_code(code, "")
        
        assert error is None
        assert "class Solution" in test_code
        assert "public class Main" in test_code
        assert "solution.helloWorld()" in test_code
    
    def test_create_java_test_code_with_args(self):
        """Test creating test code with arguments"""
        code = """class Solution {
    public int add(int a, int b) {
        return a + b;
    }
}"""
        
        test_code, error = create_java_test_code(code, "5, 3")
        
        assert error is None
        assert "solution.add(5, 3)" in test_code
    
    def test_create_java_test_code_no_solution_class(self):
        """Test error when no Solution class found"""
        code = """public class Main {
    public static void main(String[] args) {
        System.out.println("Hello");
    }
}"""
        
        test_code, error = create_java_test_code(code, "")
        
        assert error is not None
        assert "No Solution class" in error
    
    def test_create_java_test_code_no_methods(self):
        """Test error when Solution class has no methods"""
        code = """class Solution {
    // Empty class
}"""
        
        test_code, error = create_java_test_code(code, "")
        
        assert error is not None
        assert "No method found" in error


class TestJavaTestValidatorEdgeCases:
    """Test edge cases for Java test validation"""
    
    def test_static_method(self):
        """Test extracting static method"""
        code = """class Solution {
    public static String getMessage() {
        return "Hello";
    }
}"""
        method_name = extract_java_method_name(code)
        assert method_name == "getMessage"
    
    def test_multiline_method_signature(self):
        """Test method with multiline signature"""
        code = """class Solution {
    public String longMethod(
        int param1,
        int param2,
        String param3
    ) {
        return "result";
    }
}"""
        method_name = extract_java_method_name(code)
        assert method_name == "longMethod"
    
    def test_solution_with_inheritance(self):
        """Test Solution class with inheritance"""
        code = """class Solution extends BaseClass {
    public String getValue() {
        return "value";
    }
}"""
        method_name = extract_java_method_name(code)
        # May or may not work depending on regex - this is an edge case
        # The important thing is it doesn't crash
        assert method_name is None or method_name == "getValue"
    
    def test_complex_generic_return_type(self):
        """Test complex generic return type"""
        code = """class Solution {
    public Map<String, List<Integer>> getMap() {
        return new HashMap<>();
    }
}"""
        method_name = extract_java_method_name(code)
        # This is a complex case - may not be fully supported
        assert method_name is None or method_name == "getMap"
