"""
Test validators for Python and Java code.
"""

from .python_test_validator import (
    extract_function_name,
    extract_solution_method_name,
    parse_test_input,
    generate_test_wrapper,
    create_test_code
)

from .java_test_validator import (
    extract_java_method_name,
    extract_java_method_return_type,
    parse_java_test_input,
    generate_java_test_wrapper,
    create_java_test_code
)

__all__ = [
    # Python validators
    'extract_function_name',
    'extract_solution_method_name',
    'parse_test_input',
    'generate_test_wrapper',
    'create_test_code',
    # Java validators
    'extract_java_method_name',
    'extract_java_method_return_type',
    'parse_java_test_input',
    'generate_java_test_wrapper',
    'create_java_test_code',
]
