import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import Draggable from 'react-draggable';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { 
  X, 
  FileCode, 
  Settings, 
  Play, 
  Send, 
  MessageSquare, 
  Terminal as TerminalIcon,
  BookOpen,
  RotateCcw,
  Activity as ActivityIcon,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp
} from 'lucide-react'; // Using Lucide React for clean icons

// --- Type Definitions ---
interface TestCase {
  id: string;
  name: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

interface Activity {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  problemStatement: string;
  language: 'python';
  starterCode: string;
  testCases?: TestCase[];
  hints?: string[];
  timeLimit?: number;
  memoryLimit?: number;
}

interface SubmissionResult {
  testsPassed: number;
  testsTotal: number;
  executionTime: number;
  cesScore: number;
  cesClassification: string;
  provenanceState: string;
  iterationState: string;
  cognitiveState: string;
  totalKeystrokes: number;
  totalRuns: number;
  sessionDuration: number;
  completionType: 'perfect' | 'partial' | 'timeout' | 'manual';
}

// --- Components for the Layout ---

// 1. Header Section
const Header = ({ activityTitle, onExit }: { activityTitle: string; onExit: () => void }) => (
  <header className="h-14 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4 text-white">
    <div className="flex items-center gap-3">
       {/* "X" Icon to exit or close */}
      <button onClick={onExit} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
        <X size={20} />
      </button>
      <h1 className="font-semibold text-lg tracking-wide">{activityTitle}</h1>
    </div>
    <div className="text-sm text-gray-400">rbAI Environment</div>
  </header>
);

// 2. Sidebar Section
const Sidebar = ({ onTelemetryClick }: { onTelemetryClick: () => void }) => (
  <aside className="w-16 bg-gray-900 border-r border-gray-700 flex flex-col items-center py-4 gap-6 text-gray-400">
    {/* Placeholder Icons */}
    <div className="p-2 bg-blue-600/10 text-blue-500 rounded-lg cursor-pointer">
      <FileCode size={24} />
    </div>
    <div className="p-2 hover:text-white cursor-pointer transition-colors">
      <BookOpen size={24} />
    </div>
    <button 
      onClick={onTelemetryClick}
      className="p-2 hover:text-white cursor-pointer transition-colors hover:bg-purple-600/10 rounded-lg"
      title="Live Telemetry"
    >
      <ActivityIcon size={24} />
    </button>
    <div className="mt-auto p-2 hover:text-white cursor-pointer transition-colors">
      <Settings size={24} />
    </div>
  </aside>
);

// 6. The Draggable Chatbot (Index 9999)
const DraggableChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const nodeRef = useRef(null);

  if (!isOpen) {
    return (
      <div className="absolute bottom-5 right-5 z-9999">
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 p-4 rounded-full shadow-lg text-white hover:bg-blue-700 transition-all"
        >
          <MessageSquare size={24} />
        </button>
      </div>
    );
  }

  return (
    <Draggable bounds="parent" handle=".handle" nodeRef={nodeRef}>
      <div ref={nodeRef} className="absolute z-9999 top-20 right-20 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden h-96">
        {/* Chat Header (Draggable Handle) */}
        <div className="handle bg-gray-700 p-3 flex justify-between items-center cursor-move select-none">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-white font-medium text-sm">rbAI Assistant</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Chat Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-800/50">
          <div className="bg-gray-700/50 p-3 rounded-lg text-sm text-gray-200">
            Hello! I am your AI guide. Do you need my help?
          </div>
        </div>

        {/* Chat Input */}
        <div className="p-3 bg-gray-900 border-t border-gray-700 flex gap-2">
          <input 
            type="text" 
            placeholder="Ask for help..." 
            className="flex-1 bg-gray-800 text-white text-sm rounded px-3 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button className="bg-blue-600 p-2 rounded hover:bg-blue-700 text-white">
            <Send size={16} />
          </button>
        </div>
      </div>
    </Draggable>
  );
};

// 7. Live Telemetry Panel
interface TelemetryData {
  kpm: number;
  ad: number;
  ir: number;
  fvc: number;
  ces: number;
  ces_classification: string;
  totalKeystrokes: number;
  totalRuns: number;
  idleTime: number;
  sessionDuration: number;
  lastEditSize: number;
  lastRunInterval: number;
  provenanceState: string;
  iterationState: string;
  cognitiveState: string;
}

const LiveTelemetryPanel = ({ 
  isOpen, 
  onClose, 
  telemetry 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  telemetry: TelemetryData | null;
}) => {
  const nodeRef = useRef(null);

  if (!isOpen) return null;
  
  // Show loading state if telemetry not yet computed
  if (!telemetry) {
    return (
      <div className="absolute z-[10000] top-20 left-20 w-[500px] bg-gray-800 border border-purple-500/50 rounded-xl shadow-2xl p-8 text-center">
        <div className="text-purple-300 mb-2">Loading telemetry...</div>
        <div className="text-gray-400 text-sm">Computing behavioral analysis</div>
      </div>
    );
  }

  const getCESColor = (ces: number) => {
    if (ces > 0.50) return 'text-green-400';
    if (ces > 0.20) return 'text-yellow-400';
    if (ces > 0.00) return 'text-orange-400';
    return 'text-red-400';
  };

  const getCESLabel = (ces: number) => {
    if (ces > 0.50) return 'High Engagement';
    if (ces > 0.20) return 'Moderate Engagement';
    if (ces > 0.00) return 'Low Engagement';
    return 'Disengaged/At-Risk';
  };

  return (
    <Draggable bounds="parent" handle=".telemetry-handle" nodeRef={nodeRef}>
      <div 
        ref={nodeRef}
        className="absolute z-[10000] top-20 left-20 w-[500px] bg-gray-800 border border-purple-500/50 rounded-xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="telemetry-handle bg-gradient-to-r from-purple-900 to-purple-800 p-3 flex justify-between items-center cursor-move select-none">
          <div className="flex items-center gap-2">
            <ActivityIcon size={18} className="text-purple-300" />
            <span className="text-white font-semibold text-sm">Live Behavioral Telemetry</span>
            <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
          </div>
          <button onClick={onClose} className="text-purple-300 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 bg-gray-900/50 max-h-[600px] overflow-y-auto">
          {/* CES Score - Primary Metric */}
          <div className="bg-gray-800/80 rounded-lg p-4 mb-4 border border-purple-500/30">
            <div className="text-xs text-purple-300 uppercase tracking-wider mb-2">Cognitive Engagement Score</div>
            <div className={`text-4xl font-bold ${getCESColor(telemetry.ces)} mb-1`}>
              {telemetry.ces.toFixed(3)}
            </div>
            <div className="text-sm text-gray-400">{getCESLabel(telemetry.ces)}</div>
          </div>

          {/* Primary Metrics */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <MetricCard 
              label="KPM" 
              value={telemetry.kpm.toFixed(2)} 
              subtext="Keystrokes/Min"
              color="blue"
              range="5.0 - 24.0"
            />
            <MetricCard 
              label="AD" 
              value={telemetry.ad.toFixed(3)} 
              subtext="Attempt Density"
              color="green"
              range="0.05 - 0.25"
            />
            <MetricCard 
              label="IR" 
              value={telemetry.ir.toFixed(3)} 
              subtext="Idle Ratio"
              color="orange"
              range="< 0.5"
            />
            <MetricCard 
              label="FVC" 
              value={telemetry.fvc.toString()} 
              subtext="Focus Violations"
              color="red"
              range="< 5"
            />
          </div>

          {/* Raw Telemetry */}
          <div className="bg-gray-800/80 rounded-lg p-3 mb-4 border border-gray-700">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-3">Raw Telemetry</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <TelemetryRow label="Total Keystrokes" value={telemetry.totalKeystrokes} />
              <TelemetryRow label="Total Runs" value={telemetry.totalRuns} />
              <TelemetryRow label="Idle Time" value={`${telemetry.idleTime.toFixed(1)}m`} />
              <TelemetryRow label="Session Duration" value={`${telemetry.sessionDuration.toFixed(1)}m`} />
              <TelemetryRow label="Last Edit Size" value={`${telemetry.lastEditSize} chars`} />
              <TelemetryRow label="Last Run Interval" value={`${telemetry.lastRunInterval.toFixed(1)}s`} />
            </div>
          </div>

          {/* Behavioral States (Data Fusion) */}
          <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-3">Data Fusion States</div>
            <div className="space-y-2 text-xs">
              <StateRow 
                label="Provenance" 
                value={telemetry.provenanceState} 
                icon="📝"
              />
              <StateRow 
                label="Iteration Quality" 
                value={telemetry.iterationState} 
                icon="🔄"
              />
              <StateRow 
                label="Cognitive State" 
                value={telemetry.cognitiveState} 
                icon="🧠"
              />
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 p-3 bg-purple-900/20 rounded border border-purple-500/20 text-xs text-gray-400">
            <div className="font-semibold text-purple-300 mb-1">CES Formula:</div>
            <div className="font-mono">0.40×KPM + 0.30×AD - 0.20×IR - 0.10×FVC</div>
          </div>
        </div>
      </div>
    </Draggable>
  );
};

// Helper Components
const MetricCard = ({ 
  label, 
  value, 
  subtext, 
  color, 
  range 
}: { 
  label: string; 
  value: string; 
  subtext: string; 
  color: string;
  range: string;
}) => {
  const colorMap: Record<string, string> = {
    blue: 'border-blue-500/30 text-blue-400',
    green: 'border-green-500/30 text-green-400',
    orange: 'border-orange-500/30 text-orange-400',
    red: 'border-red-500/30 text-red-400',
  };

  return (
    <div className={`bg-gray-800/50 rounded p-3 border ${colorMap[color]}`}>
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-2xl font-bold mb-0.5">{value}</div>
      <div className="text-xs text-gray-500">{subtext}</div>
      <div className="text-xs text-gray-600 mt-1">Range: {range}</div>
    </div>
  );
};

const TelemetryRow = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex justify-between py-1">
    <span className="text-gray-500">{label}:</span>
    <span className="text-gray-300 font-medium">{value}</span>
  </div>
);

const StateRow = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
  <div className="flex items-center justify-between py-1.5 px-2 bg-gray-900/50 rounded">
    <span className="text-gray-400">{icon} {label}:</span>
    <span className="text-purple-300 font-medium text-xs">{value}</span>
  </div>
);

// 8. Finish Confirmation Dialog
const FinishConfirmDialog = ({ 
  isOpen, 
  onConfirm, 
  onCancel 
}: { 
  isOpen: boolean; 
  onConfirm: () => void; 
  onCancel: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg shadow-2xl border border-gray-600 w-full max-w-md mx-4 p-6">
        <h3 className="text-xl font-bold text-white mb-3">Finish Activity?</h3>
        <p className="text-gray-300 mb-6">
          Are you sure you want to finish this activity? Your current progress and engagement metrics will be recorded.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors font-semibold"
          >
            Yes, Finish
          </button>
        </div>
      </div>
    </div>
  );
};

// 9. Completion Modal Component
interface CompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: SubmissionResult | null;
  onViewDashboard?: () => void;
}

const CompletionModal = ({ isOpen, onClose, result, onViewDashboard }: CompletionModalProps) => {
  if (!isOpen || !result) return null;

  const isPerfect = result.testsPassed === result.testsTotal;
  const passRate = ((result.testsPassed / result.testsTotal) * 100).toFixed(1);
  
  // Determine completion message based on type
  const getCompletionMessage = () => {
    switch (result.completionType) {
      case 'perfect':
        return {
          title: '🎉 Perfect Score!',
          subtitle: 'Congratulations! You passed all test cases!',
          bgColor: 'bg-green-600',
          icon: <CheckCircle size={48} className="text-green-400" />
        };
      case 'partial':
        return {
          title: '✓ Activity Completed',
          subtitle: `You passed ${result.testsPassed} out of ${result.testsTotal} test cases`,
          bgColor: 'bg-blue-600',
          icon: <AlertCircle size={48} className="text-blue-400" />
        };
      case 'timeout':
        return {
          title: '⏰ Time\'s Up!',
          subtitle: 'Your session has ended. Here are your results:',
          bgColor: 'bg-orange-600',
          icon: <Clock size={48} className="text-orange-400" />
        };
      case 'manual':
        return {
          title: '📝 Activity Submitted',
          subtitle: 'You chose to finish. Here are your results:',
          bgColor: 'bg-purple-600',
          icon: <TrendingUp size={48} className="text-purple-400" />
        };
    }
  };

  const message = getCompletionMessage();

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`${message.bgColor} p-4 text-white flex-shrink-0`}>
          <div className="flex items-center gap-3">
            {message.icon}
            <div>
              <h2 className="text-xl font-bold">{message.title}</h2>
              <p className="text-white/90 text-sm mt-1">{message.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Test Results Summary */}
          <div className="bg-gray-800 rounded-lg p-3">
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2 text-sm">
              <CheckCircle size={18} className="text-green-400" />
              Test Results
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-gray-400 text-sm">Tests Passed</div>
                <div className="text-3xl font-bold text-white">
                  {result.testsPassed}/{result.testsTotal}
                </div>
                <div className={`text-sm font-semibold ${isPerfect ? 'text-green-400' : 'text-blue-400'}`}>
                  {passRate}% Pass Rate
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Execution Time</div>
                <div className="text-2xl font-bold text-white">
                  {result.executionTime.toFixed(3)}s
                </div>
              </div>
            </div>
          </div>

          {/* CES Score & Engagement */}
          <div className="bg-gray-800 rounded-lg p-3">
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2 text-sm">
              <TrendingUp size={18} className="text-purple-400" />
              Cognitive Engagement Analysis
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">CES Score</span>
                <span className={`text-2xl font-bold ${
                  result.cesScore > 0.5 ? 'text-green-400' : 
                  result.cesScore > 0.2 ? 'text-blue-400' : 
                  result.cesScore > 0 ? 'text-orange-400' : 'text-red-400'
                }`}>
                  {result.cesScore.toFixed(3)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Classification</span>
                <span className="text-white font-medium">{result.cesClassification}</span>
              </div>
            </div>
          </div>

          {/* Behavioral States */}
          <div className="bg-gray-800 rounded-lg p-3">
            <h3 className="text-white font-semibold mb-2 text-sm">Behavioral Analysis</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Provenance:</span>
                <span className="text-white">{result.provenanceState}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Iteration Quality:</span>
                <span className="text-white">{result.iterationState}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Cognitive State:</span>
                <span className="text-white">{result.cognitiveState}</span>
              </div>
            </div>
          </div>

          {/* Session Statistics */}
          <div className="bg-gray-800 rounded-lg p-3">
            <h3 className="text-white font-semibold mb-2 text-sm">Session Statistics</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-gray-400 text-xs mb-1">Keystrokes</div>
                <div className="text-xl font-bold text-white">{result.totalKeystrokes}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs mb-1">Run Attempts</div>
                <div className="text-xl font-bold text-white">{result.totalRuns}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs mb-1">Duration</div>
                <div className="text-xl font-bold text-white">{result.sessionDuration.toFixed(1)}m</div>
              </div>
            </div>
          </div>

          {/* Recommendations for non-perfect scores */}
          {!isPerfect && result.completionType !== 'timeout' && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-blue-400 font-semibold mb-2">💡 Recommendations</h3>
              <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
                <li>Review the test cases that failed and understand the expected behavior</li>
                <li>Consider asking the AI tutor for hints on the failing cases</li>
                <li>You can retry this activity to improve your score</li>
                <li>Your engagement score has been recorded for analysis</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-800 p-3 flex justify-end gap-2 border-t border-gray-700 flex-shrink-0">
          {onViewDashboard && (
            <button
              onClick={onViewDashboard}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition-colors"
            >
              View Dashboard
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors font-semibold"
          >
            {isPerfect ? 'Celebrate! 🎉' : 'Continue Learning'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main Page Component ---

/**
 * CodePlayground - Behavior-Monitored Coding Environment
 * 
 * Architecture (Figure 11):
 * ┌─────────────────────────────────────────────────────────────┐
 * │ FRONTEND (This Component)                                    │
 * │ - Collects RAW telemetry only (keystrokes, focus events)    │
 * │ - Buffers behavioral signals                                 │
 * │ - Sends raw data to backend                                  │
 * │ - Displays computed results from backend                     │
 * └─────────────────────────────────────────────────────────────┘
 *                            ↓ HTTP POST
 * ┌─────────────────────────────────────────────────────────────┐
 * │ BACKEND (/api/telemetry/analyze)                            │
 * │ - Receives raw telemetry                                     │
 * │ - Applies Data Fusion (Integrity Checks)                     │
 * │ - Computes CES using domain thresholds                       │
 * │ - Returns: CES, states, effective metrics                    │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * NO CES calculation, NO data fusion, NO state classification in frontend.
 * Frontend is only responsible for data collection.
 */

interface CodePlaygroundProps {
  activity: Activity;
  onExit: () => void;
}

const CodePlayground = ({ activity, onExit }: CodePlaygroundProps) => {
  // State for code and output - initialize with activity's starter code
  const [code, setCode] = useState(activity.starterCode);
  const [output, setOutput] = useState("> Ready to execute...");
  // State to handle loading status (good for UX)
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  
  // Completion state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  
  // Telemetry state - FRONTEND ONLY COLLECTS RAW DATA
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [sessionStartTime] = useState(Date.now());
  
  // Raw behavioral signals (Figure 11: Stage 1 - Telemetry Capture)
  const [keystrokeCount, setKeystrokeCount] = useState(0);
  const [runCount, setRunCount] = useState(0);
  const [lastRunTime, setLastRunTime] = useState<number | null>(null);
  const [lastEditSize, setLastEditSize] = useState(0);
  const [idleStartTime, setIdleStartTime] = useState<number | null>(null);
  const [totalIdleTime, setTotalIdleTime] = useState(0);
  const [focusViolations, setFocusViolations] = useState(0);
  const [lastRunSuccess, setLastRunSuccess] = useState(true);
  const [windowFocused, setWindowFocused] = useState(true);
  const [previousCode, setPreviousCode] = useState(activity.starterCode);
  
  // Computed telemetry from backend (Figure 11: Stage 4 - Display)
  const [computedTelemetry, setComputedTelemetry] = useState<TelemetryData | null>(null);
  
  // Get raw telemetry to send to backend
  const getRawTelemetry = () => {
    const sessionDurationMs = Date.now() - sessionStartTime;
    const sessionDurationMin = sessionDurationMs / 60000;
    const currentIdle = idleStartTime ? (Date.now() - idleStartTime) / 1000 : 0;
    const lastRunInterval = lastRunTime ? (Date.now() - lastRunTime) / 1000 : 0;
    const isSemanticChange = code !== previousCode;
    
    return {
      session_id: "test-session-001",
      problem_id: activity.id,
      session_duration_minutes: sessionDurationMin,
      total_keystrokes: keystrokeCount,
      total_run_attempts: runCount,
      total_idle_minutes: totalIdleTime,
      focus_violation_count: focusViolations,
      net_code_change: code.length,
      last_edit_size_chars: lastEditSize,
      last_run_interval_seconds: lastRunInterval,
      is_semantic_change: isSemanticChange,
      current_idle_duration: currentIdle,
      is_window_focused: windowFocused,
      last_run_was_error: !lastRunSuccess
    };
  };
  
  // Fetch computed telemetry from backend
  const fetchComputedTelemetry = async () => {
    try {
      const rawTelemetry = getRawTelemetry();
      const response = await fetch("http://localhost:8000/api/telemetry/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rawTelemetry),
      });
      
      if (response.ok) {
        const data = await response.json();
        setComputedTelemetry({
          kpm: data.kpm,
          ad: data.ad,
          ir: data.ir,
          fvc: data.fvc,
          ces: data.ces,
          ces_classification: data.ces_classification,
          totalKeystrokes: keystrokeCount,
          totalRuns: runCount,
          idleTime: totalIdleTime,
          sessionDuration: rawTelemetry.session_duration_minutes,
          lastEditSize: lastEditSize,
          lastRunInterval: rawTelemetry.last_run_interval_seconds,
          provenanceState: data.provenance_state,
          iterationState: data.iteration_state,
          cognitiveState: data.cognitive_state
        });
      }
    } catch (error) {
      console.error("Failed to fetch telemetry:", error);
    }
  };
  
  // Periodically update telemetry when panel is open
  useEffect(() => {
    if (showTelemetry) {
      fetchComputedTelemetry();
      const interval = setInterval(fetchComputedTelemetry, 3000); // Update every 3 seconds
      return () => clearInterval(interval);
    }
  }, [showTelemetry, keystrokeCount, runCount, totalIdleTime, focusViolations, code]);

  const handleRunCode = async () => {
    // Check if code contains input() function
    if (code.includes('input(')) {
      setOutput(`> ❌ Error: input() function is not supported

The input() function is not supported in this environment.

Instead, please use one of these alternatives:

1. Use hardcoded values:
   name = "John"  # Instead of: name = input("Enter name: ")

For learning loops and algorithms, hardcoded test values work best!`);
      return;
    }

    setIsRunning(true);
    setOutput("> Executing...");
    
    // Update telemetry
    setRunCount(prev => prev + 1);
    const currentTime = Date.now();
    setLastRunTime(currentTime);

    // 1. Prepare the payload matching your Pydantic 'ExecutionRequest' model
    // In a real scenario, session_id comes from auth, problem_id from the route/props
    const payload = {
      session_id: "test-session-001", // Placeholder for research prototyping
      problem_id: activity.id,
      code: code,
      stdin: "",                      // Not used - input() is blocked
      telemetry: {
        // This maps to your "Telemetry Capture" stage in Figure 9a
        keystroke_count: keystrokeCount,
        timestamp: new Date().toISOString(),
        last_run_timestamp: lastRunTime ? new Date(lastRunTime).toISOString() : null
      }
    };

    try {
      // 2. Request the specific endpoint you defined in execution.py
      // Assuming your FastAPI runs on port 8000
      const response = await fetch("http://localhost:8000/api/execution/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      // 3. Handle the 'ExecutionResponse' defined in your backend
      const data = await response.json();
      
      // Track run success/failure
      setLastRunSuccess(data.status === "success");

      // Format the output for the "Terminal" panel
      let terminalOutput = "";
      
      if (data.status === "success") {
        terminalOutput += `> Output:\n${data.output}\n`;
      } else {
        terminalOutput += `> Error:\n${data.error || data.output}\n`;
      }

      terminalOutput += `\n> Execution time: ${data.execution_time.toFixed(3)}s`;
      terminalOutput += `\n> Exit code: ${data.exit_code}`;

      setOutput(terminalOutput);

    } catch (error: any) {
      setOutput(`> System Error: Failed to connect to rbAI backend.\n> ${error.message}`);
      console.error("Execution failed:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setCode(activity.starterCode);
    setOutput("> Ready to execute...");
    setTestResults(null);
  };

  const handleSubmit = async () => {
    if (!activity.testCases || activity.testCases.length === 0) {
      setOutput("> No test cases available for this activity.");
      return;
    }

    setIsSubmitting(true);
    setOutput("> Running test cases...");
    setTestResults(null);

    // Prepare test cases in the format expected by backend
    const testCases = activity.testCases.map(tc => ({
      input: tc.input,
      expected_output: tc.expectedOutput,
      description: tc.name
    }));

    const payload = {
      session_id: "test-session-001",
      problem_id: activity.id,
      code: code,
      stdin: "",
      test_cases: testCases,
      telemetry: {
        keystroke_count: 0,
        timestamp: new Date().toISOString()
      }
    };

    try {
      const response = await fetch("http://localhost:8000/api/execution/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const data = await response.json();

      // Calculate how many tests passed
      const passedCount = data.test_results?.filter((tr: any) => tr.passed).length || 0;
      const totalCount = data.test_results?.length || 0;

      setTestResults(data.test_results);

      // Format the output
      let terminalOutput = `> ========== TEST RESULTS ==========\n`;
      terminalOutput += `> Passed: ${passedCount}/${totalCount}\n\n`;

      if (data.test_results) {
        data.test_results.forEach((test: any) => {
          const status = test.passed ? '✓ PASS' : '✗ FAIL';
          terminalOutput += `> Test ${test.test_number}: ${status}\n`;
          terminalOutput += `>   Input: ${test.input}\n`;
          terminalOutput += `>   Expected: ${test.expected_output}\n`;
          terminalOutput += `>   Got: ${test.actual_output}\n`;
          if (test.error) {
            terminalOutput += `>   Error: ${test.error}\n`;
          }
          terminalOutput += `\n`;
        });
      }

      terminalOutput += `> Execution time: ${data.execution_time.toFixed(3)}s\n`;
      
      if (passedCount === totalCount) {
        terminalOutput += `\n> 🎉 All tests passed! Great job!\n`;
      } else {
        terminalOutput += `\n> ⚠ Some tests failed. Review the results above.\n`;
      }

      setOutput(terminalOutput);

      // If perfect score, show completion modal automatically
      if (passedCount === totalCount) {
        await handleFinishActivity('perfect', data);
      }

    } catch (error: any) {
      setOutput(`> System Error: Failed to connect to rbAI backend.\n> ${error.message}`);
      console.error("Submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // New function to handle activity completion
  const handleFinishActivity = async (type: 'perfect' | 'partial' | 'manual' | 'timeout', testData?: any) => {
    // Get current telemetry from backend
    const rawTelemetry = getRawTelemetry();
    
    try {
      const telemetryResponse = await fetch("http://localhost:8000/api/telemetry/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rawTelemetry),
      });

      let telemetryData = computedTelemetry;
      if (telemetryResponse.ok) {
        telemetryData = await telemetryResponse.json();
      }

      // Prepare submission result
      const passedTests = testData?.test_results?.filter((tr: any) => tr.passed).length || testResults?.filter((tr: any) => tr.passed).length || 0;
      const totalTests = testData?.test_results?.length || testResults?.length || (activity.testCases?.length || 0);

      const result: SubmissionResult = {
        testsPassed: passedTests,
        testsTotal: totalTests,
        executionTime: testData?.execution_time || 0,
        cesScore: telemetryData?.ces || 0,
        cesClassification: telemetryData?.ces_classification || 'Unknown',
        provenanceState: telemetryData?.provenanceState || 'Unknown',
        iterationState: telemetryData?.iterationState || 'Unknown',
        cognitiveState: telemetryData?.cognitiveState || 'Unknown',
        totalKeystrokes: keystrokeCount,
        totalRuns: runCount,
        sessionDuration: (Date.now() - sessionStartTime) / 60000,
        completionType: type,
      };

      setSubmissionResult(result);
      setShowCompletionModal(true);

      // TODO: Send to backend for storage (implement later)
      console.log('📊 Activity completed - Results to be stored:', result);

    } catch (error) {
      console.error('Failed to fetch final telemetry:', error);
      // Show modal anyway with available data
      setShowCompletionModal(true);
    }
  };

  // Handle code changes for telemetry
  const handleCodeChange = (value: string | undefined) => {
    if (value === undefined) return;
    
    const editSize = Math.abs(value.length - code.length);
    setLastEditSize(editSize);
    setPreviousCode(code);
    setCode(value);
    
    // Reset idle timer on typing
    if (idleStartTime) {
      const idleDuration = (Date.now() - idleStartTime) / 60000; // minutes
      setTotalIdleTime(prev => prev + idleDuration);
      setIdleStartTime(null);
    }
  };
  
  // Track keystrokes
  const handleEditorKeyDown = () => {
    setKeystrokeCount(prev => prev + 1);
  };
  
  // Track focus violations
  const handleWindowBlur = () => {
    setWindowFocused(false);
    setFocusViolations(prev => prev + 1);
    if (!idleStartTime) {
      setIdleStartTime(Date.now());
    }
  };
  
  const handleWindowFocus = () => {
    setWindowFocused(true);
  };
  
  // Set up event listeners
  useEffect(() => {
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    
    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  return (
    <div className="h-screen w-screen bg-gray-950 flex flex-col overflow-hidden font-sans">
      
      {/* 1. Header */}
      <Header activityTitle={activity.title} onExit={onExit} />

      <div className="flex flex-1 overflow-hidden relative">
        
        {/* 2. Sidebar */}
        <Sidebar onTelemetryClick={() => setShowTelemetry(!showTelemetry)} />

        {/* Main Content Area (Split View) */}
        <main className="flex-1 flex overflow-hidden">
          
          <PanelGroup direction="horizontal">
            {/* 3. Left Panel: Problem Instructions */}
            <Panel defaultSize={33} minSize={20} maxSize={50}>
              <section className="h-full bg-gray-900 flex flex-col">
                <div className="p-4 border-b border-gray-800 bg-gray-800/30">
                  <h2 className="text-white font-semibold flex items-center gap-2">
                    <BookOpen size={18} className="text-blue-400"/> Problem Description
                  </h2>
                </div>
                <div className="flex-1 p-6 text-gray-300 overflow-y-auto prose prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {activity.problemStatement}
                  </ReactMarkdown>
                  
                  {/* Test Cases Section */}
                  {activity.testCases && activity.testCases.length > 0 && (
                    <div className="mt-6 border-t border-gray-700 pt-6">
                      <h3 className="text-white font-semibold mb-3">Test Cases</h3>
                      {activity.testCases
                        .filter(tc => !tc.isHidden)
                        .map((testCase) => (
                          <div key={testCase.id} className="bg-gray-800/50 rounded p-3 mb-3 border border-gray-700">
                            <div className="text-sm font-medium text-blue-400 mb-2">{testCase.name}</div>
                            <div className="text-xs text-gray-400">
                              <div><span className="text-gray-500">Input:</span> {testCase.input}</div>
                              <div><span className="text-gray-500">Expected Output:</span> {testCase.expectedOutput}</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                  
                  {/* Hints Section */}
                  {activity.hints && activity.hints.length > 0 && (
                    <div className="mt-6 border-t border-gray-700 pt-6">
                      <h3 className="text-white font-semibold mb-3">💡 Hints</h3>
                      <ul className="list-disc list-inside space-y-2">
                        {activity.hints.map((hint, index) => (
                          <li key={index} className="text-sm text-gray-400">{hint}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            </Panel>

            {/* Resize Handle */}
            <PanelResizeHandle className="w-1 bg-gray-700 hover:bg-blue-500 transition-colors cursor-col-resize" />

            {/* Right Side Container */}
            <Panel defaultSize={67} minSize={50}>
              <PanelGroup direction="vertical">
                {/* 4. Right Upper Panel: Code Editor */}
                <Panel defaultSize={67} minSize={30}>
                  <div className="h-full flex flex-col bg-[#1e1e1e]">
                    <div className="h-10 bg-[#2d2d2d] flex items-center justify-between px-4 border-b border-[#1e1e1e]">
                      <span className="text-sm text-gray-400">
                        {activity.language === 'python' ? 'main.py' : 
                         activity.language === 'javascript' ? 'main.js' :
                         activity.language === 'java' ? 'Main.java' : 'main.cpp'}
                      </span>
                      <div className="flex gap-2">
                        <button 
                          onClick={handleRunCode}
                          disabled={isRunning}
                          className="flex items-center gap-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Play size={14} /> {isRunning ? 'Running...' : 'Run'}
                        </button>
                        <button 
                          onClick={handleSubmit}
                          disabled={isSubmitting}
                          className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send size={14} /> {isSubmitting ? 'Testing...' : 'Submit'}
                        </button>
                        <button 
                          onClick={() => setShowFinishConfirm(true)}
                          disabled={isSubmitting || isRunning}
                          className="flex items-center gap-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Finish activity and view results"
                        >
                          <CheckCircle size={14} /> Finish
                        </button>
                        <button 
                          onClick={handleReset}
                          className="flex items-center gap-2 px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded transition-colors"
                        >
                          <RotateCcw size={14} /> Reset
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 relative">
                      <Editor
                        height="100%"
                        defaultLanguage={activity.language}
                        theme="vs-dark"
                        value={code}
                        onChange={handleCodeChange}
                        onMount={(editor) => {
                          editor.onKeyDown(handleEditorKeyDown);
                        }}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          padding: { top: 16 }
                        }}
                      />
                    </div>
                  </div>
                </Panel>

                {/* Vertical Resize Handle */}
                <PanelResizeHandle className="h-1 bg-gray-700 hover:bg-blue-500 transition-colors cursor-row-resize" />

                {/* 5. Right Lower Panel: Terminal */}
                <Panel defaultSize={33} minSize={20}>
                  <div className="h-full bg-gray-900 flex flex-col">
                    <div className="h-8 bg-gray-800 flex items-center px-4 border-b border-gray-700">
                      <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-2">
                        <TerminalIcon size={14} /> Terminal / Output
                      </span>
                    </div>
                    <div className="flex-1 p-4 font-mono text-sm text-green-400 overflow-y-auto whitespace-pre-wrap">
                      {output}
                    </div>
                  </div>
                </Panel>
              </PanelGroup>
            </Panel>
          </PanelGroup>
        </main>

        {/* 6. Moveable Chatbot Overlay */}
        <DraggableChatbot />
        
        {/* 7. Live Telemetry Overlay */}
        <LiveTelemetryPanel 
          isOpen={showTelemetry}
          onClose={() => setShowTelemetry(false)}
          telemetry={computedTelemetry}
        />

        {/* 8. Finish Confirmation Dialog */}
        <FinishConfirmDialog
          isOpen={showFinishConfirm}
          onConfirm={() => {
            setShowFinishConfirm(false);
            handleFinishActivity('manual');
          }}
          onCancel={() => setShowFinishConfirm(false)}
        />

        {/* 9. Completion Modal */}
        <CompletionModal
          isOpen={showCompletionModal}
          onClose={() => {
            setShowCompletionModal(false);
            onExit(); // Return to dashboard
          }}
          result={submissionResult}
          onViewDashboard={onExit}
        />

      </div>
    </div>
  );
};

export default CodePlayground;
