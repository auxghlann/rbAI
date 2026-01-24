"""SQLAlchemy ORM models for rbAI database."""
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
from datetime import datetime

Base = declarative_base()


class User(Base):
    """User accounts for authentication and authorization."""
    __tablename__ = 'users'
    
    id = Column(String, primary_key=True)  # UUID
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    account_type = Column(String, nullable=False, index=True)
    
    # Personal Information
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    
    # Metadata
    created_at = Column(DateTime, nullable=False, default=func.now())
    last_login = Column(DateTime)
    is_active = Column(Boolean, default=True, index=True)
    
    # Relationships
    created_activities = relationship("Activity", foreign_keys="Activity.created_by", backref="creator")
    sessions = relationship("Session", foreign_keys="Session.student_id", backref="student")
    
    __table_args__ = (
        CheckConstraint("account_type IN ('instructor', 'student')", name='valid_account_type'),
    )


class Activity(Base):
    """Activity definitions and configurations."""
    __tablename__ = 'activities'
    
    id = Column(String, primary_key=True)  # UUID
    title = Column(String, nullable=False)
    description = Column(Text)
    created_at = Column(String, nullable=False)  # ISO date string (YYYY-MM-DD)
    
    # Problem Configuration (matches Dashboard interface)
    problem_statement = Column(Text, nullable=False)  # Markdown content
    language = Column(String, nullable=False, default='python')
    starter_code = Column(Text, nullable=False)
    test_cases = Column(Text)  # JSON array of TestCase objects
    hints = Column(Text)  # JSON array of hint strings
    
    
    # Instructor Fields (not visible to students)
    solution_code = Column(Text)  # Reference solution for grading
    created_by = Column(String, ForeignKey('users.id'))  # Instructor user_id
    is_active = Column(Boolean, default=True, index=True)
    
    # Relationships
    sessions = relationship("Session", back_populates="activity", cascade="all, delete-orphan")


class Session(Base):
    """Activity session with student context."""
    __tablename__ = 'sessions'
    
    id = Column(String, primary_key=True)  # UUID
    student_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    activity_id = Column(String, ForeignKey('activities.id', ondelete='CASCADE'), nullable=False, index=True)
    activity_title = Column(String, nullable=False)
    started_at = Column(DateTime, nullable=False, default=func.now(), index=True)
    ended_at = Column(DateTime)
    status = Column(String, nullable=False, default='active')
    
    # Session Outcome
    completion_type = Column(String)
    tests_passed = Column(Integer, default=0)
    tests_total = Column(Integer, default=0)
    final_ces_score = Column(Float)
    final_ces_classification = Column(String)
    
    # Session Metadata
    initial_code = Column(Text)
    final_code = Column(Text)
    duration_seconds = Column(Integer)
    
    # Relationships
    activity = relationship("Activity", back_populates="sessions")
    telemetry_events = relationship("TelemetryEvent", back_populates="session", cascade="all, delete-orphan")
    code_snapshots = relationship("CodeSnapshot", back_populates="session", cascade="all, delete-orphan")
    run_attempts = relationship("RunAttempt", back_populates="session", cascade="all, delete-orphan")
    ces_scores = relationship("CESScore", back_populates="session", cascade="all, delete-orphan")
    behavioral_flags = relationship("BehavioralFlag", back_populates="session", cascade="all, delete-orphan")
    ai_interactions = relationship("AIInteraction", back_populates="session", cascade="all, delete-orphan")
    
    __table_args__ = (
        CheckConstraint("status IN ('active', 'completed', 'abandoned')", name='valid_status'),
        CheckConstraint("completion_type IS NULL OR completion_type IN ('perfect', 'partial', 'timeout', 'manual')", name='valid_completion'),
    )


class TelemetryEvent(Base):
    """Raw behavioral event stream."""
    __tablename__ = 'telemetry_events'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey('sessions.id', ondelete='CASCADE'), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, default=func.now(), index=True)
    event_type = Column(String, nullable=False, index=True)
    
    # Event-specific data
    keystroke_count = Column(Integer)
    idle_duration_seconds = Column(Integer)
    focus_violation_type = Column(String)
    
    # Context
    editor_line_count = Column(Integer)
    editor_char_count = Column(Integer)
    cursor_position = Column(Text)  # JSON
    
    # Relationship
    session = relationship("Session", back_populates="telemetry_events")
    
    __table_args__ = (
        CheckConstraint("event_type IN ('keystroke', 'focus', 'blur', 'idle_start', 'idle_end', 'run', 'submit', 'paste')", name='valid_event_type'),
    )


class CodeSnapshot(Base):
    """Code state at each run/submit."""
    __tablename__ = 'code_snapshots'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey('sessions.id', ondelete='CASCADE'), nullable=False, index=True)
    captured_at = Column(DateTime, nullable=False, default=func.now(), index=True)
    trigger_type = Column(String, nullable=False)
    
    # Code Content
    code_content = Column(Text, nullable=False)
    line_count = Column(Integer, nullable=False)
    char_count = Column(Integer, nullable=False)
    
    # Diff Analysis
    diff_insertions = Column(Integer, default=0)
    diff_deletions = Column(Integer, default=0)
    diff_net_change = Column(Integer, default=0)
    has_semantic_change = Column(Boolean, default=False)
    semantic_change_type = Column(String)
    
    # Large Insertion Detection
    has_large_insertion = Column(Boolean, default=False)
    large_insertion_size = Column(Integer, default=0)
    
    # Link to execution
    run_attempt_id = Column(Integer, ForeignKey('run_attempts.id', ondelete='SET NULL'))
    
    # Relationships
    session = relationship("Session", back_populates="code_snapshots")
    run_attempt = relationship("RunAttempt", foreign_keys=[run_attempt_id], post_update=True)
    
    __table_args__ = (
        CheckConstraint("trigger_type IN ('run', 'submit', 'manual_save')", name='valid_trigger'),
    )


class RunAttempt(Base):
    """Code execution attempts with results."""
    __tablename__ = 'run_attempts'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey('sessions.id', ondelete='CASCADE'), nullable=False, index=True)
    executed_at = Column(DateTime, nullable=False, default=func.now(), index=True)
    code_snapshot_id = Column(Integer, ForeignKey('code_snapshots.id', ondelete='CASCADE'), nullable=False)
    
    # Execution Results
    status = Column(String, nullable=False)
    execution_time_ms = Column(Integer)
    stdout = Column(Text)
    stderr = Column(Text)
    error_type = Column(String)
    
    # Test Results
    tests_passed = Column(Integer, default=0)
    tests_failed = Column(Integer, default=0)
    test_results = Column(Text)  # JSON
    
    # Iteration Metrics
    time_since_last_run_seconds = Column(Float)
    is_rapid_fire = Column(Boolean, default=False)
    has_semantic_change_since_last = Column(Boolean, default=False)
    
    # Relationships
    session = relationship("Session", back_populates="run_attempts")
    code_snapshot = relationship("CodeSnapshot", foreign_keys=[code_snapshot_id], back_populates="run_attempts")
    
    __table_args__ = (
        CheckConstraint("status IN ('success', 'error', 'timeout')", name='valid_status'),
    )


# Add back_populates to CodeSnapshot for run_attempts
CodeSnapshot.run_attempts = relationship("RunAttempt", foreign_keys=[RunAttempt.code_snapshot_id], back_populates="code_snapshot")


class CESScore(Base):
    """Computed CES scores at regular intervals."""
    __tablename__ = 'ces_scores'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey('sessions.id', ondelete='CASCADE'), nullable=False, index=True)
    computed_at = Column(DateTime, nullable=False, default=func.now(), index=True)
    
    # Raw Metrics (Effective)
    kpm_effective = Column(Float, nullable=False)
    ad_effective = Column(Float, nullable=False)
    ir_effective = Column(Float, nullable=False)
    fvc_effective = Column(Integer, nullable=False)
    
    # Normalized Metrics
    kpm_normalized = Column(Float, nullable=False)
    ad_normalized = Column(Float, nullable=False)
    ir_normalized = Column(Float, nullable=False)
    fvc_normalized = Column(Float, nullable=False)
    
    # CES Output
    ces_score = Column(Float, nullable=False)
    ces_classification = Column(String, nullable=False)
    integrity_penalty = Column(Float, default=0.0)
    
    # Supporting Data
    total_keystrokes = Column(Integer)
    total_runs = Column(Integer)
    idle_time_seconds = Column(Float)
    active_time_seconds = Column(Float)
    
    # Relationship
    session = relationship("Session", back_populates="ces_scores")
    
    __table_args__ = (
        CheckConstraint("ces_classification IN ('High Engagement', 'Moderate Engagement', 'Low Engagement', 'Disengaged/At-Risk')", name='valid_classification'),
    )


class BehavioralFlag(Base):
    """Data fusion outputs (validity gates)."""
    __tablename__ = 'behavioral_flags'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey('sessions.id', ondelete='CASCADE'), nullable=False, index=True)
    flagged_at = Column(DateTime, nullable=False, default=func.now())
    flag_type = Column(String, nullable=False, index=True)
    
    # Provenance Gate
    is_spamming = Column(Boolean, default=False)
    is_suspected_paste = Column(Boolean, default=False)
    is_authentic_refactor = Column(Boolean, default=False)
    keystroke_efficiency_ratio = Column(Float)
    
    # Iteration Gate
    is_rapid_guessing = Column(Boolean, default=False)
    is_micro_iteration = Column(Boolean, default=False)
    is_verification_run = Column(Boolean, default=False)
    is_deliberate_debugging = Column(Boolean, default=False)
    
    # Cognitive Gate
    is_reflective_pause = Column(Boolean, default=False)
    is_disengagement = Column(Boolean, default=False)
    is_passive_idle = Column(Boolean, default=False)
    idle_context = Column(String)
    
    # Supporting Evidence
    evidence = Column(Text)  # JSON
    severity = Column(String, default='info', index=True)
    
    # Relationship
    session = relationship("Session", back_populates="behavioral_flags")
    
    __table_args__ = (
        CheckConstraint("flag_type IN ('provenance', 'iteration', 'cognitive')", name='valid_flag_type'),
    )


class AIInteraction(Base):
    """Chat messages with behavioral context."""
    __tablename__ = 'ai_interactions'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey('sessions.id', ondelete='CASCADE'), nullable=False, index=True)
    sent_at = Column(DateTime, nullable=False, default=func.now(), index=True)
    role = Column(String, nullable=False)
    
    # Message Content
    message_content = Column(Text, nullable=False)
    
    # Enriched Context
    current_code_snapshot_id = Column(Integer, ForeignKey('code_snapshots.id', ondelete='SET NULL'))
    recent_error = Column(Text)
    ces_at_query = Column(Float)
    behavioral_context = Column(Text)  # JSON
    
    # AI Response Metadata
    model_used = Column(String)
    tokens_used = Column(Integer)
    response_time_ms = Column(Integer)
    
    # Relationships
    session = relationship("Session", back_populates="ai_interactions")
    code_snapshot = relationship("CodeSnapshot")
    
    __table_args__ = (
        CheckConstraint("role IN ('user', 'assistant', 'system')", name='valid_role'),
    )


class SessionSummary(Base):
    """Pre-computed analytics view."""
    __tablename__ = 'session_summary'
    
    session_id = Column(String, ForeignKey('sessions.id', ondelete='CASCADE'), primary_key=True)
    
    # Activity Completion
    duration_minutes = Column(Float)
    completion_status = Column(String)
    final_ces = Column(Float)
    
    # Behavioral Metrics (Averages)
    avg_kpm = Column(Float)
    avg_ad = Column(Float)
    avg_ir = Column(Float)
    total_fvc = Column(Integer)
    
    # Productivity Indicators
    total_keystrokes = Column(Integer)
    total_runs = Column(Integer)
    productive_runs = Column(Integer)
    rapid_fire_runs = Column(Integer)
    
    # Integrity Flags
    spamming_detected = Column(Boolean, default=False)
    paste_suspected = Column(Boolean, default=False)
    disengagement_detected = Column(Boolean, default=False)
    
    # AI Usage
    total_ai_queries = Column(Integer)
    avg_ces_at_ai_query = Column(Float)
    
    # Timestamps
    computed_at = Column(DateTime, default=func.now())
    
    # Relationship
    session = relationship("Session")
