"""
Test chat memory and beginner-friendly prompts
"""

import pytest
from app.services.ai_orchestrator.firewall import ChatContext, PedagogicalFirewall
from app.services.ai_orchestrator.prompts import build_socratic_prompt


def test_chat_context_with_history():
    """Test that ChatContext accepts and stores chat history"""
    history = [
        {"role": "user", "content": "What is a variable?"},
        {"role": "assistant", "content": "A variable is like a box that stores information..."}
    ]
    
    context = ChatContext(
        user_query="Can you give me an example?",
        problem_description="Learning Python basics",
        chat_history=history
    )
    
    assert context.chat_history == history
    assert len(context.chat_history) == 2


def test_chat_context_empty_history():
    """Test that ChatContext works without history"""
    context = ChatContext(
        user_query="How do I print in Python?",
        problem_description="Python basics"
    )
    
    assert context.chat_history == []


def test_socratic_prompt_beginner_friendly():
    """Test that the prompt is designed for absolute beginners"""
    system_prompt, user_prompt = build_socratic_prompt(
        user_query="How do I start?",
        problem_description="Write a program to add two numbers",
        cognitive_state="ACTIVE"
    )
    
    # Check that the prompt emphasizes beginner-friendly language
    assert "absolute beginners" in system_prompt.lower() or "beginner" in system_prompt.lower()
    assert "guide" in system_prompt.lower() or "help" in system_prompt.lower()
    
    # Check it still maintains pedagogical principles
    assert "never give" in system_prompt.lower() or "not a solution provider" in system_prompt.lower()


def test_socratic_prompt_with_behavioral_state():
    """Test that behavioral states are reflected in prompts"""
    system_prompt, _ = build_socratic_prompt(
        user_query="I'm stuck",
        problem_description="Basic Python program",
        cognitive_state="DISENGAGEMENT"
    )
    
    # Should have context about the student's state
    assert "disengagement" in system_prompt.lower() or "cognitive" in system_prompt.lower()


@pytest.mark.asyncio
async def test_firewall_with_chat_history(monkeypatch):
    """Test that firewall passes chat history to LLM"""
    # Mock the LLM client
    class MockLLM:
        def __init__(self):
            self.model = "mock-model"
            self.last_chat_history = None
        
        async def complete(self, system_prompt, user_prompt, chat_history=None, temperature=0.7):
            self.last_chat_history = chat_history
            return "Here's a gentle hint to guide you..."
    
    mock_llm = MockLLM()
    firewall = PedagogicalFirewall(llm_client=mock_llm)
    
    history = [
        {"role": "user", "content": "What is Python?"},
        {"role": "assistant", "content": "Python is a programming language..."}
    ]
    
    context = ChatContext(
        user_query="How do I use it?",
        problem_description="Learning Python",
        chat_history=history
    )
    
    response = await firewall.process_request(context)
    
    # Verify the LLM received the chat history
    assert mock_llm.last_chat_history == history
    assert response.is_allowed
    assert len(response.message) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
