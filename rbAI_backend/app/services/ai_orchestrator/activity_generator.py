"""
AI Activity Generation Service
Uses LLM function calling to generate structured coding activities
"""

import json
import logging
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
    starterCode: str
    testCases: List[TestCaseSchema]
    hints: Optional[List[str]] = None


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
                "starterCode": {
                    "type": "string",
                    "description": "Python starter code with ONLY function signature and '# Your code here' comment. DO NOT include any solution logic, variable declarations, or implementation hints. Students must write everything themselves."
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
            "required": ["title", "description", "problemStatement", "starterCode", "testCases"]
        }
    }
}


ACTIVITY_GENERATION_SYSTEM_PROMPT = """You are an expert computer science educator specializing in creating programming exercises.
Your task is to generate high-quality coding activities for students learning Python.

When creating activities:
- Make problem statements clear and educational
- Include realistic examples with input/output
- For starter code: ONLY provide the function signature and a comment saying "# Your code here"
- DO NOT include any solution logic, hints in code, or partial implementations
- Students should write ALL the code themselves from scratch
- Use proper Markdown formatting for problem statements
- Ensure test cases actually validate the solution

IMPORTANT for starter code:
- Only include: function name, parameters, and "# Your code here" comment
- Do NOT include: return statements, logic, variable declarations, or any hints
- Example good starter code:
  def function_name(param1, param2):
      # Your code here
      pass

Generate activities appropriate for the requested topic."""


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
    
    async def generate_activity(self, prompt: str) -> GeneratedActivity:
        """
        Generate a complete coding activity from a text prompt.
        
        Args:
            prompt: Description of the activity to generate
            
        Returns:
            GeneratedActivity with all structured fields
            
        Raises:
            RuntimeError: If generation fails or response is malformed
        """
        logger.info(f"Generating activity from prompt: {prompt[:100]}...")
        
        try:
            # Call LLM with function calling
            function_call_result = await self.client.complete_with_function_calling(
                system_prompt=ACTIVITY_GENERATION_SYSTEM_PROMPT,
                user_prompt=prompt,
                tools=[ACTIVITY_GENERATION_TOOL],
                temperature=0.7
            )
            
            # Parse the function call arguments
            generated_data = json.loads(function_call_result["arguments"])
            
            # Validate and return structured data
            activity = GeneratedActivity(**generated_data)
            
            logger.info(f"Successfully generated activity: {activity.title}")
            return activity
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response: {e}")
            raise RuntimeError(f"Failed to parse AI response: {str(e)}")
            
        except Exception as e:
            logger.error(f"Activity generation failed: {e}")
            raise RuntimeError(f"Activity generation failed: {str(e)}")
