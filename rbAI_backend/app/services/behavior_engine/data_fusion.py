"""
================================================================================
DATA FUSION ENGINE - Core Detection Algorithms Implementation
================================================================================

This module implements the four core behavioral detection algorithms described
in the research paper for analyzing student programming behavior:

1. IDLE DETECTION ALGORITHM
   Monitors temporal gaps between keystroke and mouse events. When the inter-event
   interval exceeds a calibrated threshold, the system marks an idle episode. These
   episodes provide the primary signal for the Idle Ratio (IR) metric and for
   distinguishing reflective pauses from prolonged disengagement.

2. FOCUS VIOLATION DETECTION ALGORITHM
   Tracks application visibility and window focus changes. Each transition in which
   the programming environment loses foreground focus is recorded as a focus violation.
   Aggregated counts form the Focus Violation Count (FVC) metric and support inferences
   about off-task behavior or the use of external resources.

3. KEYSTROKE BURST ANALYSIS ALGORITHM
   Examines short-term typing intensity within sliding time windows. By characterizing
   local keystroke density and burstiness, this algorithm highlights anomalous input
   patterns (e.g., rapid key-mashing or automated input) that may inflate productivity-
   related metrics without corresponding cognitive effort.

4. EDIT MAGNITUDE DETECTION ALGORITHM
   Quantifies the size of code modifications by computing the absolute character
   difference between consecutive editor states. The output of this algorithm serves
   as indicators of potential copy-paste or externally generated code.

================================================================================
TWO-PIPELINE ARCHITECTURE
================================================================================

These four algorithms are organized into two classification pipelines:

+-----------------------------------------------------------------------------+
| PIPELINE 1: PROVENANCE AND AUTHENTICITY PIPELINE                            |
+=============================================================================+
| Purpose: Analyzes patterns of code authorship by synthesizing keystroke    |
|          activity, edit magnitude, and focus violations around code changes.|
|                                                                             |
| Algorithms Used:                                                            |
|  * Algorithm 2: Focus Violation Detection (concurrent tab switches)         |
|  * Algorithm 3: Keystroke Burst Analysis (keystroke density patterns)       |
|  * Algorithm 4: Edit Magnitude Detection (size of code modifications)       |
|                                                                             |
| Classification States:                                                      |
|  * AUTHENTIC_REFACTORING (default) - Incremental, keystroke-supported edits |
|                                      with stable focus                      |
|  * AMBIGUOUS_EDIT - Large insertions with moderate keystroke activity       |
|  * SUSPECTED_PASTE - Large insertions with sparse keystrokes + focus        |
|                      violations (suspected external assistance)             |
|  * SPAMMING - High keystroke volume with negligible code retention          |
|               (system gaming)                                               |
|                                                                             |
| Impact: Specific code changes may be validated, down-weighted, or excluded  |
|         from engagement computation via integrity_penalty.                  |
+-----------------------------------------------------------------------------+

+-----------------------------------------------------------------------------+
| PIPELINE 2: COGNITIVE STATE CONTINUITY PIPELINE                             |
+=============================================================================+
| Purpose: Evaluates temporal interaction patterns to differentiate active    |
|          work, reflective pauses, and disengagement.                        |
|                                                                             |
| Algorithms Used:                                                            |
|  * Algorithm 1: Idle Detection (temporal gaps in activity)                  |
|  * Algorithm 2: Focus Violation Detection (window focus status)             |
|                                                                             |
| Integration Context:                                                        |
|  * Idle duration (primary signal)                                           |
|  * Recent activity history (execution outcomes)                             |
|  * Focus status (window focused vs. alt-tabbed)                             |
|  * Execution outcomes (error-inducing runs)                                 |
|                                                                             |
| Classification States:                                                      |
|  * ACTIVE (default) - Normal coding flow, idle < 30s                        |
|  * REFLECTIVE_PAUSE - Post-error deliberation (30-120s, focused, after      |
|                       error) - treated as neutral/beneficial                |
|  * PASSIVE_IDLE - Unproductive stalling (30-120s, focused, no error         |
|                   context) - contributes to penalties                       |
|  * DISENGAGEMENT - Sustained absence (>120s or unfocused) - abandonment     |
|                                                                             |
| Impact: Determines whether idle time contributes to penalties (PASSIVE_IDLE,|
|         DISENGAGEMENT) or is treated as neutral/beneficial (REFLECTIVE_PAUSE|
+-----------------------------------------------------------------------------+

Domain Context:
- Target: Novice programmers (Programming 1-2 level)
- Problem Type: LeetCode-style algorithmic exercises (20-80 LOC)
- Session Duration: 15-60 minutes per problem

All thresholds are calibrated specifically for this domain and validated through
evolutionary prototyping.
================================================================================
"""

from dataclasses import dataclass
from enum import Enum
from app.services.behavior_engine.metrics import SessionMetrics

# --- DEFINING THE ENUMS (The Standardized Flags) ---

class ProvenanceState(str, Enum):
    AUTHENTIC_REFACTORING = "Authentic Refactoring"
    AMBIGUOUS_EDIT = "Ambiguous Large Edit"
    SUSPECTED_PASTE = "Suspected External Paste"
    SPAMMING = "Spamming"

class CognitiveState(str, Enum):
    ACTIVE = "Active"
    REFLECTIVE_PAUSE = "Reflective Pause"
    PASSIVE_IDLE = "Passive Idle"
    DISENGAGEMENT = "Disengagement"

# --- CORE ALGORITHM ---

@dataclass
class FusionInsights:
    """
    Carries the Qualitative Pedagogical Insights derived from Data Fusion.
    
    This structure encapsulates outputs from BOTH classification pipelines:
    
    From PIPELINE 1 (Provenance & Authenticity):
    - provenance_state: Classification of code authorship patterns
    - integrity_penalty: Penalty for suspected dishonesty (0.0 to 1.0)
    - effective_kpm: Keystroke metrics after spam/burst filtering
    
    From PIPELINE 2 (Cognitive State Continuity):
    - cognitive_state: Classification of temporal interaction patterns
    - effective_ir: Idle ratio after reflective pause adjustments
    
    Shared:
    - effective_ad: Attempt density (not adjusted by pipelines)
    """
    provenance_state: ProvenanceState
    cognitive_state: CognitiveState
    
    # Effective Metrics
    effective_kpm: float
    effective_ad: float
    effective_ir: float
    integrity_penalty: float

class DataFusionEngine:
    """
    Implements the Two-Pipeline Behavioral Analysis Architecture.
    
    +----------------------------------------------------------------------+
    |                        DATA FUSION ENGINE                            |
    +======================================================================+
    |                                                                      |
    |  Raw Telemetry Input (4 Detection Algorithms)                       |
    |  +-- Algorithm 1: Idle Detection                                    |
    |  +-- Algorithm 2: Focus Violation Detection                         |
    |  +-- Algorithm 3: Keystroke Burst Analysis                          |
    |  +-- Algorithm 4: Edit Magnitude Detection                          |
    |                                                                      |
    +======================================================================+
    |                                                                      |
    |  PIPELINE 1: Provenance & Authenticity                              |
    |  +----------------------------------------------------------+       |
    |  | Uses: Algorithms 2, 3, 4                                 |       |
    |  | Synthesizes:                                             |       |
    |  |  * Keystroke activity (Alg 3)                            |       |
    |  |  * Edit magnitude (Alg 4)                                |       |
    |  |  * Focus violations (Alg 2)                              |       |
    |  | Outputs:                                                 |       |
    |  |  -> provenance_state (4 classifications)                 |       |
    |  |  -> integrity_penalty (0.0 to 1.0)                       |       |
    |  |  -> effective_kpm (spam-filtered)                        |       |
    |  +----------------------------------------------------------+       |
    |                                                                      |
    |  PIPELINE 2: Cognitive State Continuity                             |
    |  +----------------------------------------------------------+       |
    |  | Uses: Algorithms 1, 2                                    |       |
    |  | Synthesizes:                                             |       |
    |  |  * Idle duration (Alg 1)                                 |       |
    |  |  * Focus status (Alg 2)                                  |       |
    |  |  * Execution outcomes                                    |       |
    |  | Outputs:                                                 |       |
    |  |  -> cognitive_state (4 classifications)                  |       |
    |  |  -> effective_ir (adjusted idle time)                    |       |
    |  +----------------------------------------------------------+       |
    |                                                                      |
    +----------------------------------------------------------------------+
                                    |
                         FusionInsights (to CES Calculator)
    
    Domain Context:
    - Target: Novice programmers solving LeetCode-style algorithmic problems
    - Problem Size: 20-80 lines of code (1,500-2,500 characters typical solution)
    - Session Duration: 15-60 minutes per problem
    - User Characteristics: Programming 1-2 level students with limited syntax fluency
    
    All thresholds below are calibrated for this specific domain and should NOT be
    assumed generalizable to professional development or large-scale projects.
    """

    # =====================================================================
    # DOMAIN-CALIBRATED THRESHOLDS (Thesis Section 1.1.1)
    # =====================================================================
    
    # Provenance Detection
    # ================================================================
    # ALGORITHM 4: EDIT MAGNITUDE DETECTION ALGORITHM
    # ================================================================
    # Quantifies the size of code modifications by computing the absolute character
    # difference between consecutive editor states. The output of this algorithm
    # serves as indicators of potential copy-paste or externally generated code.
    LARGE_INSERTION_THRESHOLD = 30  
    # Justification: For novice solutions (250-500 chars typical), 30 chars represents
    # 6-12% of solution inserted at once. Typical incremental edits by novices
    # are 5-15 characters (partial lines). Exceeding this suggests bulk transfer.
    
    # ================================================================
    # ALGORITHM 3: KEYSTROKE BURST ANALYSIS ALGORITHM
    # ================================================================
    # Examines short-term typing intensity within sliding time windows. By
    # characterizing local keystroke density and burstiness, this algorithm
    # highlights anomalous input patterns (e.g., rapid key-mashing or automated
    # input) that may inflate productivity-related metrics without corresponding
    # cognitive effort.
    BURST_TYPING_MIN = 50  # characters
    BURST_TYPING_MAX = 100  # characters
    # Justification: Detects rapid continuous input (50-100 chars in short bursts).
    # Atypical for novice reflective workflows; indicates potential metric inflation
    # or non-cognitive key-mashing activity.
    
    SPAM_KEYSTROKE_MINIMUM = 200
    SPAM_EFFICIENCY_THRESHOLD = 0.05
    # Justification: Efficiency ratio = net_code_change / total_keystrokes.
    # Novices exhibit trial-and-error with ratios ~0.20-0.40. Values <0.05
    # indicate meaningless key-mashing without productive intent.
    
    # Cognitive State
    # ================================================================
    # ALGORITHM 1: IDLE DETECTION ALGORITHM
    # ================================================================
    # Monitors temporal gaps between keystroke and mouse events. When the inter-event
    # interval exceeds a calibrated threshold, the system marks an idle episode.
    # These episodes provide the primary signal for the Idle Ratio (IR) metric and
    # for distinguishing reflective pauses from prolonged disengagement.
    REFLECTIVE_PAUSE_MIN = 30  # seconds
    DISENGAGEMENT_THRESHOLD = 120  # seconds (revised from 30s)
    # Justification: Idle detection standardized to 120 seconds. Novices require 
    # 30-120s post-error to parse messages and plan corrections. <30s = normal flow.
    # 30-120s + error context = reflective pause (valid). >120s = disengagement.

    def analyze(self, metrics: SessionMetrics) -> FusionInsights:
        """
        Performs multi-dimensional behavioral analysis on raw session telemetry.
        
        Implements the TWO-PIPELINE ARCHITECTURE:
        
        PIPELINE 1: PROVENANCE AND AUTHENTICITY
        +-- Synthesizes: Keystroke activity + Edit magnitude + Focus violations
        +-- Detects: Copy-paste vs authentic coding patterns
        +-- Output: Provenance classification + Integrity penalty
        
        PIPELINE 2: COGNITIVE STATE CONTINUITY
        +-- Synthesizes: Idle duration + Focus status + Execution outcomes
        +-- Differentiates: Active work vs reflective pauses vs disengagement
        +-- Output: Cognitive state + Adjusted idle time
        
        Args:
            metrics: Raw telemetry data from novice programming session
        
        Returns:
            FusionInsights containing:
            - Provenance state (Pipeline 1 classification)
            - Cognitive state (Pipeline 2 classification)
            - Adjusted "effective" metrics (cleaned metrics reflecting authentic behavior)
            - Integrity penalty (0.0 to 1.0) for suspected dishonesty
        
        Domain Assumptions:
        - Short-form problems (20-80 LOC solutions)
        - Novice programmers (Programming 1-2 level)
        - Session duration 15-60 minutes
        """
        
        # ═════════════════════════════════════════════════════════════════════════════
        # PIPELINE 1: PROVENANCE AND AUTHENTICITY PIPELINE
        # ═════════════════════════════════════════════════════════════════════════════
        # Analyzes patterns of code authorship by synthesizing keystroke activity,
        # edit magnitude, and focus violations around code changes. Incremental,
        # keystroke-supported edits with stable focus are classified as authentic
        # refactoring (default state), while large insertions with sparse keystrokes
        # or concurrent focus violations are flagged as suspected external assistance
        # or system gaming.
        #
        # Based on these classifications, specific code changes may be:
        #  * VALIDATED (authentic refactoring) - No penalty
        #  * DOWN-WEIGHTED (ambiguous edits) - Moderate scrutiny
        #  * EXCLUDED (suspected paste/spam) - Integrity penalty applied
        # ═════════════════════════════════════════════════════════════════════════════
        
        # --- 1. PROVENANCE & AUTHENTICITY ---
        
        # IMPORTANT: This analysis is STATELESS and evaluates CURRENT behavior only.
        # Each telemetry update gets a fresh evaluation. Previous flags don't carry over.
        # Small legitimate edits after a large insertion will return to AUTHENTIC_REFACTORING.
        
        # Default State (assume legitimate until proven otherwise)
        provenance = ProvenanceState.AUTHENTIC_REFACTORING
        integrity_penalty = 0.0
        
        raw_kpm = metrics.total_keystrokes / metrics.duration_minutes if metrics.duration_minutes > 0 else 0
        
        # ================================================================
        # ALGORITHM 4: EDIT MAGNITUDE DETECTION ALGORITHM (Implementation)
        # ================================================================
        # Analyzes the size of code modifications to detect copy-paste behavior
        # Logic Tree: Large Insertions
        # Context: For novices solving short problems (250-500 chars), 30-char insertions
        # represent 6-12% of solution added at once, atypical for incremental construction
        # NOTE: Small edits (<30 chars) will skip this check and remain AUTHENTIC_REFACTORING
        if metrics.last_edit_size_chars > self.LARGE_INSERTION_THRESHOLD:
            # Calculate keystroke density: how many keystrokes were used to create the current code
            # If last_edit_size is 100 chars but only 10 keystrokes in recent window, likely pasted
            keystroke_to_insertion_ratio = metrics.recent_burst_size_chars / metrics.last_edit_size_chars if metrics.last_edit_size_chars > 0 else 0
            
            # STRICTER: Suspect paste ONLY if multiple strong indicators present
            # Must have: (1) Very low keystroke ratio (<20%) AND (2) Focus violations AND (3) Large edit (>50 chars)
            # ================================================================
            # ALGORITHM 2: FOCUS VIOLATION DETECTION ALGORITHM (Used Here)
            # ================================================================
            # Tracks application visibility and window focus changes. Each transition
            # in which the programming environment loses foreground focus is recorded
            # as a focus violation. Combined with edit magnitude for paste detection.
            if (keystroke_to_insertion_ratio < 0.2 and 
                metrics.focus_violation_count > 0 and 
                metrics.last_edit_size_chars > 50):
                # Pattern: Very large insertion + tab-switch + extremely low keystroke density
                # Interpretation: Strong evidence of copy-paste from external source
                provenance = ProvenanceState.SUSPECTED_PASTE
                integrity_penalty = 0.5
            # Alternative: Large insertion with high keystroke efficiency
            elif keystroke_to_insertion_ratio > 0.8:
                # Pattern: Large insertion + high keystroke density (typed it)
                # Interpretation: Authentic refactoring/rewrite
                provenance = ProvenanceState.AUTHENTIC_REFACTORING
            else:
                # Pattern: Large insertion + moderate activity
                # Interpretation: Uncertain—could be internal block move/paste or fast typing
                provenance = ProvenanceState.AMBIGUOUS_EDIT

        # Logic Tree: Spam Check & Additional Paste Detection
        # Context: Novices typically achieve efficiency ratios of 0.20-0.40
        # due to trial-and-error. Ratios <0.05 suggest random key-mashing.
        efficiency_ratio = metrics.net_code_change / metrics.total_keystrokes if metrics.total_keystrokes > 50 else 1.0
        
        # ================================================================
        # ALGORITHM 3: KEYSTROKE BURST ANALYSIS ALGORITHM (Detection Logic)
        # ================================================================
        # Identifies rapid typing patterns that indicate non-reflective input behavior
        # Check for burst typing/spamming
        is_burst_typing = (self.BURST_TYPING_MIN <= metrics.recent_burst_size_chars <= self.BURST_TYPING_MAX)
        
        # Additional paste detection: VERY strict to avoid false positives
        # Only flag if there's EXTREME evidence: lots of code, very few keystrokes, multiple focus violations
        if (metrics.net_code_change > 200 and 
            metrics.total_keystrokes < metrics.net_code_change * 0.3 and 
            metrics.focus_violation_count > 1 and
            provenance not in [ProvenanceState.SUSPECTED_PASTE, ProvenanceState.SPAMMING]):
            # Pattern: Lots of code exists but extremely few keystrokes + multiple tab switches
            # Interpretation: Code was likely pasted in multiple chunks
            provenance = ProvenanceState.SUSPECTED_PASTE
            integrity_penalty = 0.5
        
        if metrics.total_keystrokes > self.SPAM_KEYSTROKE_MINIMUM and efficiency_ratio < self.SPAM_EFFICIENCY_THRESHOLD:
            # Detected: High keystroke volume with negligible code retention
            # Action: Nullify KPM contribution to prevent score inflation
            effective_kpm = 0.0
            provenance = ProvenanceState.SPAMMING
        elif is_burst_typing and efficiency_ratio < 0.15:
            # Detected: Burst typing pattern with low efficiency
            # Action: Flag as potential spamming/gaming behavior
            effective_kpm = raw_kpm * 0.5  # Apply 50% penalty
            provenance = ProvenanceState.SPAMMING
        else:
            effective_kpm = raw_kpm


        # --- 2. ATTEMPT DENSITY ---
        
        # Use raw run attempts without penalties or adjustments
        effective_ad = metrics.total_run_attempts / metrics.duration_minutes if metrics.duration_minutes > 0 else 0


        # ═════════════════════════════════════════════════════════════════════════════
        # PIPELINE 2: COGNITIVE STATE CONTINUITY PIPELINE
        # ═════════════════════════════════════════════════════════════════════════════
        # Evaluates temporal interaction patterns to differentiate active work (default),
        # reflective pauses, and disengagement. This pipeline integrates idle duration,
        # recent activity history, focus status, and execution outcomes (e.g., repeated
        # rapid error-inducing runs) to determine whether a given interval reflects:
        #  * PRODUCTIVE THINKING (reflective pause) - Idle time treated as neutral/beneficial
        #  * TRANSIENT HESITATION (passive idle) - Idle time contributes to penalties
        #  * ABANDONMENT (disengagement) - Severe penalty
        #
        # Resulting states guide whether idle time contributes to penalties or is
        # treated as neutral/beneficial reflection.
        # ═════════════════════════════════════════════════════════════════════════════

        # --- 3. COGNITIVE STATE  ---
        
        cognitive = CognitiveState.ACTIVE
        adjusted_idle_minutes = metrics.total_idle_minutes
        
        # ================================================================
        # ALGORITHM 1: IDLE DETECTION ALGORITHM (Classification Logic)
        # ================================================================
        # Evaluates idle episodes to distinguish reflective pauses from disengagement
        # Logic Tree: Idle Context
        # Context: Novices need 30-120s to parse errors and plan corrections
        if metrics.current_idle_duration > self.REFLECTIVE_PAUSE_MIN: 
            if not metrics.is_window_focused:
                # Pattern: Idle + window unfocused (alt-tabbed away)
                # Interpretation: Off-task behavior, distraction
                cognitive = CognitiveState.DISENGAGEMENT
            else:
                if metrics.last_run_was_error:
                    # Pattern: Idle + window focused + recent error
                    # Interpretation: Reading error messages, planning fix (VALID)
                    cognitive = CognitiveState.REFLECTIVE_PAUSE
                    # Reward: Exclude this pause from idle penalty
                    current_pause_min = metrics.current_idle_duration / 60
                    adjusted_idle_minutes = max(0, metrics.total_idle_minutes - current_pause_min)
                else:
                    # Pattern: Idle + window focused + no error context
                    # Interpretation: Unproductive stalling (writer's block)
                    cognitive = CognitiveState.PASSIVE_IDLE

        effective_ir = adjusted_idle_minutes / metrics.duration_minutes if metrics.duration_minutes > 0 else 0


        return FusionInsights(
            provenance_state=provenance,
            cognitive_state=cognitive,
            effective_kpm=effective_kpm,
            effective_ad=effective_ad,
            effective_ir=effective_ir,
            integrity_penalty=integrity_penalty
        )