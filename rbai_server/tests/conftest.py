"""
Pytest configuration and shared fixtures for rbAI backend tests.
"""

import pytest
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


@pytest.fixture
def sample_python_code():
    """Sample Python code for testing"""
    return "print('Hello, World!')"


@pytest.fixture
def sample_java_code():
    """Sample Java code snippet for testing"""
    return """
System.out.println("Hello, World!");
"""


@pytest.fixture
def sample_java_method():
    """Sample Java method definition for testing"""
    return """
public static int add(int a, int b) {
    return a + b;
}
"""


@pytest.fixture
def sample_java_class():
    """Sample complete Java class for testing"""
    return """
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Main class");
    }
}
"""


@pytest.fixture
def sample_test_cases():
    """Sample test cases for code validation"""
    return [
        {
            "input": "5\n3",
            "expected_output": "8"
        },
        {
            "input": "10\n20",
            "expected_output": "30"
        }
    ]
