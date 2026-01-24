"""
Analytics endpoints for instructor dashboard.
Provides session data, behavioral insights, and student performance metrics.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

from ...db.database import get_db
from ...db.models import User, Session as SessionModel, TelemetryEvent, CESScore, BehavioralFlag, RunAttempt, CodeSnapshot

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


# --- RESPONSE MODELS ---

class StudentResponse(BaseModel):
    """Student information for dropdown selection"""
    id: str
    name: str
    username: str
    email: str

    class Config:
        from_attributes = True


class SessionSummaryResponse(BaseModel):
    """Session summary for analytics table"""
    id: str
    student_name: str
    activity_title: str
    started_at: str
    ended_at: Optional[str]
    status: str
    duration_minutes: Optional[float]
    tests_passed: int
    tests_total: int
    final_ces_score: Optional[float]
    final_ces_classification: Optional[str]
    final_code: Optional[str] = None

    class Config:
        from_attributes = True


class TelemetrySummary(BaseModel):
    """Aggregated telemetry metrics for a session"""
    total_keystrokes: int
    total_runs: int
    productive_runs: int
    rapid_fire_runs: int
    total_idle_minutes: float
    focus_violations: int
    avg_kpm: float
    avg_ces: float
    avg_integrity_penalty: float


class BehavioralFlagDetail(BaseModel):
    """Behavioral flag information"""
    flag_type: str
    flagged_at: str
    is_spamming: bool
    is_suspected_paste: bool
    is_rapid_guessing: bool
    is_disengagement: bool

    class Config:
        from_attributes = True


class CESTimelinePoint(BaseModel):
    """CES score at a specific point in time"""
    computed_at: str
    ces_score: float
    ces_classification: str
    kpm_effective: float
    ad_effective: float
    ir_effective: float
    integrity_penalty: float

    class Config:
        from_attributes = True


class SessionDetailsResponse(BaseModel):
    """Detailed session analytics with telemetry and behavioral data"""
    session: SessionSummaryResponse
    telemetry_summary: TelemetrySummary
    behavioral_flags: List[BehavioralFlagDetail]
    ces_timeline: List[CESTimelinePoint]


# --- ENDPOINTS ---

@router.get("/students", response_model=List[StudentResponse])
async def get_students(db: Session = Depends(get_db)):
    """
    Get all students for analytics filtering.
    Only returns users with account_type='student'.
    """
    students = db.query(User).filter(
        User.account_type == 'student',
        User.is_active == True
    ).all()
    
    return [
        StudentResponse(
            id=student.id,
            name=f"{student.first_name} {student.last_name}",
            username=student.username,
            email=student.email
        )
        for student in students
    ]


@router.get("/sessions", response_model=List[SessionSummaryResponse])
async def get_sessions(
    student_id: Optional[str] = Query(None, description="Filter by student ID"),
    activity_id: Optional[str] = Query(None, description="Filter by activity ID"),
    db: Session = Depends(get_db)
):
    """
    Get session summaries with optional filters.
    Returns all sessions for students, with optional filtering by student or activity.
    """
    query = db.query(SessionModel).join(User, SessionModel.student_id == User.id)
    
    # Apply filters
    if student_id:
        query = query.filter(SessionModel.student_id == student_id)
    if activity_id:
        query = query.filter(SessionModel.activity_id == activity_id)
    
    # Only show student sessions, not instructor sessions
    query = query.filter(User.account_type == 'student')
    
    # Only show sessions with engagement scores (exclude N/A or null)
    query = query.filter(SessionModel.final_ces_classification.isnot(None))
    query = query.filter(SessionModel.final_ces_classification != 'N/A')
    
    # Add DISTINCT to prevent duplicates from JOIN
    query = query.distinct()
    
    # Order by most recent first
    query = query.order_by(SessionModel.started_at.desc())
    
    sessions = query.all()
    
    # Build response with student names
    results = []
    for session in sessions:
        student = db.query(User).filter(User.id == session.student_id).first()
        
        # Calculate duration if session ended
        duration_minutes = None
        if session.ended_at and session.started_at:
            duration_seconds = (session.ended_at - session.started_at).total_seconds()
            duration_minutes = duration_seconds / 60.0
        
        results.append(
            SessionSummaryResponse(
                id=session.id,
                student_name=f"{student.first_name} {student.last_name}" if student else "Unknown",
                activity_title=session.activity_title,
                started_at=session.started_at.isoformat() if session.started_at else "",
                ended_at=session.ended_at.isoformat() if session.ended_at else None,
                status=session.status,
                duration_minutes=duration_minutes,
                tests_passed=session.tests_passed,
                tests_total=session.tests_total,
                final_ces_score=session.final_ces_score,
                final_ces_classification=session.final_ces_classification,
                final_code=session.final_code
            )
        )
    
    return results


@router.get("/sessions/{session_id}/details", response_model=SessionDetailsResponse)
async def get_session_details(session_id: str, db: Session = Depends(get_db)):
    """
    Get detailed analytics for a specific session.
    Includes telemetry summary, behavioral flags, and CES timeline.
    """
    # Get session
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get student info
    student = db.query(User).filter(User.id == session.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Only allow access to student sessions
    if student.account_type != 'student':
        raise HTTPException(status_code=403, detail="Cannot access instructor sessions")
    
    # Calculate duration
    duration_minutes = None
    if session.ended_at and session.started_at:
        duration_seconds = (session.ended_at - session.started_at).total_seconds()
        duration_minutes = duration_seconds / 60.0
    
    # Build session summary
    session_summary = SessionSummaryResponse(
        id=session.id,
        student_name=f"{student.first_name} {student.last_name}",
        activity_title=session.activity_title,
        started_at=session.started_at.isoformat() if session.started_at else "",
        ended_at=session.ended_at.isoformat() if session.ended_at else None,
        status=session.status,
        duration_minutes=duration_minutes,
        tests_passed=session.tests_passed,
        tests_total=session.tests_total,
        final_ces_score=session.final_ces_score,
        final_ces_classification=session.final_ces_classification,
        final_code=session.final_code
    )
    
    # Calculate telemetry summary from CES scores (which store keystroke and run counts)
    ces_scores = db.query(CESScore).filter(CESScore.session_id == session_id).all()
    
    # Get latest/max values from CES scores for total keystrokes and runs
    # These accumulate over the session, so we want the last recorded values
    total_keystrokes = max((score.total_keystrokes for score in ces_scores if score.total_keystrokes), default=0)
    total_runs = max((score.total_runs for score in ces_scores if score.total_runs), default=0)
    
    # Calculate idle time from CES scores (sum of all idle time recorded)
    total_idle_seconds = sum((score.idle_time_seconds or 0) for score in ces_scores)
    total_idle_minutes = total_idle_seconds / 60.0
    
    # Run attempts are tracked in ces_scores
    productive_runs = 0  # This would need additional tracking
    rapid_fire_runs = 0  # This would need additional tracking
    focus_violations = 0  # This is tracked via FVC in CES scores
    
    # Calculate average KPM, CES, and integrity penalty from CES scores
    avg_kpm = sum(score.kpm_effective for score in ces_scores) / len(ces_scores) if ces_scores else 0.0
    avg_ces = sum(score.ces_score for score in ces_scores) / len(ces_scores) if ces_scores else 0.0
    avg_integrity_penalty = sum(score.integrity_penalty for score in ces_scores) / len(ces_scores) if ces_scores else 0.0
    
    telemetry_summary = TelemetrySummary(
        total_keystrokes=int(total_keystrokes),
        total_runs=total_runs,
        productive_runs=productive_runs,
        rapid_fire_runs=rapid_fire_runs,
        total_idle_minutes=total_idle_minutes,
        focus_violations=focus_violations,
        avg_kpm=avg_kpm,
        avg_ces=avg_ces,
        avg_integrity_penalty=avg_integrity_penalty
    )
    
    # Get behavioral flags
    flags = db.query(BehavioralFlag).filter(
        BehavioralFlag.session_id == session_id
    ).order_by(BehavioralFlag.flagged_at.desc()).all()
    
    behavioral_flags = [
        BehavioralFlagDetail(
            flag_type=flag.flag_type,
            flagged_at=flag.flagged_at.isoformat() if flag.flagged_at else "",
            is_spamming=flag.is_spamming or False,
            is_suspected_paste=flag.is_suspected_paste or False,
            is_rapid_guessing=flag.is_rapid_guessing or False,
            is_disengagement=flag.is_disengagement or False
        )
        for flag in flags
    ]
    
    # Get CES timeline
    ces_timeline_data = db.query(CESScore).filter(
        CESScore.session_id == session_id
    ).order_by(CESScore.computed_at.asc()).all()
    
    ces_timeline = [
        CESTimelinePoint(
            computed_at=score.computed_at.isoformat() if score.computed_at else "",
            ces_score=score.ces_score,
            ces_classification=score.ces_classification,
            kpm_effective=score.kpm_effective,
            ad_effective=score.ad_effective,
            ir_effective=score.ir_effective,
            integrity_penalty=score.integrity_penalty or 0.0
        )
        for score in ces_timeline_data
    ]
    
    return SessionDetailsResponse(
        session=session_summary,
        telemetry_summary=telemetry_summary,
        behavioral_flags=behavioral_flags,
        ces_timeline=ces_timeline
    )


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, db: Session = Depends(get_db)):
    """
    Delete a session and all associated data.
    This is a superuser action for instructors to clean up sessions.
    Deletes: session, telemetry events, CES scores, code snapshots, run attempts, and behavioral flags.
    """
    # Get session
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Delete session (cascade will handle related records)
    db.delete(session)
    db.commit()
    
    return {
        "status": "success",
        "message": f"Session {session_id} and all related data deleted successfully"
    }


@router.get("/health")
async def analytics_health_check():
    """Health check endpoint for analytics service"""
    return {
        "status": "healthy",
        "service": "analytics",
        "endpoints": [
            "/students",
            "/sessions",
            "/sessions/{id}/details"
        ]
    }
