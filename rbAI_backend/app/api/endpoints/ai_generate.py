"""
AI Activity Generation Endpoint
Uses LLM function calling to generate structured activity data
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional
import json
import os
import uuid
from datetime import datetime
from app.services.ai_orchestrator.llm_client_groq import LLMClientGroq
from app.db.database import get_db
from app.db.models import Activity

router = APIRouter()

# Initialize modular LLM client
# Uses llama-3.3-70b-versatile for balanced performance in activity generation
client = LLMClientGroq(model="llama-3.3-70b-versatile")


# Request/Response Models
class GenerateActivityRequest(BaseModel):
    prompt: str = Field(..., description="Description of the activity to generate")
    createdBy: Optional[str] = Field(None, description="Instructor user_id (optional)")
    saveToDatabase: bool = Field(True, description="Whether to save the generated activity to database")


class TestCaseSchema(BaseModel):
    name: str
    input: str
    expectedOutput: str
    isHidden: bool = False


class GeneratedActivity(BaseModel):
    id: Optional[str] = None  # Will be populated if saved to database
    title: str
    description: str
    problemStatement: str
    starterCode: str
    testCases: List[TestCaseSchema]
    hints: Optional[List[str]] = None
    createdAt: Optional[str] = None  # Will be populated if saved to database


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


@router.post("/generate-activity", response_model=GeneratedActivity)
async def generate_activity(request: GenerateActivityRequest, db: Session = Depends(get_db)):
    """
    Generate a coding activity using AI with function calling.
    
    The LLM will be instructed to generate structured data matching
    the Activity schema using function calling.
    
    If saveToDatabase is True (default), the generated activity will be
    saved to the database and returned with an id and createdAt timestamp.
    """
    try:
        # Create the system prompt for activity generation
        system_prompt = """You are an expert computer science educator specializing in creating programming exercises.
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

        # Call LLM with function calling using modular client
        function_call_result = await client.complete_with_function_calling(
            system_prompt=system_prompt,
            user_prompt=request.prompt,
            tools=[ACTIVITY_GENERATION_TOOL],
            temperature=0.7
        )

        # Parse the function call arguments
        generated_data = json.loads(function_call_result["arguments"])

        # Validate generated data
        activity_data = GeneratedActivity(**generated_data)
        
        # Save to database if requested
        if request.saveToDatabase:
            # Create activity instance
            activity = Activity(
                id=str(uuid.uuid4()),
                title=activity_data.title,
                description=activity_data.description,
                created_at=datetime.utcnow().strftime('%Y-%m-%d'),
                problem_statement=activity_data.problemStatement,
                language='python',
                starter_code=activity_data.starterCode,
                test_cases=json.dumps([tc.dict() for tc in activity_data.testCases]),
                hints=json.dumps(activity_data.hints) if activity_data.hints else None,
                created_by=request.createdBy,
                is_active=True
            )
            
            db.add(activity)
            db.commit()
            db.refresh(activity)
            
            # Update response with database info
            activity_data.id = activity.id
            activity_data.createdAt = activity.created_at
        
        return activity_data

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse LLM response: {str(e)}"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Activity generation failed: {str(e)}"
        )


# Note: To use a different model (e.g., for different capabilities or costs),
# you can create another client instance:
# client_fast = LLMClientGroq(model="llama-3.1-8b-instant")  # Faster, simpler tasks
# client_large = LLMClientGroq(model="mixtral-8x7b-32768")   # Larger context window
