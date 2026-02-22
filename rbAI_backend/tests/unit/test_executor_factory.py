"""
Unit tests for executor factory pattern.
Tests language executor selection and instantiation.
"""

import pytest
from unittest.mock import patch
from app.services.execution import get_executor, EXECUTOR_MAP
from app.services.execution.executors.python_executor import PythonExecutor
from app.services.execution.executors.java_executor import JavaExecutor


class TestExecutorFactory:
    """Test suite for executor factory pattern"""
    
    def test_executor_map_contains_python(self):
        """Test that executor map contains Python"""
        assert 'python' in EXECUTOR_MAP
        assert EXECUTOR_MAP['python'] == PythonExecutor
    
    def test_executor_map_contains_java(self):
        """Test that executor map contains Java"""
        assert 'java' in EXECUTOR_MAP
        assert EXECUTOR_MAP['java'] == JavaExecutor
    
    @patch('app.services.execution.executors.python_executor.docker.from_env')
    def test_get_executor_python(self, mock_docker):
        """Test getting Python executor"""
        mock_client = mock_docker.return_value
        mock_client.ping.return_value = True
        
        executor = get_executor('python')
        
        assert isinstance(executor, PythonExecutor)
        assert executor.image_name == "python:3.10-alpine"
    
    @patch('app.services.execution.executors.java_executor.docker.from_env')
    def test_get_executor_java(self, mock_docker):
        """Test getting Java executor"""
        mock_client = mock_docker.return_value
        mock_client.ping.return_value = True
        
        executor = get_executor('java')
        
        assert isinstance(executor, JavaExecutor)
        assert executor.image_name == "eclipse-temurin:17-alpine"
    
    @patch('app.services.execution.executors.python_executor.docker.from_env')
    def test_get_executor_case_insensitive(self, mock_docker):
        """Test that language selection is case-insensitive"""
        mock_client = mock_docker.return_value
        mock_client.ping.return_value = True
        
        executor_upper = get_executor('PYTHON')
        executor_mixed = get_executor('Python')
        executor_lower = get_executor('python')
        
        assert all(isinstance(e, PythonExecutor) for e in [executor_upper, executor_mixed, executor_lower])
    
    def test_get_executor_unsupported_language(self):
        """Test that unsupported language raises ValueError"""
        with pytest.raises(ValueError) as exc_info:
            get_executor('ruby')
        
        assert "Unsupported language" in str(exc_info.value)
        assert "ruby" in str(exc_info.value)
        assert "python" in str(exc_info.value).lower()
        assert "java" in str(exc_info.value).lower()
    
    def test_get_executor_empty_string(self):
        """Test that empty string raises ValueError"""
        with pytest.raises(ValueError) as exc_info:
            get_executor('')
        
        assert "Unsupported language" in str(exc_info.value)
    
    @patch('app.services.execution.executors.python_executor.docker.from_env')
    def test_get_executor_returns_new_instance(self, mock_docker):
        """Test that get_executor returns new instances each time"""
        mock_client = mock_docker.return_value
        mock_client.ping.return_value = True
        
        executor1 = get_executor('python')
        executor2 = get_executor('python')
        
        # Should be different instances
        assert executor1 is not executor2
        # But same type
        assert type(executor1) == type(executor2)


class TestMultiLanguageSupport:
    """Test multi-language support features"""
    
    def test_all_executors_have_required_methods(self):
        """Test that all executor classes implement required methods"""
        required_methods = [
            'execute_code',
            'execute_with_tests',
            '_prepare_code',
            'health_check'
        ]
        
        for language, executor_class in EXECUTOR_MAP.items():
            for method in required_methods:
                assert hasattr(executor_class, method), \
                    f"{executor_class.__name__} missing required method: {method}"
    
    @patch('app.services.execution.executors.python_executor.docker.from_env')
    @patch('app.services.execution.executors.java_executor.docker.from_env')
    def test_can_instantiate_all_executors(self, mock_java_docker, mock_python_docker):
        """Test that all registered executors can be instantiated"""
        mock_java_docker.return_value.ping.return_value = True
        mock_python_docker.return_value.ping.return_value = True
        
        for language in EXECUTOR_MAP.keys():
            try:
                executor = get_executor(language)
                assert executor is not None
            except Exception as e:
                pytest.fail(f"Failed to instantiate {language} executor: {e}")
