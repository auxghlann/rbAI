-- rbAI SQLite Database Schema
-- Supports: Behavioral Monitoring, Data Fusion, CES Calculation, AI Mediation
-- Design: Optimized for real-time telemetry capture and post-session analytics

-- ============================================================================
-- CORE ENTITIES
-- ============================================================================

-- 1. USERS: Account credentials and authentication
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,  -- UUID
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    account_type TEXT NOT NULL,  -- instructor, student
    
    -- Personal Information
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    
    CONSTRAINT valid_account_type CHECK (account_type IN ('instructor', 'student'))
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_account_type ON users(account_type);
CREATE INDEX idx_users_active ON users(is_active);


-- 2. ACTIVITIES: Activity definitions and configurations
CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,  -- UUID
    title TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,  -- ISO date string (YYYY-MM-DD)
    
    -- Problem Configuration (matches Dashboard interface)
    problem_statement TEXT NOT NULL,  -- Markdown content
    language TEXT NOT NULL DEFAULT 'python',
    starter_code TEXT NOT NULL,
    test_cases TEXT,  -- JSON array of TestCase objects
    hints TEXT,  -- JSON array of hint strings
    
    -- Instructor Fields (not visible to students)
    solution_code TEXT,  -- Reference solution for grading
    created_by TEXT,  -- Instructor user_id
    is_active BOOLEAN DEFAULT 1
);

CREATE INDEX idx_activities_active ON activities(is_active);
CREATE INDEX idx_activities_language ON activities(language);


-- 3. SESSIONS: Activity instances with student context
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,  -- UUID
    student_id TEXT NOT NULL,
    activity_id TEXT NOT NULL,
    activity_title TEXT NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
    ended_at TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'active',  -- active, completed, abandoned
    
    -- Session Outcome
    completion_type TEXT,  -- perfect, partial, timeout, manual
    tests_passed INTEGER DEFAULT 0,
    tests_total INTEGER DEFAULT 0,
    final_ces_score REAL,
    final_ces_classification TEXT,  -- High, Moderate, Low, Disengaged
    
    -- Session Metadata
    initial_code TEXT,
    final_code TEXT,
    saved_code TEXT,  -- Current code being worked on
    notes TEXT,  -- Student's markdown notes for this activity
    duration_seconds INTEGER,  -- computed on session end
    
    CONSTRAINT valid_status CHECK (status IN ('active', 'completed', 'abandoned')),
    CONSTRAINT valid_completion CHECK (completion_type IS NULL OR completion_type IN ('perfect', 'partial', 'timeout', 'manual'))
);

CREATE INDEX idx_sessions_student ON sessions(student_id);
CREATE INDEX idx_sessions_activity ON sessions(activity_id);
CREATE INDEX idx_sessions_started ON sessions(started_at DESC);


-- 3. TELEMETRY_EVENTS: Raw behavioral event stream
CREATE TABLE IF NOT EXISTS telemetry_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    event_type TEXT NOT NULL,  -- keystroke, focus, blur, idle_start, idle_end, run, submit
    
    -- Event-specific data (JSON or individual columns)
    keystroke_count INTEGER,  -- for keystroke events
    idle_duration_seconds INTEGER,  -- for idle events
    focus_violation_type TEXT,  -- blur, visibilitychange
    
    -- Context
    editor_line_count INTEGER,
    editor_char_count INTEGER,
    cursor_position TEXT,  -- JSON: {line: 10, column: 5}
    
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    CONSTRAINT valid_event_type CHECK (event_type IN ('keystroke', 'focus', 'blur', 'idle_start', 'idle_end', 'run', 'submit', 'paste'))
);

CREATE INDEX idx_telemetry_session ON telemetry_events(session_id);
CREATE INDEX idx_telemetry_timestamp ON telemetry_events(timestamp);
CREATE INDEX idx_telemetry_type ON telemetry_events(event_type);


-- 4. CODE_SNAPSHOTS: Code state at each run/submit
CREATE TABLE IF NOT EXISTS code_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    captured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    trigger_type TEXT NOT NULL,  -- run, submit, manual_save
    
    -- Code Content
    code_content TEXT NOT NULL,
    line_count INTEGER NOT NULL,
    char_count INTEGER NOT NULL,
    
    -- Diff Analysis (compared to previous snapshot)
    diff_insertions INTEGER DEFAULT 0,
    diff_deletions INTEGER DEFAULT 0,
    diff_net_change INTEGER DEFAULT 0,
    has_semantic_change BOOLEAN DEFAULT 0,  -- 0 = false, 1 = true
    semantic_change_type TEXT,  -- control_flow, function_call, variable_assignment, logic, none
    
    -- Large Insertion Detection
    has_large_insertion BOOLEAN DEFAULT 0,
    large_insertion_size INTEGER DEFAULT 0,
    
    -- Link to execution (if triggered by run)
    run_attempt_id INTEGER,
    
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (run_attempt_id) REFERENCES run_attempts(id) ON DELETE SET NULL,
    CONSTRAINT valid_trigger CHECK (trigger_type IN ('run', 'submit', 'manual_save'))
);

CREATE INDEX idx_snapshots_session ON code_snapshots(session_id);
CREATE INDEX idx_snapshots_captured ON code_snapshots(captured_at);


-- ============================================================================
-- EXECUTION & ITERATION TRACKING
-- ============================================================================

-- 5. RUN_ATTEMPTS: Code execution attempts with results
CREATE TABLE IF NOT EXISTS run_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    code_snapshot_id INTEGER NOT NULL,
    
    -- Execution Results
    status TEXT NOT NULL,  -- success, error, timeout
    execution_time_ms INTEGER,
    stdout TEXT,
    stderr TEXT,
    error_type TEXT,  -- SyntaxError, NameError, etc.
    
    -- Test Results (if applicable)
    tests_passed INTEGER DEFAULT 0,
    tests_failed INTEGER DEFAULT 0,
    test_results TEXT,  -- JSON array of test case results
    
    -- Iteration Metrics
    time_since_last_run_seconds REAL,  -- for TAT calculation
    is_rapid_fire BOOLEAN DEFAULT 0,  -- < 10 seconds
    has_semantic_change_since_last BOOLEAN DEFAULT 0,
    
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (code_snapshot_id) REFERENCES code_snapshots(id) ON DELETE CASCADE,
    CONSTRAINT valid_status CHECK (status IN ('success', 'error', 'timeout'))
);

CREATE INDEX idx_runs_session ON run_attempts(session_id);
CREATE INDEX idx_runs_executed ON run_attempts(executed_at);


-- ============================================================================
-- BEHAVIORAL ANALYSIS & CES
-- ============================================================================

-- 6. CES_SCORES: Computed CES scores at regular intervals
CREATE TABLE IF NOT EXISTS ces_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Raw Metrics (Effective values after data fusion)
    kpm_effective REAL NOT NULL,
    ad_effective REAL NOT NULL,
    ir_effective REAL NOT NULL,
    fvc_effective INTEGER NOT NULL,
    
    -- Normalized Metrics
    kpm_normalized REAL NOT NULL,
    ad_normalized REAL NOT NULL,
    ir_normalized REAL NOT NULL,
    fvc_normalized REAL NOT NULL,
    
    -- CES Output
    ces_score REAL NOT NULL,
    ces_classification TEXT NOT NULL,
    integrity_penalty REAL DEFAULT 0.0,
    
    -- Data Fusion States
    provenance_state TEXT DEFAULT 'AUTHENTIC_REFACTORING',
    cognitive_state TEXT DEFAULT 'ACTIVE',
    
    -- Supporting Data
    total_keystrokes INTEGER,
    total_runs INTEGER,
    idle_time_seconds REAL,
    active_time_seconds REAL,
    
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    CONSTRAINT valid_classification CHECK (ces_classification IN ('High Engagement', 'Moderate Engagement', 'Low Engagement', 'Disengaged/At-Risk'))
);

CREATE INDEX idx_ces_session ON ces_scores(session_id);
CREATE INDEX idx_ces_computed ON ces_scores(computed_at);


-- 7. BEHAVIORAL_FLAGS: Data fusion outputs (validity gates)
CREATE TABLE IF NOT EXISTS behavioral_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    flagged_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    flag_type TEXT NOT NULL,  -- provenance, iteration, cognitive
    
    -- Provenance Gate
    is_spamming BOOLEAN DEFAULT 0,
    is_suspected_paste BOOLEAN DEFAULT 0,
    is_authentic_refactor BOOLEAN DEFAULT 0,
    keystroke_efficiency_ratio REAL,
    
    -- Iteration Gate
    is_rapid_guessing BOOLEAN DEFAULT 0,
    is_micro_iteration BOOLEAN DEFAULT 0,
    is_verification_run BOOLEAN DEFAULT 0,
    is_deliberate_debugging BOOLEAN DEFAULT 0,
    
    -- Cognitive Gate
    is_reflective_pause BOOLEAN DEFAULT 0,
    is_disengagement BOOLEAN DEFAULT 0,
    is_passive_idle BOOLEAN DEFAULT 0,
    idle_context TEXT,  -- focused_with_error, focused_no_error, blurred
    
    -- Supporting Evidence
    evidence TEXT,  -- JSON: detailed explanation for instructor
    severity TEXT DEFAULT 'info',  -- info, warning, critical
    
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    CONSTRAINT valid_flag_type CHECK (flag_type IN ('provenance', 'iteration', 'cognitive'))
);

CREATE INDEX idx_flags_session ON behavioral_flags(session_id);
CREATE INDEX idx_flags_type ON behavioral_flags(flag_type);
CREATE INDEX idx_flags_severity ON behavioral_flags(severity);


-- ============================================================================
-- AI MEDIATION & CHAT
-- ============================================================================

-- 8. AI_INTERACTIONS: Chat messages with behavioral context
CREATE TABLE IF NOT EXISTS ai_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    role TEXT NOT NULL,  -- user, assistant, system
    
    -- Message Content
    message_content TEXT NOT NULL,
    
    -- Enriched Context (attached to user queries)
    current_code_snapshot_id INTEGER,
    recent_error TEXT,
    ces_at_query REAL,
    behavioral_context TEXT,  -- JSON: summary of current state
    
    -- AI Response Metadata
    model_used TEXT,  -- gpt-4, claude-3, etc.
    tokens_used INTEGER,
    response_time_ms INTEGER,
    
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (current_code_snapshot_id) REFERENCES code_snapshots(id) ON DELETE SET NULL,
    CONSTRAINT valid_role CHECK (role IN ('user', 'assistant', 'system'))
);

CREATE INDEX idx_ai_session ON ai_interactions(session_id);
CREATE INDEX idx_ai_sent ON ai_interactions(sent_at);


-- ============================================================================
-- AGGREGATED METRICS (FOR INSTRUCTOR DASHBOARD)
-- ============================================================================

-- 9. SESSION_SUMMARY: Pre-computed analytics view
CREATE TABLE IF NOT EXISTS session_summary (
    session_id TEXT PRIMARY KEY,
    
    -- Activity Completion
    duration_minutes REAL,
    completion_status TEXT,
    final_ces REAL,
    
    -- Behavioral Metrics (Averages)
    avg_kpm REAL,
    avg_ad REAL,
    avg_ir REAL,
    total_fvc INTEGER,
    
    -- Productivity Indicators
    total_keystrokes INTEGER,
    total_runs INTEGER,
    productive_runs INTEGER,  -- runs with semantic changes
    rapid_fire_runs INTEGER,
    
    -- Integrity Flags
    spamming_detected BOOLEAN DEFAULT 0,
    paste_suspected BOOLEAN DEFAULT 0,
    disengagement_detected BOOLEAN DEFAULT 0,
    
    -- AI Usage
    total_ai_queries INTEGER,
    avg_ces_at_ai_query REAL,
    
    -- Timestamps
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);


-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: Real-time session metrics
CREATE VIEW IF NOT EXISTS v_active_sessions AS
SELECT 
    s.id,
    s.student_id,
    s.activity_title,
    s.started_at,
    ROUND((julianday('now') - julianday(s.started_at)) * 1440, 2) as duration_minutes,
    COUNT(DISTINCT te.id) FILTER (WHERE te.event_type = 'keystroke') as total_keystrokes,
    COUNT(DISTINCT ra.id) as total_runs,
    MAX(ces.ces_score) as latest_ces
FROM sessions s
LEFT JOIN telemetry_events te ON s.id = te.session_id
LEFT JOIN run_attempts ra ON s.id = ra.session_id
LEFT JOIN ces_scores ces ON s.id = ces.session_id
WHERE s.status = 'active'
GROUP BY s.id;


-- View: Behavioral red flags
CREATE VIEW IF NOT EXISTS v_behavioral_alerts AS
SELECT 
    bf.session_id,
    s.student_id,
    s.activity_title,
    bf.flag_type,
    bf.severity,
    bf.flagged_at,
    CASE 
        WHEN bf.is_spamming THEN 'Spamming/Gaming Detected'
        WHEN bf.is_suspected_paste THEN 'Suspected External Paste'
        WHEN bf.is_rapid_guessing THEN 'Rapid-Fire Guessing'
        WHEN bf.is_disengagement THEN 'Disengagement Detected'
        ELSE 'Other'
    END as alert_type
FROM behavioral_flags bf
JOIN sessions s ON bf.session_id = s.id
WHERE bf.severity IN ('warning', 'critical')
ORDER BY bf.flagged_at DESC;
