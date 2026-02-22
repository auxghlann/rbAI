"""
Integration tests for AI-powered activity generation.
Tests activity generation for multiple programming languages.
"""

import pytest
from app.services.ai_orchestrator.activity_generator import ActivityGenerator


class TestPythonActivityGeneration:
    """Integration tests for Python activity generation"""
    
    @pytest.mark.asyncio
    async def test_generate_simple_activity(self):
        """Test generating a simple Python activity"""
        generator = ActivityGenerator()
        prompt = "Create a simple activity about adding two numbers"
        
        activity = await generator.generate_activity(prompt, language="python")
        
        assert activity is not None
        assert activity.language == "python"
        assert activity.title
        assert activity.description
        assert activity.starterCode
        assert activity.problemStatement
        assert len(activity.testCases) > 0
        # Verify test case structure
        for tc in activity.testCases:
            assert "input" in tc or "expectedOutput" in tc
    
    @pytest.mark.asyncio
    async def test_activity_includes_hints(self):
        """Test that generated activity includes hints"""
        generator = ActivityGenerator()
        prompt = "Create a Python activity about factorial with hints"
        
        activity = await generator.generate_activity(prompt, language="python")
        
        assert activity.hints is not None
        assert len(activity.hints) > 0
    
    @pytest.mark.asyncio
    async def test_starter_code_is_valid_python(self):
        """Test that generated starter code is syntactically valid Python"""
        generator = ActivityGenerator()
        prompt = "Create a beginner Python activity about loops"
        
        activity = await generator.generate_activity(prompt, language="python")
        
        # Basic validation - should not raise SyntaxError
        try:
            compile(activity.starterCode, '<string>', 'exec')
        except SyntaxError:
            pytest.fail(f"Generated invalid Python syntax: {activity.starterCode}")


class TestJavaActivityGeneration:
    """Integration tests for Java activity generation"""
    
    @pytest.mark.asyncio
    async def test_generate_simple_activity(self):
        """Test generating a simple Java activity"""
        generator = ActivityGenerator()
        prompt = "Create a simple activity about adding two numbers"
        
        activity = await generator.generate_activity(prompt, language="java")
        
        assert activity is not None
        assert activity.language == "java"
        assert activity.title
        assert activity.description
        assert activity.starterCode
        assert activity.problemStatement
        assert len(activity.testCases) > 0
    
    @pytest.mark.asyncio
    async def test_java_starter_code_structure(self):
        """Test that Java starter code has proper structure"""
        generator = ActivityGenerator()
        prompt = "Create a beginner Java activity"
        
        activity = await generator.generate_activity(prompt, language="java")
        
        # Check for basic Java structure elements
        code = activity.starterCode
        assert "import java.util.Scanner" in code or "Scanner" in code
        # Should have method or class structure hints
        assert "{" in code and "}" in code


class TestMultiLanguageActivityGeneration:
    """Tests for cross-language activity generation"""
    
    @pytest.mark.asyncio
    @pytest.mark.parametrize("language", ["python", "java"])
    async def test_generate_for_each_language(self, language):
        """Test that activities can be generated for each supported language"""
        generator = ActivityGenerator()
        prompt = f"Create a {language} activity about variables"
        
        activity = await generator.generate_activity(prompt, language=language)
        
        assert activity.language == language
        assert len(activity.testCases) >= 1
    
    @pytest.mark.asyncio
    async def test_language_detection_from_prompt(self):
        """Test that language can be auto-detected from prompt"""
        generator = ActivityGenerator()
        
        # Prompt mentioning Java should generate Java activity
        activity = await generator.generate_activity("Create a Java activity about loops")
        
        assert activity.language == "java"
    
    @pytest.mark.asyncio
    async def test_same_concept_different_languages(self):
        """Test generating same concept in different languages"""
        generator = ActivityGenerator()
        concept = "adding two numbers"
        
        python_activity = await generator.generate_activity(
            f"Create a {concept} activity", 
            language="python"
        )
        java_activity = await generator.generate_activity(
            f"Create a {concept} activity", 
            language="java"
        )
        
        # Both should have similar test cases (same inputs/outputs)
        assert len(python_activity.testCases) > 0
        assert len(java_activity.testCases) > 0
        # Concept should be in problem statement for both
        assert "add" in python_activity.problemStatement.lower()
        assert "add" in java_activity.problemStatement.lower()
