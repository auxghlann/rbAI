from app.services.behavior_engine.metrics import SessionMetrics
from app.services.behavior_engine.data_fusion import FusionInsights

class CESCalculator:
    """
    Implements the Cognitive Engagement Score (CES) algorithm.
    
    The CES integrates outputs from both behavioral classification pipelines:
    
    +-----------------------------------------------------------------+
    | PIPELINE 1: Provenance & Authenticity -> integrity_penalty     |
    |  Controls whether code changes are validated, down-weighted,   |
    |  or excluded from engagement computation                       |
    +-----------------------------------------------------------------+
    
    +-----------------------------------------------------------------+
    | PIPELINE 2: Cognitive State Continuity -> effective_ir         |
    |  Determines whether idle time contributes to penalties or is   |
    |  treated as neutral/beneficial reflection                      |
    +-----------------------------------------------------------------+
    
    As a result, the CES reflects net productive engagement by combining:
    - Effective KPM (with spam keystrokes removed)
    - AD (Raw run attempts, as iterative testing is a valid learning style) 
    - Effective IR (with reflective pauses excluded)
    - FVC (raw focus violation count, as fusion logic does not adjust this)
    - Integrity Penalties (e.g., from suspected paste behavior)

    Domain Context:
    - Target Population: Novice programmers (Programming 1-2 level)
    - Problem Type: LeetCode-style algorithmic exercises (20-80 LOC)
    - Session Duration: 15-60 minutes per problem
    
    Thresholds calibrated specifically for this domain and validated
    through evolutionary prototyping.
    """

    # ---------------------------------------------------------
    # 1. HEURISTIC THRESHOLDS (BEING TUNED FOR PHASE 2)
    # ---------------------------------------------------------
    
    # KPM: Keystrokes Per Minute
    # ================================================================
    # Filtered by ALGORITHM 3: KEYSTROKE BURST ANALYSIS ALGORITHM
    # ================================================================
    # Keystroke counts are analyzed by Algorithm 3 to identify anomalous input
    # patterns. Spam keystrokes are filtered out before KPM calculation.
    MIN_KPM = 5.0 
    # Rationale: Lower bound for demonstrable engagement. Below this threshold
    # indicates disengagement vs. deliberation. Values below 5.0 indicate 
    # insufficient activity for novices in short-form algorithmic tasks.
    
    MAX_KPM = 24.0
    # Rationale: Upper bound for authentic manual typing (session average).
    # Values above 24.0 exceed realistic sustained manual entry for novices
    # in algorithmic problem-solving contexts.
    
    # AD: Attempt Density (Runs per Minute)
    MIN_AD = 0.05
    # Rationale: Minimum threshold = 1 run per 20 minutes. Below this indicates
    # lack of iterative testing or extremely slow problem-solving pace.
    
    MAX_AD = 0.50
    # Rationale: Maximum threshold = 1 run per 2 minutes. Capped here for
    # normalization stability.
    
    # Idle Ratio (IR)
    # ================================================================
    # Output from ALGORITHM 1: IDLE DETECTION ALGORITHM
    # ================================================================
    # The idle episodes detected by Algorithm 1 are aggregated into the Idle Ratio
    # metric, which represents the proportion of session time spent idle.
    MIN_IR = 0.0
    MAX_IR = 0.60
    # Rationale: Penalizes sessions where >60% of time is idle. For focused
    # problem-solving, idle time should not dominate active work. Reflective
    # pauses (post-error deliberation) are already excluded by DataFusionEngine.
    
    # FVC: Focus Violation Count
    # ================================================================
    # Output from ALGORITHM 2: FOCUS VIOLATION DETECTION ALGORITHM
    # ================================================================
    # The aggregated focus violation counts detected by Algorithm 2 form the
    # FVC metric and support inferences about off-task behavior.
    MIN_FVC = 0
    MAX_FVC = 10
    # Rationale: Caps penalty at 10 violations per session to prevent outlier
    # skewing. For 30-60 minute sessions, >10 tab switches suggests severe
    # multitasking or integrity concerns, but additional violations beyond
    # this point provide diminishing diagnostic value.
    
    # ---------------------------------------------------------
    # 2. WEIGHTS FOR METRIC COMPONENTS
    # ---------------------------------------------------------
    W_KPM = 0.35
    # Justification: Keystroke activity commands the largest weight as it is
    # the prerequisite for all code production. Without typing, no solution
    # exists; therefore, it represents the foundational signal of engagement.
    
    W_AD  = 0.25
    # Justification: Attempt Density reflects iterative problem-solving, a
    # validation step that follows the creation of a solution. While essential
    # for productive struggle, it remains secondary to the act of composing code.
    
    W_FVC = 0.25
    # Justification: Since everything is provided in the system (problem
    # description, guidance, code editing environment), the occurrence of tab
    # switching may indicate academic dishonesty and should be heavily penalized.
    
    W_IR  = 0.15
    # Justification: Idle Ratio acts as a moderate penalty. Its weight is
    # constrained because "thinking" and "idling" share the same behavioral
    # signature (inactivity).

    def calculate(self, metrics: SessionMetrics, insights: FusionInsights) -> dict:
        """
        Computes CES using FUSED insights (Effective Metrics).
        
        Process Flow:
        1. DataFusionEngine has already filtered raw telemetry:
           - Spam keystrokes removed from KPM
           - Reflective pauses excluded from IR
        2. This function normalizes the CLEANED metrics and applies weights
        3. Final CES represents net productive engagement (-1.0 to 1.0)
        
        Args:
            metrics: Raw session telemetry (for FVC, which is not adjusted)
            insights: Fused behavioral insights with effective metrics
        
        Returns:
            dict containing:
            - ces_score: Final engagement score (-1.0 to 1.0)
            - grade_label: Human-readable classification
            - pedagogical_states: Qualitative behavior flags
            - metrics_debug: Effective metric values for transparency
        """
        
        # --- USE FUSED "EFFECTIVE" DATA ---
        # ================================================================
        # INTEGRATION OF ALL FOUR ALGORITHMS
        # ================================================================
        # The DataFusionEngine has already processed raw telemetry through all four algorithms:
        # 1. IDLE DETECTION: Reflective pauses excluded from IR
        # 2. FOCUS VIOLATION: Counts aggregated in FVC metric
        # 3. KEYSTROKE BURST: Spam keystrokes removed from KPM
        # 4. EDIT MAGNITUDE: Used to detect paste behavior and adjust integrity penalty
        # We use the CLEAN "effective" metrics for CES calculation
        
        # 1. Normalize Effective KPM (Spam removed by Algorithm 3)
        kpm_norm = self._normalize(insights.effective_kpm, self.MIN_KPM, self.MAX_KPM)
        
        # 2. Normalize Effective AD (Raw run attempts)
        ad_norm  = self._normalize(insights.effective_ad, self.MIN_AD, self.MAX_AD)
        
        # 3. Normalize Effective IR (Reflective pauses excluded by DataFusionEngine)
        ir_norm  = self._normalize(insights.effective_ir, self.MIN_IR, self.MAX_IR)
        
        # 4. Normalize FVC (Raw count - not adjusted by fusion logic)
        fvc_norm = self._normalize(metrics.focus_violation_count, self.MIN_FVC, self.MAX_FVC)

        # --- CALCULATE FINAL SCORE ---
        # Productive Vector: Keystrokes + Run Attempts (positive contribution)
        productive_score = (self.W_KPM * kpm_norm) + (self.W_AD * ad_norm)
        
        # Disengagement Vector: Idle Time + Focus Violations (negative contribution)
        penalty_score    = (self.W_IR * ir_norm) + (self.W_FVC * fvc_norm)
        
        # Net Engagement = Productivity - Penalties
        final_ces = productive_score - penalty_score

        # Apply Integrity Penalty 
        # e.g., SUSPECTED_PASTE adds 0.5 penalty, further reducing CES
        final_ces -= insights.integrity_penalty

        # Clamp result to valid range (-1.0 to 1.0)
        final_ces = max(-1.0, min(1.0, final_ces))

        return {
            # Basic metrics (needed by telemetry endpoint)
            "kpm": round(insights.effective_kpm, 2),
            "ad": round(insights.effective_ad, 4),
            "ir": round(insights.effective_ir, 2),
            
            # CES Score (needed by telemetry endpoint)
            "ces": round(final_ces, 4),
            "classification": self._get_label(final_ces),
            
            # Legacy keys for backward compatibility
            "ces_score": round(final_ces, 4),
            "grade_label": self._get_label(final_ces),
            
            # Since our Enums inherit from str, they serialize to JSON automatically!
            "pedagogical_states": {
                "provenance": insights.provenance_state,
                "cognitive": insights.cognitive_state
            },
            "metrics_debug": {
                "kpm_effective": round(insights.effective_kpm, 2),
                "ad_effective": round(insights.effective_ad, 4),
                "ir_effective": round(insights.effective_ir, 2)
            }
        }

    def _normalize(self, value, min_val, max_val):
        """
        Min-Max normalization to [0, 1] scale.
        
        Ensures all metrics (KPM, AD, IR, FVC) are dimensionless and comparable
        despite having vastly different raw scales (e.g., keystrokes vs. counts).
        
        Args:
            value: Raw metric value
            min_val: Minimum expected value (maps to 0.0)
            max_val: Maximum expected value (maps to 1.0)
        
        Returns:
            Normalized value clamped to [0.0, 1.0]
        """
        if max_val - min_val == 0: 
            return 0.0
        norm = (value - min_val) / (max_val - min_val)
        return max(0.0, min(1.0, norm))

    def _get_label(self, score):
        """
        Maps continuous CES score to qualitative engagement classification.
        
        Thresholds based on Table 3 (Thesis Section 1.3.1):
        - High Engagement (>0.50): Sustained productivity, fluid coding
        - Moderate Engagement (0.20-0.50): Steady progress with pauses
        - Low Engagement (0.00-0.20): Minimal activity, hesitation
        - Disengaged/At-Risk (≤0.00): Dominated by penalties/integrity flags
        """
        if score > 0.5: return "High Engagement"
        if score > 0.2: return "Moderate Engagement"
        if score > 0.0: return "Low Engagement"
        return "Disengaged/At-Risk"