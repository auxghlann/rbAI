"""
Session management endpoints for tracking student activity sessions.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid

from ...db.database import get_db
from ...db.models import Session, User, Activity, TelemetryEvent, CESScore, CodeSnapshot, RunAttempt

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


# --- SESSION CODE STORAGE (Database-backed) ---

async def get_session_code(session_id: str, problem_id: str, db: DBSession) -> Optional[str]:
    """
    Retrieve the current code for a session from database.
    
    Args:
        session_id: Unique session identifier
        problem_id: Problem/activity identifier (unused, kept for API compatibility)
        db: Database session
        
    Returns:
        Current code or None if not found
    """
    session = db.query(Session).filter(Session.id == session_id).first()
    if session:
        # Return saved_code, or fall back to final_code, then initial_code
        return session.saved_code or session.final_code or session.initial_code
    return None


# --- REQUEST/RESPONSE MODELS ---

class CreateSessionRequest(BaseModel):
    """Request to create a new session"""
    student_id: str
    activity_id: str
    activity_title: str
    initial_code: Optional[str] = None


class SessionResponse(BaseModel):
    """Session information"""
    id: str
    student_id: str
    activity_id: str
    activity_title: str
    started_at: str
    status: str

    class Config:
        from_attributes = True


class StoreTelemetryRequest(BaseModel):
    """Store telemetry event"""
    session_id: str
    event_type: str
    keystroke_count: Optional[int] = None
    idle_duration_seconds: Optional[int] = None
    focus_violation_type: Optional[str] = None
    editor_line_count: Optional[int] = None
    editor_char_count: Optional[int] = None


class StoreCESRequest(BaseModel):
    """Store CES score"""
    session_id: str
    kpm_effective: float
    ad_effective: float
    ir_effective: float
    fvc_effective: int
    kpm_normalized: float
    ad_normalized: float
    ir_normalized: float
    fvc_normalized: float
    ces_score: float
    ces_classification: str
    integrity_penalty: float = 0.0
    provenance_state: str = 'Authentic Refactoring'
    cognitive_state: str = 'Active'
    total_keystrokes: Optional[int] = None
    total_runs: Optional[int] = None
    idle_time_seconds: Optional[float] = None
    active_time_seconds: Optional[float] = None


class StoreRunAttemptRequest(BaseModel):
    """Store code run attempt"""
    session_id: str
    code_content: str
    status: str
    execution_time_ms: Optional[int] = None
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    error_type: Optional[str] = None
    tests_passed: int = 0
    tests_failed: int = 0


class CompleteSessionRequest(BaseModel):
    """Complete a session"""
    session_id: str
    final_code: Optional[str] = None
    completion_type: str
    tests_passed: int = 0
    tests_total: int = 0
    final_ces_score: Optional[float] = None
    final_ces_classification: Optional[str] = None


# --- ENDPOINTS ---

@router.post("/create", response_model=SessionResponse)
async def create_session(request: CreateSessionRequest, db: DBSession = Depends(get_db)):
    """
    Create a new activity session for a student.
    Called when student opens an activity.
    """
    # Verify student exists
    student = db.query(User).filter(User.id == request.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Only allow sessions for students
    if student.account_type != 'student':
        raise HTTPException(status_code=403, detail="Sessions can only be created for students")
    
    # Verify activity exists
    activity = db.query(Activity).filter(Activity.id == request.activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    # Create new session
    session = Session(
        id=str(uuid.uuid4()),
        student_id=request.student_id,
        activity_id=request.activity_id,
        activity_title=request.activity_title,
        started_at=datetime.now(),
        status='active',
        initial_code=request.initial_code,
        tests_passed=0,
        tests_total=0
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return SessionResponse(
        id=session.id,
        student_id=session.student_id,
        activity_id=session.activity_id,
        activity_title=session.activity_title,
        started_at=session.started_at.isoformat(),
        status=session.status
    )


@router.post("/telemetry")
async def store_telemetry(request: StoreTelemetryRequest, db: DBSession = Depends(get_db)):
    """
    Store a telemetry event for a session.
    """
    # Verify session exists
    session = db.query(Session).filter(Session.id == request.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Create telemetry event
    event = TelemetryEvent(
        session_id=request.session_id,
        timestamp=datetime.now(),
        event_type=request.event_type,
        keystroke_count=request.keystroke_count,
        idle_duration_seconds=request.idle_duration_seconds,
        focus_violation_type=request.focus_violation_type,
        editor_line_count=request.editor_line_count,
        editor_char_count=request.editor_char_count
    )
    
    db.add(event)
    db.commit()
    
    return {"status": "success", "event_id": event.id}


@router.post("/ces")
async def store_ces_score(request: StoreCESRequest, db: DBSession = Depends(get_db)):
    """
    Store a CES score for a session.
    """
    # Verify session exists
    session = db.query(Session).filter(Session.id == request.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Create CES score record
    ces_score = CESScore(
        session_id=request.session_id,
        computed_at=datetime.now(),
        kpm_effective=request.kpm_effective,
        ad_effective=request.ad_effective,
        ir_effective=request.ir_effective,
        fvc_effective=request.fvc_effective,
        kpm_normalized=request.kpm_normalized,
        ad_normalized=request.ad_normalized,
        ir_normalized=request.ir_normalized,
        fvc_normalized=request.fvc_normalized,
        ces_score=request.ces_score,
        ces_classification=request.ces_classification,
        integrity_penalty=request.integrity_penalty,
        provenance_state=request.provenance_state,
        cognitive_state=request.cognitive_state,
        total_keystrokes=request.total_keystrokes,
        total_runs=request.total_runs,
        idle_time_seconds=request.idle_time_seconds,
        active_time_seconds=request.active_time_seconds
    )
    
    db.add(ces_score)
    
    # Update session's latest CES for real-time monitoring
    # This allows instructors to see current engagement for active sessions
    session.final_ces_score = request.ces_score
    session.final_ces_classification = request.ces_classification
    
    db.commit()
    
    return {"status": "success"}


@router.post("/run")
async def store_run_attempt(request: StoreRunAttemptRequest, db: DBSession = Depends(get_db)):
    """
    Store a code run attempt.
    """
    # Verify session exists
    session = db.query(Session).filter(Session.id == request.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Create code snapshot
    snapshot = CodeSnapshot(
        session_id=request.session_id,
        captured_at=datetime.now(),
        trigger_type='run',
        code_content=request.code_content,
        line_count=len(request.code_content.split('\n')),
        char_count=len(request.code_content)
    )
    db.add(snapshot)
    db.flush()  # Get snapshot ID
    
    # Create run attempt
    run_attempt = RunAttempt(
        session_id=request.session_id,
        executed_at=datetime.now(),
        code_snapshot_id=snapshot.id,
        status=request.status,
        execution_time_ms=request.execution_time_ms,
        stdout=request.stdout,
        stderr=request.stderr,
        error_type=request.error_type,
        tests_passed=request.tests_passed,
        tests_failed=request.tests_failed
    )
    
    db.add(run_attempt)
    db.commit()
    
    return {"status": "success", "run_id": run_attempt.id}


@router.post("/complete")
async def complete_session(request: CompleteSessionRequest, db: DBSession = Depends(get_db)):
    """
    Mark a session as completed.
    """
    # Get session
    session = db.query(Session).filter(Session.id == request.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Update session
    session.ended_at = datetime.now()
    session.status = 'completed'
    session.completion_type = request.completion_type
    session.final_code = request.final_code
    session.tests_passed = request.tests_passed
    session.tests_total = request.tests_total
    
    # Calculate AVERAGE CES from entire session timeline for final classification
    # This gives a holistic view of engagement rather than just the last moment
    from ...db.models import CESScore
    from sqlalchemy import func
    
    ces_entries = db.query(CESScore).filter(
        CESScore.session_id == request.session_id
    ).all()
    
    if ces_entries and len(ces_entries) > 0:
        # Calculate average CES score
        avg_ces = sum(entry.ces_score for entry in ces_entries) / len(ces_entries)
        session.final_ces_score = avg_ces
        
        # Classify the average CES using the same thresholds
        if avg_ces > 0.50:
            session.final_ces_classification = "High Engagement"
        elif avg_ces > 0.20:
            session.final_ces_classification = "Moderate Engagement"
        elif avg_ces > 0.00:
            session.final_ces_classification = "Low Engagement"
        else:
            session.final_ces_classification = "Disengaged/At-Risk"
    elif request.final_ces_score is not None:
        # Fallback to request values if no CES timeline exists
        session.final_ces_score = request.final_ces_score
        if request.final_ces_classification:
            session.final_ces_classification = request.final_ces_classification
    
    # Calculate duration
    if session.started_at:
        duration = (session.ended_at - session.started_at).total_seconds()
        session.duration_seconds = int(duration)
    
    db.commit()
    
    return {"status": "success", "session_id": session.id}


@router.get("/active/{student_id}/{activity_id}")
async def get_active_session(student_id: str, activity_id: str, db: DBSession = Depends(get_db)):
    """
    Get most recent session for student and activity, returns saved code.
    
    LeetCode-style approach: Load code from most recent session regardless of completion status.
    - If there's an active session: resume it
    - If there's only a completed session: create new session but load previous code
    - This allows students to keep their work even after completing
    """
    # First check for active session
    active_session = db.query(Session).filter(
        Session.student_id == student_id,
        Session.activity_id == activity_id,
        Session.status == 'active'
    ).order_by(Session.started_at.desc()).first()
    
    if active_session:
        # Resume active session
        return {
            "exists": True,
            "id": active_session.id,
            "student_id": active_session.student_id,
            "activity_id": active_session.activity_id,
            "saved_code": active_session.saved_code or active_session.final_code or active_session.initial_code,
            "notes": active_session.notes or "",
            "started_at": active_session.started_at.isoformat() if active_session.started_at else None,
            "is_completed": False
        }
    
    # No active session - check for most recent completed session
    completed_session = db.query(Session).filter(
        Session.student_id == student_id,
        Session.activity_id == activity_id,
        Session.status == 'completed'
    ).order_by(Session.started_at.desc()).first()
    
    if completed_session:
        # Return code from completed session (new session will be created with this code)
        return {
            "exists": False,  # No active session, but we have code
            "saved_code": completed_session.saved_code or completed_session.final_code or completed_session.initial_code,
            "is_completed": True,
            "previous_session_id": completed_session.id
        }
    
    # No sessions at all
    return {"exists": False, "is_completed": False}


@router.post("/save-code")
async def save_code(request: dict, db: DBSession = Depends(get_db)):
    """Save current code progress for a session"""
    session_id = request.get('session_id')
    code = request.get('code')
    
    print(f"[DEBUG] save_code called - session_id: {session_id}, code length: {len(code) if code else 0}")
    
    if not session_id or code is None:
        raise HTTPException(status_code=400, detail="session_id and code required")
    
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        print(f"[DEBUG] Session not found: {session_id}")
        raise HTTPException(status_code=404, detail="Session not found")
    
    print(f"[DEBUG] Found session, updating saved_code from {len(session.saved_code or '')} to {len(code)} chars")
    session.saved_code = code
    db.commit()
    print(f"[DEBUG] Committed to database")
    
    return {"status": "success", "saved_at": datetime.now().isoformat()}


@router.get("/completed/{student_id}/{activity_id}")
async def check_completion_status(student_id: str, activity_id: str, db: DBSession = Depends(get_db)):
    """Check if student has completed this activity"""
    completed_session = db.query(Session).filter(
        Session.student_id == student_id,
        Session.activity_id == activity_id,
        Session.status == 'completed'
    ).first()
    
    return {
        "completed": completed_session is not None,
        "completion_type": completed_session.completion_type if completed_session else None,
        "tests_passed": completed_session.tests_passed if completed_session else 0,
        "tests_total": completed_session.tests_total if completed_session else 0
    }


@router.get("/{session_id}")
async def get_session(session_id: str, db: DBSession = Depends(get_db)):
    """Get session details"""
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "id": session.id,
        "student_id": session.student_id,
        "activity_id": session.activity_id,
        "activity_title": session.activity_title,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "ended_at": session.ended_at.isoformat() if session.ended_at else None,
        "status": session.status,
        "tests_passed": session.tests_passed,
        "tests_total": session.tests_total,
        "final_ces_score": session.final_ces_score,
        "final_ces_classification": session.final_ces_classification
    }


class SaveNotesRequest(BaseModel):
    """Request to save notes"""
    session_id: str
    notes: str


@router.post("/notes/save")
async def save_notes(
    request: SaveNotesRequest,
    db: DBSession = Depends(get_db)
):
    """Save student notes for a session"""
    session = db.query(Session).filter(Session.id == request.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.notes = request.notes
    db.commit()
    
    return {"status": "success", "saved_at": datetime.now().isoformat()}


@router.get("/notes/{session_id}")
async def get_notes(session_id: str, db: DBSession = Depends(get_db)):
    """Get student notes for a session"""
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "session_id": session.id,
        "notes": session.notes or ""
    }
