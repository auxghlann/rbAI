from dataclasses import dataclass

@dataclass
class SessionMetrics:
    """
    DTO that holds the RAW telemetry data for processing by the four core algorithms.
    
    This data structure feeds into the Data Fusion Framework' Event Detection Algorithms, which
    synthesizes these raw metrics to derive higher-level insights about user behavior:

    1. IDLE DETECTION ALGORITHM - Uses current_idle_duration and total_idle_minutes
    2. FOCUS VIOLATION DETECTION ALGORITHM - Uses focus_violation_count and is_window_focused
    3. KEYSTROKE BURST ANALYSIS ALGORITHM - Uses total_keystrokes and recent_burst_size_chars
    4. EDIT MAGNITUDE DETECTION ALGORITHM - Uses last_edit_size_chars and net_code_change
    """
    # Base Metrics
    duration_minutes: float
    total_keystrokes: int  # Input for ALGORITHM 3: Keystroke Burst Analysis
    total_run_attempts: int
    total_idle_minutes: float  # Output from ALGORITHM 1: Idle Detection
    focus_violation_count: int  # Aggregated output from ALGORITHM 2: Focus Violation Detection
    net_code_change: int  # Used by ALGORITHM 4: Edit Magnitude Detection
    
    # --- ALGORITHM-SPECIFIC FIELDS ---
    # ALGORITHM 4: EDIT MAGNITUDE DETECTION ALGORITHM
    last_edit_size_chars: int  # Size of most recent code modification (character difference)
    
    # Iteration Detection (not in the four core algorithms from paper)
    last_run_interval_seconds: float
    is_semantic_change: bool
    
    # ALGORITHM 1: IDLE DETECTION ALGORITHM
    current_idle_duration: float  # Current idle episode duration in seconds
    
    # ALGORITHM 2: FOCUS VIOLATION DETECTION ALGORITHM  
    is_window_focused: bool  # Current window focus state
    
    # Supporting context
    last_run_was_error: bool
    
    # ALGORITHM 3: KEYSTROKE BURST ANALYSIS ALGORITHM
    recent_burst_size_chars: int = 0  # Keystrokes in recent 5-second sliding window
