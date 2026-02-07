"""
AI Activity Generation Endpoint
FastAPI endpoint for generating coding activities using AI service
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional
import json
import uuid
import logging
from datetime import datetime

from ...services.ai_orchestrator import ActivityGenerator
from ...services.ai_orchestrator.activity_generator import TestCaseSchema
from ...db.database import get_db
from ...db.models import Activity

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize activity generator service
try:
    generator = ActivityGenerator(model="llama-3.3-70b-versatile")
except Exception as e:
    logger.error(f"Failed to initialize ActivityGenerator: {e}")
    generator = None


# Request/Response Models
class GenerateActivityRequest(BaseModel):
    prompt: str = Field(..., description="Description of the activity to generate")
    createdBy: Optional[str] = Field(None, description="Instructor user_id (optional)")
    saveToDatabase: bool = Field(True, description="Whether to save the generated activity to database")


class GeneratedActivityResponse(BaseModel):
    """Response model with optional database fields"""
    id: Optional[str] = None
    title: str
    description: str
    problemStatement: str
    starterCode: str
    testCases: list[TestCaseSchema]
    hints: Optional[list[str]] = None
    createdAt: Optional[str] = None


@router.post("/generate-activity", response_model=GeneratedActivityResponse)
async def generate_activity(request: GenerateActivityRequest, db: Session = Depends(get_db)):
    """
    Generate a coding activity using AI service.
    
    The AI will generate structured activity data including problem statement,
    starter code, test cases, and hints.
    
    If saveToDatabase is True (default), the generated activity will be
    saved to the database and returned with an id and createdAt timestamp.
    """
    if not generator:
        raise HTTPException(
            status_code=503,
            detail="AI generation service is unavailable. Check GROQ_API_KEY configuration."
        )
    
    logger.info(f"Activity generation requested: {request.prompt[:100]}...")
    
    try:
        # Generate activity using AI service
        activity_data = await generator.generate_activity(request.prompt)
        
        # Prepare response
        response = GeneratedActivityResponse(
            title=activity_data.title,
            description=activity_data.description,
            problemStatement=activity_data.problemStatement,
            starterCode=activity_data.starterCode,
            testCases=activity_data.testCases,
            hints=activity_data.hints
        )
        
        # Save to database if requested
        if request.saveToDatabase:
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
            response.id = activity.id
            response.createdAt = activity.created_at
            
            logger.info(f"Activity saved to database: {activity.id}")
        
        return response

    except Exception as e:
        db.rollback()
        logger.error(f"Activity generation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Activity generation failed: {str(e)}"
        )

