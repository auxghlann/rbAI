"""
AI Activity Generation Service
Uses LLM function calling to generate structured coding activities
"""

import json
import logging
import re
from typing import List, Optional
from pydantic import BaseModel

from .llm_client_groq import LLMClientGroq

logger = logging.getLogger(__name__)


# Data Models
class TestCaseSchema(BaseModel):
    name: str
    input: str
    expectedOutput: str
    isHidden: bool = False


class GeneratedActivity(BaseModel):
    title: str
    description: str
    problemStatement: str
    language: str
    starterCode: str
    testCases: List[TestCaseSchema]
    hints: Optional[List[str]] = None


def detect_language_from_prompt(prompt: str) -> Optional[str]:
    """
    Detect programming language mentioned in the user's prompt.
    
    Args:
        prompt: User's activity generation prompt
        
    Returns:
        Detected language ('python', 'java', etc.) or None if not found
    """
    prompt_lower = prompt.lower()
    
    # Language patterns - check for explicit mentions
    language_patterns = {
        'python': r'\b(python|py)\b',
        'java': r'\b(java)\b(?!\s*script)',  # Exclude javascript
        # 'javascript': r'\b(javascript|js)\b',
        # 'cpp': r'\b(c\+\+|cpp)\b',
        # 'c': r'\b(c)\b(?!\+\+)',  # Match 'c' but not 'c++'
    }
    
    # Check each pattern
    for language, pattern in language_patterns.items():
        if re.search(pattern, prompt_lower):
            # Normalize name
            if language == 'cpp':
                return 'c++'
            return language
    
    return None


# Function/Tool Definition for LLM
ACTIVITY_GENERATION_TOOL = {
    "type": "function",
    "function": {
        "name": "generate_coding_activity",
        "description": "Generate a structured coding activity with problem statement, starter code, test cases, and hints",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Concise activity title (e.g., 'Binary Search Algorithm')"
                },
                "description": {
                    "type": "string",
                    "description": "Brief one-sentence description of what students will learn"
                },
                "problemStatement": {
                    "type": "string",
                    "description": "Detailed problem statement in Markdown format. Include: problem description, examples with input/output, and requirements. Use proper markdown formatting with headers, code blocks, etc."
                },
                "language": {
                    "type": "string",
                    "description": "Programming language for this activity (python, java, javascript, etc.). Use the language mentioned in the user's prompt if specified, otherwise use the system's default.",
                    "enum": ["python", "java", "javascript", "c++", "c"]
                },
                "starterCode": {
                    "type": "string",
                    "description": "Starter code in the requested language using Solution class pattern (LeetCode style). For Python: 'class Solution:' with method signature and '# Your code here'. For Java: 'class Solution {' with method signature and '// Your code here'. DO NOT include any solution logic, variable declarations, or implementation hints. Students must write everything themselves."
                },
                "testCases": {
                    "type": "array",
                    "description": "Array of test cases to validate the solution. MUST generate at least 3 test cases. Default: 5 test cases (3 visible, 2 hidden).",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {
                                "type": "string",
                                "description": "Descriptive name for the test case"
                            },
                            "input": {
                                "type": "string",
                                "description": "Input parameters as a string (e.g., '5, 3' or '[1,2,3]')"
                            },
                            "expectedOutput": {
                                "type": "string",
                                "description": "Expected output as a string"
                            },
                            "isHidden": {
                                "type": "boolean",
                                "description": "Whether this test case should be hidden from students",
                                "default": False
                            }
                        },
                        "required": ["name", "input", "expectedOutput"]
                    },
                    "minItems": 0
                },
                "hints": {
                    "type": "array",
                    "description": "Array of progressive hints to help students. MUST generate at least 2 hints. Default: 3 hints.",
                    "items": {
                        "type": "string"
                    },
                    "minItems": 0
                }
            },
            "required": ["title", "description", "problemStatement", "language", "starterCode", "testCases"]
        }
    }
}


def build_activity_generation_prompt(language: str) -> str:
    """Build language-specific activity generation system prompt"""
    
    language_examples = {
        "python": """
IMPORTANT for starter code - USE SOLUTION CLASS PATTERN:
- MUST use LeetCode-style Solution class with method(s)
- Only include: class Solution, method name, parameters, and "# Your code here" comment
- Do NOT include: return statements, logic, variable declarations, or any hints
- Example good starter code:
  class Solution:
      def function_name(self, param1, param2):
          # Your code here
          pass""",
        "java": """
IMPORTANT for starter code - USE SOLUTION CLASS PATTERN:
- MUST use LeetCode-style Solution class with method(s)
- Only include: class Solution, method signature, and "// Your code here" comment
- Do NOT include: return statements, logic, variable declarations, or any hints
- Example good starter code:
  class Solution {
      public int functionName(int param1, int param2) {
          // Your code here
      }
  }"""
    }
    
    language_example = language_examples.get(language.lower(), language_examples["python"])
    
    return f"""You are an expert computer science educator specializing in creating programming exercises.
Your task is to generate high-quality coding activities for students.

IMPORTANT - Language Detection:
- If the user's prompt explicitly mentions a programming language (e.g., "create a Java activity", "in Python", "using C++"), use THAT language
- Otherwise, default to {language.title()}
- Always set the "language" field in your response to match the detected or default language

When creating activities:
- Make problem statements clear and educational
- Include realistic examples with input/output
- For starter code: ALWAYS use Solution class pattern (LeetCode style) - see examples below
- ONLY provide the class Solution with method signature(s) and appropriate comment placeholder
- DO NOT include any solution logic, hints in code, or partial implementations
- Students should write ALL the code themselves from scratch
- Use proper Markdown formatting for problem statements
- Ensure test cases actually validate the solution
{language_example}

Generate activities appropriate for the requested topic and language."""


class ActivityGenerator:
    """
    AI-powered coding activity generator using LLM function calling.
    
    Uses Groq's LLM to generate structured educational content including
    problem statements, starter code, test cases, and hints.
    """
    
    def __init__(self, model: str = "llama-3.3-70b-versatile"):
        """
        Initialize activity generator with specified model.
        
        Args:
            model: Groq model to use (default: llama-3.3-70b-versatile for balanced performance)
        """
        self.client = LLMClientGroq(model=model)
        logger.info(f"ActivityGenerator initialized with model: {model}")
    
    async def generate_activity(self, prompt: str, language: str = "python") -> GeneratedActivity:
        """
        Generate a complete coding activity from a text prompt.
        
        Automatically detects language mentioned in the prompt (e.g., "create a Java activity...")
        and overrides the default language parameter if found.
        
        Args:
            prompt: Description of the activity to generate
            language: Default programming language if not specified in prompt (default: "python")
            
        Returns:
            GeneratedActivity with all structured fields
            
        Raises:
            RuntimeError: If generation fails or response is malformed
        """
        # Smart language detection - check if user mentioned a language in their prompt
        detected_language = detect_language_from_prompt(prompt)
        if detected_language:
            logger.info(f"Detected language '{detected_language}' from prompt, overriding default '{language}'")
            language = detected_language
        
        logger.info(f"Generating {language} activity from prompt: {prompt[:100]}...")
        
        try:
            # Build language-specific system prompt
            system_prompt = build_activity_generation_prompt(language)
            
            # Use the original user prompt without enhancement to let AI parse language naturally
            # The function tool will extract the language
            
            # Call LLM with function calling
            function_call_result = await self.client.complete_with_function_calling(
                system_prompt=system_prompt,
                user_prompt=prompt,  # Use original prompt to preserve user's language specification
                tools=[ACTIVITY_GENERATION_TOOL],
                temperature=0.7
            )
            
            # Parse the function call arguments
            generated_data = json.loads(function_call_result["arguments"])
            
            # Use the language from AI response if provided, otherwise use detected/default
            if "language" not in generated_data or not generated_data["language"]:
                generated_data["language"] = language
            
            # Validate and return structured data
            activity = GeneratedActivity(**generated_data)
            
            logger.info(f"Successfully generated {activity.language} activity: {activity.title}")
            return activity
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response: {e}")
            raise RuntimeError(f"Failed to parse AI response: {str(e)}")
            
        except Exception as e:
            logger.error(f"Activity generation failed: {e}")
            raise RuntimeError(f"Activity generation failed: {str(e)}")
