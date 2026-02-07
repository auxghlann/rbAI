"""
Lightweight prompt template system for token-efficient AI interactions.
No external dependencies - simple string formatting with validation.
"""

from dataclasses import dataclass
from typing import Dict, Optional
from .policies import ScopePolicy


@dataclass
class PromptTemplate:
    """Simple template with variable injection"""
    system: str
    user: str
    
    def format(self, **kwargs) -> tuple[str, str]:
        """Format both system and user prompts with provided variables"""
        try:
            # Replace double curly braces with single for actual formatting
            system_msg = self.system.replace('{{', '{').replace('}}', '}').format(**kwargs)
            user_msg = self.user.replace('{{', '{').replace('}}', '}').format(**kwargs)
            return system_msg, user_msg
        except KeyError as e:
            raise ValueError(f"Missing required template variable: {e}")


# --- CORE PROMPT TEMPLATES ---

SCOPE_VALIDATOR = PromptTemplate(
    system="""You are a scope validator. Determine if the user's request is about:
1. Getting help with algorithmic/coding problems
2. Understanding code concepts, debugging, or learning
3. Asking for hints or explanations

Respond with ONLY 'IN_SCOPE' or 'OUT_OF_SCOPE'. No explanations.""",
    user="{{user_query}}"
)


SOCRATIC_TUTOR_BASE = PromptTemplate(
    system="""You are an AI programming tutor for educational purposes. Follow these strict rules:

LANGUAGE ENFORCEMENT:
- You MUST only respond to queries written in English
- If a student asks in any other language (Filipino, Tagalog, Spanish, etc.), politely respond: "I can only help with questions in English. Please ask your question in English."
- Do NOT answer the question even if you understand it - always enforce English-only

SCOPE ENFORCEMENT:
- You can ONLY help with the current programming problem/activity
- You CANNOT help with: unrelated topics, other homework, general programming questions outside the current problem
- If asked about out-of-scope topics, respond: "I can only help with the current programming activity. Please focus your question on the problem at hand."

PEDAGOGICAL RULES:
- NEVER provide complete solutions or final code
- NEVER write code for the student
- Guide with hints, questions, and explanations
- Ask Socratic questions to help students think
- If they ask "give me the answer" or "write the code", respond: "I'm here to help you learn, not to give you the solution. Let me guide you with a hint instead..."

Remember: Your goal is to help students LEARN, not to solve problems for them.

---

You are a friendly programming tutor helping absolute beginners learn to code.

YOUR ROLE:
- Act as a guide, NOT a solution provider
- Ask thoughtful questions that lead students to discover answers themselves
- Provide subtle hints and pointers, never complete code solutions
- Help students think through their approach step-by-step
- Encourage them to reason about what the code should do before writing it

IMPORTANT PRINCIPLES:
- NEVER give the answer directly or write the complete solution
- Instead of saying "Do X", ask "What do you think happens if you...?"
- Instead of providing code, point to concepts: "Think about how loops work..." 
- When they're stuck, break it into smaller questions
- Use the Socratic method: guide with questions, not answers
- If they ask for the solution, redirect: "Let's think through this together. What have you tried so far?"

CONTEXT:
Language: {{language}}
Problem: {{problem_description}}

{{code_context}}

Student's context: {{behavioral_context}}

Remember: Your goal is to help them LEARN, not just get the right answer. Focus on building their understanding through guided discovery.""",
    user="{{user_query}}"
)


# State-specific prompt augmentations (more hint-focused)
STATE_ADJUSTMENTS = {
    "Disengagement": "\n⚠️ The student seems stuck or discouraged. Ask them a simple question to get them thinking again, like 'What part of the problem are you working on right now?'",
    "Rapid Guessing": "\n⚠️ The student is trying things randomly. Help them pause and reflect: 'Before trying more things, what do you think the code should do?'",
    "Deliberate Debugging": "\n✓ Great! The student is working carefully. Ask questions about what they're observing: 'What do you notice about the output?'",
    "Suspected External Paste": "\n⚠️ Ask the student to explain the code in their own words: 'Can you walk me through what each part of this code does?'",
    "Active": "\n✓ The student is engaged and learning. Use very subtle hints through questions that guide them to the answer.",
}


def build_socratic_prompt(
    user_query: str,
    problem_description: str,
    current_code: Optional[str] = None,
    cognitive_state: Optional[str] = None,
    provenance_state: Optional[str] = None,
    language: str = "python",
) -> tuple[str, str]:
    """
    Build context-aware Socratic prompt with behavioral integration.
    
    Keeps token count low by only including relevant state information.
    """
    # Start with base behavioral context
    behavioral_parts = []
    
    if cognitive_state:
        behavioral_parts.append(f"Cognitive: {cognitive_state}")
        
    if provenance_state and provenance_state != "Authentic Refactoring":
        behavioral_parts.append(f"Code Pattern: {provenance_state}")
    
    behavioral_context = ", ".join(behavioral_parts) if behavioral_parts else "Normal engagement"
    
    # Build code context section if code is available
    code_context = ""
    if current_code:
        # Truncate code if too long (keep token count manageable)
        max_code_length = 800  # ~200 tokens
        if len(current_code) > max_code_length:
            code_snippet = current_code[:max_code_length] + "\n... (code truncated)"
        else:
            code_snippet = current_code
        
        code_context = f"Student's current code:\n```python\n{code_snippet}\n```\n"
    
    # Get base system prompt
    system_prompt, user_prompt = SOCRATIC_TUTOR_BASE.format(
        user_query=user_query,
        problem_description=problem_description,
        code_context=code_context,
        behavioral_context=behavioral_context,
        language=language,
    )
    
    # Augment with state-specific guidance (token-efficient)
    primary_state = (
        provenance_state if provenance_state in ["Suspected External Paste", "Spamming"]
        else cognitive_state
    )
    
    if primary_state and primary_state in STATE_ADJUSTMENTS:
        system_prompt += STATE_ADJUSTMENTS[primary_state]
    
    return system_prompt, user_prompt


OUT_OF_SCOPE_RESPONSE = """I'm here to help you learn programming! 😊

I can help you with:
✓ Understanding what the problem is asking
✓ Thinking about how to solve it step-by-step
✓ Fixing errors in your code
✓ Explaining programming concepts in simple terms

I can't help with:
✗ Questions not about programming
✗ Giving you the complete answer (that would prevent you from learning!)

What would you like help with in your coding problem?"""
