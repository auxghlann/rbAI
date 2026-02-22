"""
Java test validation utilities for automatic function testing.
Extracts method names from Java Solution class and generates test wrappers.
"""

import re
from typing import Optional, List, Tuple


def strip_user_main_method(code: str) -> str:
    """
    Remove user's main method from Java code when running tests.
    This prevents duplicate execution when test framework adds its own main.
    
    Args:
        code: User's Java code
        
    Returns:
        Code with main method removed
    """
    # Pattern to match: public static void main(String[] args) { ... }
    # This needs to handle nested braces correctly
    
    # First, find the start of the main method
    main_start_pattern = r'public\s+static\s+void\s+main\s*\(\s*String\s*\[\s*\]\s+\w+\s*\)\s*\{'
    match = re.search(main_start_pattern, code)
    
    if not match:
        return code  # No main method found, return original code
    
    # Find the matching closing brace
    start_pos = match.start()
    brace_start = match.end() - 1  # Position of opening brace
    
    # Count braces to find the matching closing brace
    brace_count = 1
    pos = brace_start + 1
    
    while pos < len(code) and brace_count > 0:
        if code[pos] == '{':
            brace_count += 1
        elif code[pos] == '}':
            brace_count -= 1
        pos += 1
    
    if brace_count == 0:
        # Found matching brace, remove the entire method
        cleaned_code = code[:start_pos] + code[pos:]
        return cleaned_code
    
    return code  # Couldn't find matching brace, return original


def extract_java_method_name(code: str) -> Optional[str]:
    """
    Extract the first public method name from a Java Solution class.
    
    Args:
        code: Java code containing a Solution class
        
    Returns:
        Method name or None if no method found
    """
    # Look for public methods inside Solution class, excluding constructors
    # Match: public ReturnType methodName(params)
    # This pattern handles:
    # - Different return types (int, String, List<String>, etc.)
    # - Generic types (List<Integer>, Map<K,V>, etc.)
    # - Array return types (int[], String[], etc.)
    
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


def extract_java_method_return_type(code: str, method_name: str) -> Optional[str]:
    """
    Extract the return type of a specific method from Java Solution class.
    
    Args:
        code: Java code containing a Solution class
        method_name: Name of the method to find
        
    Returns:
        Return type or None if not found
    """
    # Pattern to match the method signature
    pattern = rf'public\s+(?:static\s+)?(\w+(?:<[^>]+>)?(?:\[\])?)\s+{method_name}\s*\('
    match = re.search(pattern, code)
    
    if match:
        return match.group(1)
    
    return None


def parse_java_test_input(input_str: str) -> List[str]:
    """
    Parse test input string into Java method arguments.
    
    Examples:
        "5, 3" -> ["5", "3"]
        '"hello", "world"' -> ['"hello"', '"world"']
        "" -> []
        "None" -> []
        
    Args:
        input_str: Comma-separated input values
        
    Returns:
        List of argument strings
    """
    if not input_str.strip():
        return []
    
    # Handle explicit "None" as no arguments
    if input_str.strip().lower() == 'none':
        return []
    
    # Split by comma and strip whitespace
    args = [arg.strip() for arg in input_str.split(',')]
    return args


def generate_java_test_wrapper(
    user_code: str,
    method_name: str,
    test_args: List[str],
    return_type: str = "String"
) -> str:
    """
    Generate Java code that wraps user Solution class and calls the method with test arguments.
    
    Args:
        user_code: User's Solution class code
        method_name: Name of the method to test
        test_args: List of argument values as strings
        return_type: Return type of the method
        
    Returns:
        Complete Java code that executes the test
    """
    # Strip user's main method to prevent duplicate execution
    cleaned_code = strip_user_main_method(user_code)
    
    # Build method call with arguments
    args_str = ', '.join(test_args) if test_args else ''
    
    # Determine if we should print the result
    # For void methods, don't print anything
    should_print = return_type.lower() != 'void'
    
    # Generate the wrapper code
    wrapper = f'''import java.io.*;
import java.util.*;

// User's code
{cleaned_code}

public class Main {{
    public static void main(String[] args) {{
        try {{
            // Create Solution instance
            Solution solution = new Solution();
            
            // Call the method with test inputs
            {return_type} result = solution.{method_name}({args_str});
            
            // Print result (only for non-void methods)
            {'System.out.println(result);' if should_print else '// void method - no output'}
            
        }} catch (Exception e) {{
            System.err.println("Runtime Error: " + e.getClass().getSimpleName() + ": " + e.getMessage());
            e.printStackTrace(System.err);
            System.exit(1);
        }}
    }}
}}
'''
    
    return wrapper


def create_java_test_code(user_code: str, test_input: str) -> Tuple[str, Optional[str]]:
    """
    Create executable Java test code from user code and test input.
    
    Args:
        user_code: User's Java code with Solution class
        test_input: Test case input (e.g., "5, 3")
        
    Returns:
        Tuple of (executable_code, error_message)
        If error_message is not None, code generation failed
    """
    # Check if code has Solution class pattern
    has_solution_class = bool(re.search(r'class\s+Solution\s*\{', user_code))
    
    if not has_solution_class:
        return "", "No Solution class found in code. Please define a class Solution with your methods."
    
    # Extract method name from Solution class
    method_name = extract_java_method_name(user_code)
    
    if not method_name:
        return "", "No method found in Solution class. Please add a public method."
    
    # Extract return type
    return_type = extract_java_method_return_type(user_code, method_name)
    if not return_type:
        return_type = "String"  # Default fallback
    
    # Parse test input into arguments
    test_args = parse_java_test_input(test_input)
    
    # Generate wrapper code for Solution class
    test_code = generate_java_test_wrapper(user_code, method_name, test_args, return_type)
    
    return test_code, None
