# Behavior Engine - Two-Pipeline Architecture

This module implements the core behavioral analysis system for student programming sessions.

## Overview

The Behavior Engine uses a **two-pipeline architecture** that processes raw telemetry data through four core detection algorithms to produce pedagogical insights about student engagement and code authenticity.

```
+---------------------------------------------------------------------+
|                        RAW TELEMETRY INPUT                          |
|                   (Four Detection Algorithms)                       |
+=====================================================================+
|                                                                     |
|  Algorithm 1: IDLE DETECTION                                        |
|   +-- Monitors temporal gaps between keystroke/mouse events         |
|   +-- Identifies idle episodes for Idle Ratio (IR) metric           |
|                                                                     |
|  Algorithm 2: FOCUS VIOLATION DETECTION                             |
|   +-- Tracks window focus changes and app visibility                |
|   +-- Aggregates Focus Violation Count (FVC) metric                 |
|                                                                     |
|  Algorithm 3: KEYSTROKE BURST ANALYSIS                              |
|   +-- Examines short-term typing intensity in sliding windows       |
|   +-- Identifies anomalous input patterns (rapid key-mashing)       |
|                                                                     |
|  Algorithm 4: EDIT MAGNITUDE DETECTION                              |
|   +-- Quantifies code modification size (character differences)     |
|   +-- Detects potential copy-paste or external code                 |
|                                                                     |
+---------------------------------------------------------------------+
                                 |
                                 V
+-----------------------------------------------------------------------+
|                        DATA FUSION ENGINE                             |
|                      (Two Classification Pipelines)                   |
+-----------------------------------------------------------------------+

         +---------------------------------------------------+
         |  PIPELINE 1: PROVENANCE & AUTHENTICITY            |
         +===================================================+
         |  Algorithms: 2, 3, 4                              |
         |                                                   |
         |  Synthesizes:                                     |
         |   * Keystroke activity (Algorithm 3)              |
         |   * Edit magnitude (Algorithm 4)                  |
         |   * Focus violations (Algorithm 2)                |
         |                                                   |
         |  Classifications:                                 |
         |   + AUTHENTIC_REFACTORING (default)               |
         |     - Incremental, keystroke-supported edits      |
         |     - Stable window focus                         |
         |   ! AMBIGUOUS_EDIT                                |
         |     - Large insertions, moderate activity         |
         |   x SUSPECTED_PASTE                               |
         |     - Large insertions + sparse keystrokes        |
         |     - Concurrent focus violations                 |
         |   x SPAMMING                                      |
         |     - High keystroke volume, negligible output    |
         |                                                   |
         |  Outputs:                                         |
         |   -> provenance_state                             |
         |   -> integrity_penalty (0.0 to 1.0)               |
         |   -> effective_kpm (spam-filtered)                |
         |                                                   |
         |  Impact: Code changes validated, down-weighted,   |
         |          or excluded from engagement computation  |
         +---------------------------------------------------+

         +---------------------------------------------------+
         |  PIPELINE 2: COGNITIVE STATE CONTINUITY           |
         +===================================================+
         |  Algorithms: 1, 2                                 |
         |                                                   |
         |  Synthesizes:                                     |
         |   * Idle duration (Algorithm 1)                   |
         |   * Focus status (Algorithm 2)                    |
         |   * Execution outcomes                            |
         |                                                   |
         |  Classifications:                                 |
         |   + ACTIVE (default)                              |
         |     - Normal coding flow (idle < 30s)             |
         |   + REFLECTIVE_PAUSE                              |
         |     - Post-error deliberation (30-120s)           |
         |     - Window focused, recent error                |
         |     - Treated as beneficial thinking              |
         |   ! PASSIVE_IDLE                                  |
         |     - Unproductive stalling (30-120s)             |
         |     - No error context                            |
         |   x DISENGAGEMENT                                 |
         |     - Sustained absence (>120s or unfocused)      |
         |                                                   |
         |  Outputs:                                         |
         |   -> cognitive_state                              |
         |   -> effective_ir (adjusted idle time)            |
         |                                                   |
         |  Impact: Determines if idle time contributes to   |
         |          penalties or is treated as neutral       |
         +---------------------------------------------------+

                                 |
                                 V
                    +------------------------+
                    |   FUSION INSIGHTS      |
                    +========================+
                    | * provenance_state     |
                    | * cognitive_state      |
                    | * effective_kpm        |
                    | * effective_ad         |
                    | * effective_ir         |
                    | * integrity_penalty    |
                    +------------------------+
                                 |
                                 V
                    +------------------------+
                    |   CES CALCULATOR       |
                    |  (Final Score 0-1)     |
                    +------------------------+

```

## File Structure

### Core Modules

- **`data_fusion.py`** - Implements both classification pipelines and all four detection algorithms
- **`ces_calculator.py`** - Computes the final Cognitive Engagement Score by integrating pipeline outputs
- **`metrics.py`** - Data transfer object (DTO) for raw telemetry data

## Pipeline Details

### Pipeline 1: Provenance & Authenticity

**Purpose**: Analyzes patterns of code authorship by synthesizing keystroke activity, edit magnitude, and focus violations around code changes.

**Key Logic**:
- Incremental, keystroke-supported edits with stable focus -> **AUTHENTIC**
- Large insertions (>30 chars) with sparse keystrokes -> **SUSPECTED_PASTE**
- High keystroke volume (>200) with low efficiency (<0.05) -> **SPAMMING**

**Impact**: 
- Validated code: No penalty
- Down-weighted code: Moderate scrutiny
- Excluded code: Integrity penalty applied (reduces CES score)

### Pipeline 2: Cognitive State Continuity

**Purpose**: Evaluates temporal interaction patterns to differentiate active work, reflective pauses, and disengagement.

**Key Logic**:
- Idle < 30s -> **ACTIVE** (default state)
- Idle 30-120s + focused + recent error -> **REFLECTIVE_PAUSE** (excluded from penalties)
- Idle 30-120s + focused + no error -> **PASSIVE_IDLE** (contributes to penalties)
- Idle >120s or unfocused -> **DISENGAGEMENT** (severe penalty)

**Impact**:
- Reflective pauses: Idle time treated as neutral/beneficial
- Passive idle: Idle time contributes to penalties
- Disengagement: Heavy penalty on Idle Ratio

## Domain Context

All thresholds are calibrated for:
- **Target**: Novice programmers (Programming 1-2 level)
- **Problem Type**: LeetCode-style algorithmic exercises (20-80 LOC)
- **Session Duration**: 15-60 minutes per problem
- **Typical Solution Size**: 250-500 characters

⚠️ **Important**: These thresholds should NOT be assumed generalizable to professional development or large-scale projects.

## Usage

```python
from app.services.behavior_engine.data_fusion import DataFusionEngine
from app.services.behavior_engine.ces_calculator import CESCalculator
from app.services.behavior_engine.metrics import SessionMetrics

# 1. Create metrics from raw telemetry
metrics = SessionMetrics(
    duration_minutes=15.0,
    total_keystrokes=450,
    total_run_attempts=5,
    total_idle_minutes=3.0,
    focus_violation_count=2,
    net_code_change=180,
    last_edit_size_chars=25,
    last_run_interval_seconds=45.0,
    is_semantic_change=True,
    current_idle_duration=10.0,
    is_window_focused=True,
    last_run_was_error=True,
    recent_burst_size_chars=15
)

# 2. Run through Data Fusion Engine (both pipelines)
fusion_engine = DataFusionEngine()
insights = fusion_engine.analyze(metrics)

# 3. Compute final CES score
ces_calculator = CESCalculator()
result = ces_calculator.calculate(metrics, insights)

print(f"CES Score: {result['ces']}")
print(f"Classification: {result['classification']}")
print(f"Provenance: {insights.provenance_state}")
print(f"Cognitive State: {insights.cognitive_state}")
```

## Integration with Frontend

The frontend [CodePlayground.tsx](../../../frontend/src/pages/CodePlayground.tsx) captures raw telemetry data through:
- **Algorithm 1**: Idle timer tracking
- **Algorithm 2**: Window blur/focus event listeners
- **Algorithm 3**: Keystroke counters
- **Algorithm 4**: Edit size calculation on code changes

This raw data is sent to `/api/telemetry/analyze` which runs it through both pipelines and returns the computed insights.

## See Also

- [Data Fusion Implementation](data_fusion.py) - Core algorithm implementation
- [CES Calculator](ces_calculator.py) - Final score computation
- [API Endpoint](../../api/endpoints/telemetry.py) - HTTP interface for telemetry processing
