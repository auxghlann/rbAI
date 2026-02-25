"""
Python test validation utilities for automatic function testing.
Extracts function names from Python code and generates test wrappers.
"""

import re
from typing import Optional, List, Tuple


def strip_user_main_block(code: str) -> str:
    """
    Remove user's main block from code when running tests.
    This prevents duplicate execution when test framework adds its own main.
    
    Args:
        code: User's Python code
        
    Returns:
        Code with main block removed
    """
    # Pattern to match: if __name__ == '__main__': and everything after it
    # Handles both single and double quotes, with varying whitespace
    main_pattern = r'\s*if\s+__name__\s*==\s*["\']__main__["\']\s*:.*'
    
    # Remove the main block (everything from if __name__ to end)
    cleaned_code = re.sub(main_pattern, '', code, flags=re.DOTALL)
    
    return cleaned_code


def extract_function_name(code: str) -> Optional[str]:
    """
    Extract the main function name from user code.
    Looks for function definitions and returns the first one found.
    
    Args:
        code: User's Python code
        
    Returns:
        Function name or None if no function found
    """
    # Match function definitions: def function_name(params):
    pattern = r'def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\('
    match = re.search(pattern, code)
    
    if match:
        return match.group(1)
    return None


def extract_solution_method_name(code: str) -> Optional[str]:
    """
    Extract the first method name from a Solution class.
    
    Args:
        code: Python code containing a Solution class
        
    Returns:
        Method name or None if no method found
    """
    # Look for methods inside Solution class, excluding __init__
    # Match: def method_name(self, ...)
    pattern = r'class\s+Solution.*?:\s*(?:.*?\n)*?\s+def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*self'
    match = re.search(pattern, code, re.DOTALL)
    
    if match:
        method_name = match.group(1)
        # Skip __init__ and other dunder methods
        if not method_name.startswith('__'):
            return method_name
    
    return None


def parse_test_input(input_str: str) -> List[str]:
    """
    Parse test input string into function arguments.
    
    Examples:
        "5, 3" -> ["5", "3"]
        "10, 20" -> ["10", "20"]
        "-5, 3" -> ["-5", "3"]
        "" -> []
        "None" -> []
        
    Args:
        input_str: Comma-separated input values
        
    Returns:
        List of argument strings
    """
    if not input_str.strip():
        return []
    
    # Handle explicit "None" as no arguments (for functions with no parameters)
    if input_str.strip().lower() == 'none':
        return []
    
    # Split by comma and strip whitespace
    args = [arg.strip() for arg in input_str.split(',')]
    return args


def generate_test_wrapper(user_code: str, function_name: str, test_args: List[str], is_solution_class: bool = False) -> str:
    """
    Generate code that wraps user code and calls the function with test arguments.
    
    Args:
        user_code: User's function definition or Solution class
        function_name: Name of the function/method to test
        test_args: List of argument values as strings
        is_solution_class: True if code contains a Solution class
        
    Returns:
        Complete Python code that executes the test
    """
    # Strip user's main block to prevent duplicate execution
    cleaned_code = strip_user_main_block(user_code)
    
    # Build function call with arguments
    args_str = ', '.join(test_args)
    
    if is_solution_class:
        # For Solution class: create instance and call method
        wrapper = f'''# User's code
{cleaned_code}

# Automated test execution
if __name__ == '__main__':
    try:
        solution = Solution()
        result = solution.{function_name}({args_str})
        # Only print non-None results to avoid "None" in output
        if result is not None:
            print(result)
    except Exception as e:
        print(f"Error: {{e}}", file=__import__('sys').stderr)
        raise
'''
    else:
        # For standalone function: call directly
        wrapper = f'''# User's code
{cleaned_code}

# Automated test execution
if __name__ == '__main__':
    try:
        result = {function_name}({args_str})
        # Only print non-None results to avoid "None" in output
        if result is not None:
            print(result)
    except Exception as e:
        print(f"Error: {{e}}", file=__import__('sys').stderr)
        raise
'''
    
    return wrapper


def create_test_code(user_code: str, test_input: str) -> Tuple[str, Optional[str]]:
    """
    Create executable test code from user code and test input.
    
    Args:
        user_code: User's Python code with function definition or Solution class
        test_input: Test case input (e.g., "5, 3")
        
    Returns:
        Tuple of (executable_code, error_message)
        If error_message is not None, code generation failed
    """
    # Check if code has Solution class pattern
    has_solution_class = bool(re.search(r'class\s+Solution\s*[:\(]', user_code, re.IGNORECASE))
    
    if has_solution_class:
        # Extract method name from Solution class
        method_name = extract_solution_method_name(user_code)
        
        if not method_name:
            return "", "No method found in Solution class"
        
        # Parse test input into arguments
        test_args = parse_test_input(test_input)
        
        # Generate wrapper code for Solution class
        test_code = generate_test_wrapper(user_code, method_name, test_args, is_solution_class=True)
        
        return test_code, None
    else:
        # Extract standalone function name
        func_name = extract_function_name(user_code)
        
        if not func_name:
            return "", "No function definition found in code"
        
        # Parse test input into arguments
        test_args = parse_test_input(test_input)
        
        # Generate wrapper code for standalone function
        test_code = generate_test_wrapper(user_code, func_name, test_args, is_solution_class=False)
        
        return test_code, None
