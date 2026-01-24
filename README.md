# Project rbAI: Development Context & Logic Specifications

## 🚀 Quick Start

### Docker Compose (Recommended)
Run both frontend and backend with one command:
```bash
docker-compose up --build
```
See [DOCKER_QUICK_START.md](DOCKER_QUICK_START.md) for details.

### Manual Setup
- **Frontend**: See [rbAI/README.md](rbAI/README.md)
- **Backend**: See [rbAI_backend/README.md](rbAI_backend/README.md)

---

## 1. System Overview
**rbAI** is a behavior-monitored coding playground designed for novice programmers. It utilizes a **Design and Development Research (DDR)** approach combined with a quantitative descriptive–evaluative design.

* **Frontend:** React (v19.2) with Monaco Editor (v0.52.2), non-blocking event listeners.
* **Backend:** Python FastAPI (v0.115+), SQLite (v3).
* **Core Function:** Real-time tracking of behavioral metrics to calculate a **Cognitive Engagement Score (CES)** and a **Pedagogical Firewall** to mediate AI interactions.

---

## 2. Behavioral Monitoring Algorithms (The "Signals")

The system monitors five raw constructs plus one derived efficiency metric. These are captured via frontend event listeners and processed in the backend.

### A. Raw Metrics Definitions
1. **Keystrokes Per Minute (KPM):**
   * *Formula:* `Total Keystrokes / Active Minutes`
   * *Bounds:* Min 5.0, Max 24.0 (Session Average).
   
2. **Attempt Density (AD):**
   * *Formula:* `Total Run Attempts / Session Duration`
   * *Bounds:* Min 0.05, Max 0.50.
   
3. **Idle Ratio (IR):**
   * *Formula:* `Total Idle Time / Session Duration`
   * *Idle Definition:* No input > **120 seconds** (revised from 30s).
   * *Bounds:* Min 0.00, Max 0.60.
   
4. **Focus Violation Count (FVC):**
   * *Definition:* Count of `blur` or `visibilitychange` events (tab switching).
   * *Bounds:* Min 0, Max 10.
   
5. **Code State Diffing (ΔCode):**
   * *Trigger:* Captures snapshot on every "Run" or "Submit" click.
   * *Logic:* Uses Myers' Diff + AST Comparison.
   * *Semantic Change:* Changes to control flow, function calls, variable assignments, logic.
   * *Non-Semantic:* Whitespace, comments, variable renaming.

6. **Editing Efficiency Ratio:**
   * *Formula:* `Net Code Retained / Total Keystrokes`
   * *Purpose:* Distinguishes productive editing from excessive non-retentive input (e.g., spam).

### B. Real-Time Detection Logic
* **Idle Detection:** Loop runs at 1s intervals. Logs idle event if `last_activity > 120s` (revised threshold).
* **Keystroke Burst Analysis:** Sliding window (5 seconds).
  * *High Engagement:* > 10 keystrokes / 5s.
  * *Low Engagement:* < 2 keystrokes / 5s.
* **Run-Attempt Timeline:** Tracks `Turnaround Time (TAT)` (time between runs).
  * *Threshold:* < 10 seconds is considered "Rapid."

---

## 3. Threshold Calibration for Novice Programmers

All thresholds are calibrated specifically for **short-form algorithmic tasks** with:
- **Expected solution length:** 250–500 characters
- **Completion time:** 15–60 minutes
- **Target population:** Novice programmers (Programming 1–2 level)

| Behavioral Dimension | Metric / Indicator | Threshold Value(s) | Operational Interpretation |
|----------------------|--------------------|--------------------|----------------------------|
| **Typing Activity** | Keystrokes per Minute (KPM) | 5.0 – 24.0 (session average) | Values below 5.0 indicate insufficient activity; above 24.0 exceeds realistic sustained manual entry for novices. |
| **Large Insertions** | Single-edit insertion size | **> 30 characters** (revised from 100) | Represents 6–12% of typical novice solution length; warrants integrity scrutiny. |
| **Burst Typing / Spamming** | Localized keystroke burst | **50–100 characters** in short continuous input | Atypical for novice reflective workflows; indicates potential metric inflation. |
| **Editing Efficiency** | Retained-to-total keystroke ratio | **< 5%** | Indicates non-cognitive activity with minimal retained semantic contribution. |
| **Debugging Iteration** | Inter-execution interval | **< 10 seconds** | Indicates reflexive trial-and-error unless accompanied by semantic code changes. |
| **Cognitive Idling** | Idle duration (focused window) | **30–120 seconds** | Potentially reflective cognitive processing following runtime errors. |
| **Disengagement** | Idle duration (unfocused or no error context) | **> 120 seconds** | Extended inactivity indicates disengagement from task. |

**Key Revisions from Original README:**
- Large insertion threshold reduced from 100 to **30 characters** for finer-grained detection
- Idle detection threshold standardized to **120 seconds** (not 30s)
- Added explicit burst typing detection window: **50–100 characters**

---

## 4. Data Fusion Engine (The "Validity Gates")

Raw signals are ambiguous. The system processes them through three Logic Gates before calculating the score.

### Gate 1: Provenance & Authenticity (Is the code original?)
* **Spamming/Gaming:**
  * *Condition:* `Keystrokes > 200` AND `Efficiency Ratio < 5%`.
  * *Action:* Set Effective KPM to 0.0.
  
* **Suspected External Paste:**
  * *Condition:* `Large Insertion (>30 chars)` + `Focus Violation` + `Low Keystroke Density`.
  * *Action:* Invalidate code change; Apply `Integrity Penalty (0.5)` to CES.
  
* **Authentic Refactoring:**
  * *Condition:* `Large Insertion` + `High Keystroke Density`.
  * *Action:* Validate as productive.

### Gate 2: Iteration Quality (Is the student thinking or guessing?)
* **Rapid-Fire Guessing:**
  * *Condition:* `Run Interval < 10s` AND `No Semantic Change`.
  * *Action:* Apply 80% weight (20% penalty) to Attempt Density.
  
* **Micro-Iteration:**
  * *Condition:* `Run Interval < 10s` WITH `Semantic Change`.
  * *Action:* Count fully (Valid).
  
* **Verification Run:**
  * *Condition:* `Run Interval > 10s` AND `No Semantic Change`.
  * *Action:* Count fully (Valid re-execution to confirm correctness).
  
* **Deliberate Debugging:**
  * *Condition:* `Run Interval > 10s` WITH `Semantic Change`.
  * *Action:* Count fully (Optimal).

### Gate 3: Cognitive State (Is silence productive?)
* **Reflective Pause (Good):**
  * *Condition:* `Idle > 30s` AND `Window Focused` AND `Last Run == Error`.
  * *Action:* **Whitelist time** (Subtract from Idle Ratio).
  
* **Disengagement (Bad):**
  * *Condition:* `Idle > 120s` AND `Window Blurred (Alt-Tab)`.
  * *Action:* Count fully toward Idle Ratio.
  
* **Passive Idle (Neutral/Bad):**
  * *Condition:* `Idle > 120s` AND `Window Focused` AND `No Recent Error`.
  * *Action:* Count fully toward Idle Ratio.

---

## 5. The Cognitive Engagement Score (CES) Model

### A. Normalization (Min-Max Scaling)
Normalize effective metrics (M_eff) to [0, 1] range:

$$M_{norm} = \frac{M_{effective} - M_{min}}{M_{max} - M_{min}}$$

### B. The Formula
The CES is a **Linear Weighted Composite Index** based on Multi-Attribute Utility Theory:

$$CES = (0.40 \cdot KPM_{norm} + 0.30 \cdot AD_{norm}) - (0.20 \cdot IR_{norm} + 0.10 \cdot FVC_{norm}) - I_{penalty}$$

* **Weights (Pedagogical Priorities):**
  * `0.40`: Keystrokes (Primary Active Indicator – prerequisite for all code production)
  * `0.30`: Attempt Density (Secondary Iterative Indicator – validation step)
  * `0.20`: Idle Ratio (Ambiguous Penalty – "thinking" vs "idling" share same signature)
  * `0.10`: Focus Violations (Uncertain Penalty – may indicate dishonesty or legitimate consultation)
  
* **Integrity Penalty (I_penalty):**
  * Value is `0.5` if **Suspected External Paste** is detected. Otherwise `0.0`.
  * Magnitude calibrated to reduce a "High Engagement" score (~0.70) to "Low Engagement" (~0.20).

### C. Classification Output
Final score is clamped to [-1.0, 1.0].

| CES Range | Engagement Classification | Pedagogical Interpretation | Recommended Instructor Action |
|-----------|---------------------------|----------------------------|-------------------------------|
| **> 0.50** | High Engagement | Sustained, fluid productivity with high keystroke density and deliberate iteration. | Monitor for sustainability; minimal intervention needed. |
| **0.20 – 0.50** | Moderate Engagement | Steady progress, likely alternating between coding and reflective pauses. | Check understanding if sustained >30 min. |
| **0.00 – 0.20** | Low Engagement | Minimal activity, suggesting confusion, hesitation, or mental block. | Proactive intervention recommended. |
| **≤ 0.00** | Disengaged / At-Risk | Session dominated by inactivity or penalties (tab switching, spamming, plagiarism). | Immediate check-in and investigation required. |

---

## 6. The Pedagogical Firewall (AI Logic)

Direct access to LLMs is blocked. The "AI Orchestration Module" mediates all requests.

### A. The Guardrail Mechanism
1. **Intercept:** Student sends query.
2. **Enrich:** Backend attaches `Current Code State` + `Error Logs` + `Problem Description` + `Behavioral Context`.
3. **Inject System Prompt:** Prepend Socratic tutoring instructions.
4. **Forward:** Send sanitized package to External AI Service (GPT-5).

### B. The System Prompt (Strict Requirement)
All AI interactions must use this system prompt:
```
You are a Socratic tutor for a novice programmer. Your goal is to guide the student toward understanding through questioning and hints.

**Constraints:**
1. Do NOT provide complete code solutions.
2. Do NOT write the code for them.
3. If the user asks for code, refuse politely and offer a logic hint instead.
4. If the request is outside the scope of programming or the current problem, respond: 'Outside the scope of the system.'
5. Use the provided 'Current Code State' to give specific, contextual guidance.
6. Ask Socratic questions that encourage reflection and hypothesis testing.
```

---

## 7. Real-Time Data Processing Pipeline

The system operates through five sequential stages:

1. **Stage 1: Telemetry Capture** – Frontend event listeners capture raw interactions and buffer them.
2. **Stage 2: Metric Extraction** – Backend processes telemetry through five monitoring algorithms to generate raw metrics.
3. **Stage 3: Data Fusion** – Raw metrics are processed through three classification pipelines to produce effective metrics.
4. **Stage 4: CES Computation** – Effective metrics are normalized and aggregated into the final CES.
5. **Stage 5: Dashboard Output** – CES and behavioral flags are routed to instructor analytics and student feedback interfaces.

---

## 8. Development Methodology

**Evolutionary Prototyping Model** with four phases:

1. **Phase 1: Requirement Analysis** – Define behavioral constructs, data fusion logic, and initial CES model.
2. **Phase 2: Initial Prototype** – Implement architecture, frontend instrumentation, backend processing, AI mediation, and database persistence.
3. **Phase 3: Threshold Calibration** – Conduct controlled testing with novice programmers; iteratively refine thresholds based on expert annotations.
4. **Phase 4: Final Evaluation** – Measure usability using the Post-Study System Usability Questionnaire (PSSUQ).

---

## 9. Technical Architecture

* **Presentation Layer:** React (v19.2), Monaco Editor (v0.52.2), non-blocking DOM event listeners, client-side buffering.
* **Application Logic Layer:** Python FastAPI (v0.115+), asynchronous request handling, Behavioral Analysis Engine, AI Orchestration Module.
* **Code Execution Layer:** Docker-isolated Python 3.10 sandbox with security constraints (time limits, memory caps, blocked file system/network access).
* **Data Persistence Layer:** SQLite (v3) with three primary entities: Sessions, Telemetry Events, Code Snapshots.

---
