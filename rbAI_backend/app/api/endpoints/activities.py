"""
Activities CRUD Endpoints
Manages activity creation, retrieval, update, and deletion.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import json

from app.db.database import get_db
from app.db.models import Activity, User

router = APIRouter()


# Pydantic schemas
class TestCaseSchema(BaseModel):
    name: str
    input: str
    expectedOutput: str
    isHidden: bool = False


class ActivityCreate(BaseModel):
    title: str
    description: str
    problemStatement: str
    starterCode: str
    language: str = 'python'
    testCases: Optional[List[TestCaseSchema]] = None
    hints: Optional[List[str]] = None
    solutionCode: Optional[str] = None
    createdBy: Optional[str] = None  # instructor user_id


class ActivityUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    problemStatement: Optional[str] = None
    starterCode: Optional[str] = None
    language: Optional[str] = None
    testCases: Optional[List[TestCaseSchema]] = None
    hints: Optional[List[str]] = None
    solutionCode: Optional[str] = None
    isActive: Optional[bool] = None


class ActivityResponse(BaseModel):
    id: str
    title: str
    description: str
    createdAt: str
    problemStatement: str
    language: str
    starterCode: str
    testCases: Optional[List[TestCaseSchema]] = None
    hints: Optional[List[str]] = None
    isActive: bool
    createdBy: Optional[str] = None

    class Config:
        from_attributes = True


@router.post("/activities", response_model=ActivityResponse, status_code=201)
async def create_activity(activity_data: ActivityCreate, db: Session = Depends(get_db)):
    """
    Create a new activity.
    Used by instructors or when AI generates an activity.
    """
    try:
        # Validate instructor if createdBy is provided
        if activity_data.createdBy:
            instructor = db.query(User).filter(
                User.id == activity_data.createdBy,
                User.account_type == 'instructor'
            ).first()
            if not instructor:
                raise HTTPException(status_code=404, detail="Instructor not found")
        
        # Create activity instance
        activity = Activity(
            id=str(uuid.uuid4()),
            title=activity_data.title,
            description=activity_data.description,
            created_at=datetime.utcnow().strftime('%Y-%m-%d'),
            problem_statement=activity_data.problemStatement,
            language=activity_data.language,
            starter_code=activity_data.starterCode,
            test_cases=json.dumps([tc.dict() for tc in activity_data.testCases]) if activity_data.testCases else None,
            hints=json.dumps(activity_data.hints) if activity_data.hints else None,
            solution_code=activity_data.solutionCode,
            created_by=activity_data.createdBy,
            is_active=True
        )
        
        db.add(activity)
        db.commit()
        db.refresh(activity)
        
        # Parse JSON fields for response
        response = ActivityResponse(
            id=activity.id,
            title=activity.title,
            description=activity.description,
            createdAt=activity.created_at,
            problemStatement=activity.problem_statement,
            language=activity.language,
            starterCode=activity.starter_code,
            testCases=[TestCaseSchema(**tc) for tc in json.loads(activity.test_cases)] if activity.test_cases else None,
            hints=json.loads(activity.hints) if activity.hints else None,
            isActive=activity.is_active,
            createdBy=activity.created_by
        )
        
        return response
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create activity: {str(e)}")


@router.get("/activities", response_model=List[ActivityResponse])
async def get_activities(
    include_inactive: bool = False,
    created_by: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get all activities.
    
    Query parameters:
    - include_inactive: Include inactive activities (default: False)
    - created_by: Filter by instructor user_id
    """
    try:
        query = db.query(Activity)
        
        # Filter by active status
        if not include_inactive:
            query = query.filter(Activity.is_active == True)
        
        # Filter by creator
        if created_by:
            query = query.filter(Activity.created_by == created_by)
        
        # Order by creation date (newest first)
        query = query.order_by(Activity.created_at.desc())
        
        activities = query.all()
        
        # Parse JSON fields for response
        response = []
        for activity in activities:
            response.append(ActivityResponse(
                id=activity.id,
                title=activity.title,
                description=activity.description,
                createdAt=activity.created_at,
                problemStatement=activity.problem_statement,
                language=activity.language,
                starterCode=activity.starter_code,
                testCases=[TestCaseSchema(**tc) for tc in json.loads(activity.test_cases)] if activity.test_cases else None,
                hints=json.loads(activity.hints) if activity.hints else None,
                isActive=activity.is_active,
                createdBy=activity.created_by
            ))
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch activities: {str(e)}")


@router.get("/activities/{activity_id}", response_model=ActivityResponse)
async def get_activity(activity_id: str, db: Session = Depends(get_db)):
    """Get a single activity by ID."""
    try:
        activity = db.query(Activity).filter(Activity.id == activity_id).first()
        
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        # Parse JSON fields for response
        response = ActivityResponse(
            id=activity.id,
            title=activity.title,
            description=activity.description,
            createdAt=activity.created_at,
            problemStatement=activity.problem_statement,
            language=activity.language,
            starterCode=activity.starter_code,
            testCases=[TestCaseSchema(**tc) for tc in json.loads(activity.test_cases)] if activity.test_cases else None,
            hints=json.loads(activity.hints) if activity.hints else None,
            isActive=activity.is_active,
            createdBy=activity.created_by
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch activity: {str(e)}")


@router.put("/activities/{activity_id}", response_model=ActivityResponse)
async def update_activity(
    activity_id: str,
    activity_data: ActivityUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing activity."""
    try:
        activity = db.query(Activity).filter(Activity.id == activity_id).first()
        
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        # Update fields if provided
        if activity_data.title is not None:
            activity.title = activity_data.title
        if activity_data.description is not None:
            activity.description = activity_data.description
        if activity_data.problemStatement is not None:
            activity.problem_statement = activity_data.problemStatement
        if activity_data.starterCode is not None:
            activity.starter_code = activity_data.starterCode
        if activity_data.language is not None:
            activity.language = activity_data.language
        if activity_data.testCases is not None:
            activity.test_cases = json.dumps([tc.dict() for tc in activity_data.testCases])
        if activity_data.hints is not None:
            activity.hints = json.dumps(activity_data.hints)
        if activity_data.solutionCode is not None:
            activity.solution_code = activity_data.solutionCode
        if activity_data.isActive is not None:
            activity.is_active = activity_data.isActive
        
        db.commit()
        db.refresh(activity)
        
        # Parse JSON fields for response
        response = ActivityResponse(
            id=activity.id,
            title=activity.title,
            description=activity.description,
            createdAt=activity.created_at,
            problemStatement=activity.problem_statement,
            language=activity.language,
            starterCode=activity.starter_code,
            testCases=[TestCaseSchema(**tc) for tc in json.loads(activity.test_cases)] if activity.test_cases else None,
            hints=json.loads(activity.hints) if activity.hints else None,
            isActive=activity.is_active,
            createdBy=activity.created_by
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update activity: {str(e)}")


@router.delete("/activities/{activity_id}", status_code=204)
async def delete_activity(activity_id: str, db: Session = Depends(get_db)):
    """
    Delete an activity (soft delete by setting is_active to False).
    Use ?hard=true to permanently delete.
    """
    try:
        activity = db.query(Activity).filter(Activity.id == activity_id).first()
        
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        # Soft delete (set inactive)
        activity.is_active = False
        db.commit()
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete activity: {str(e)}")
