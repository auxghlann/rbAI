"""
Test smart main detection - allows users to write their own main for testing.
"""

import pytest
from unittest.mock import Mock, patch
from app.services.execution.executors.python_executor import PythonExecutor
from app.services.execution.executors.java_executor import JavaExecutor


class TestUserMainDetection:
    """Test detection and usage of user-defined main functions"""
    
    @pytest.fixture
    def python_executor(self):
        with patch('app.services.execution.executors.python_executor.docker.from_env'):
            executor = PythonExecutor()
            executor.client = Mock()
            return executor
    
    @pytest.fixture
    def java_executor(self):
        with patch('app.services.execution.executors.java_executor.docker.from_env'):
            executor = JavaExecutor()
            executor.client = Mock()
            return executor
    
    # Python Tests
    
    def test_python_has_user_main_detects_main_block(self, python_executor):
        """Test Python detects if __name__ == '__main__' block"""
        code_with_main = """
class Solution:
    def add(self, a, b):
        return a + b

if __name__ == '__main__':
    s = Solution()
    print(s.add(5, 3))
"""
        assert python_executor._has_user_main(code_with_main) is True
    
    def test_python_has_user_main_no_main_block(self, python_executor):
        """Test Python returns False when no main block"""
        code_without_main = """
class Solution:
    def add(self, a, b):
        return a + b
"""
        assert python_executor._has_user_main(code_without_main) is False
    
    def test_python_uses_user_main_when_present(self, python_executor):
        """Test Python uses user's main block when present"""
        code_with_main = """
class Solution:
    def add(self, a, b):
        return a + b

if __name__ == '__main__':
    s = Solution()
    print(s.add(10, 20))
"""
        wrapped = python_executor._prepare_code(code_with_main)
        
        # Should include user's code directly
        assert "if __name__ == '__main__':" in wrapped
        assert "s.add(10, 20)" in wrapped
        # Should NOT auto-call methods
        assert "solution.add()" not in wrapped
    
    def test_python_auto_calls_without_main(self, python_executor):
        """Test Python auto-calls method when no user main"""
        code_without_main = """
class Solution:
    def hello_world(self):
        return "Hello, World!"
"""
        wrapped = python_executor._prepare_code(code_without_main)
        
        # Should auto-call the method
        assert "solution.hello_world()" in wrapped
        # Should wrap code, not include user's main (error message might contain example)
        assert "result = solution.hello_world()" in wrapped
    
    # Java Tests
    
    def test_java_has_user_main_detects_main_method(self, java_executor):
        """Test Java detects main method"""
        code_with_main = """
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
        assert java_executor._has_user_main(code_with_main) is True
    
    def test_java_has_user_main_no_main_method(self, java_executor):
        """Test Java returns False when no main method"""
        code_without_main = """
class Solution {
    public String helloWorld() {
        return "Hello, World";
    }
}
"""
        assert java_executor._has_user_main(code_without_main) is False
    
    def test_java_uses_user_main_when_present(self, java_executor):
        """Test Java uses user's main when present"""
        code_with_main = """
class Solution {
    public int add(int a, int b) {
        return a + b;
    }
    
    public static void main(String[] args) {
        Solution s = new Solution();
        System.out.println(s.add(5, 3));
    }
}
"""
        wrapped = java_executor._prepare_code(code_with_main)
        
        # Should call user's main
        assert "Solution.main(args);" in wrapped
        # Should NOT auto-call methods
        assert "solution.add()" not in wrapped
    
    def test_java_auto_calls_without_main(self, java_executor):
        """Test Java auto-calls method when no user main"""
        code_without_main = """
class Solution {
    public String helloWorld() {
        return "Hello, World";
    }
}
"""
        wrapped = java_executor._prepare_code(code_without_main)
        
        # Should auto-call the method
        assert "solution.helloWorld()" in wrapped
        # Should NOT call Solution.main
        assert "Solution.main" not in wrapped
    
    def test_java_main_variations(self, java_executor):
        """Test Java detects various main method formats"""
        # Standard format
        code1 = "public static void main(String[] args) {"
        assert java_executor._has_user_main(code1) is True
        
        # With spaces
        code2 = "public  static  void  main( String[]  args ) {"
        assert java_executor._has_user_main(code2) is True
        
        # Different parameter name
        code3 = "public static void main(String[] params) {"
        assert java_executor._has_user_main(code3) is True
    
    def test_python_main_variations(self, python_executor):
        """Test Python detects various main block formats"""
        # Double quotes
        code1 = 'if __name__ == "__main__":'
        assert python_executor._has_user_main(code1) is True
        
        # Single quotes
        code2 = "if __name__ == '__main__':"
        assert python_executor._has_user_main(code2) is True
        
        # Extra spaces
        code3 = 'if   __name__   ==   "__main__"  :'
        assert python_executor._has_user_main(code3) is True


class TestUserMainWithHelpfulMessages:
    """Test that helpful messages are shown when methods need parameters"""
    
    @pytest.fixture
    def python_executor(self):
        with patch('app.services.execution.executors.python_executor.docker.from_env'):
            executor = PythonExecutor()
            executor.client = Mock()
            return executor
    
    @pytest.fixture
    def java_executor(self):
        with patch('app.services.execution.executors.java_executor.docker.from_env'):
            executor = JavaExecutor()
            executor.client = Mock()
            return executor
    
    def test_python_shows_helpful_message_for_parameterized_methods(self, python_executor):
        """Test Python shows tip about writing own main for methods with parameters"""
        code = """
class Solution:
    def add(self, a, b):
        return a + b
"""
        wrapped = python_executor._prepare_code(code)
        
        # Should include helpful tip
        assert "Tip: You can write your own main block" in wrapped
        assert "if __name__ == '__main__':" in wrapped
        assert "s.add(5, 3)" in wrapped
    
    def test_java_shows_helpful_message_for_parameterized_methods(self, java_executor):
        """Test Java shows tip about writing own main for methods with parameters"""
        code = """
class Solution {
    public int add(int a, int b) {
        return a + b;
    }
}
"""
        wrapped = java_executor._prepare_code(code)
        
        # Should include helpful tip
        assert "Tip: You can write your own main" in wrapped or "Optional: Add your own main" in wrapped
        assert "public static void main" in wrapped
