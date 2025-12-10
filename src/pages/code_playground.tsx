import  {useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

// Simulated SessionMetrics structure (matches your Python dataclass)
interface TelemetryData {
  totalKeystrokes: number;
  lastEditSize: number;
  codeLength: number;
  lastActivityTime: number;
}

function CodePlayground() {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    totalKeystrokes: 0,
    lastEditSize: 0,
    codeLength: 0,
    lastActivityTime: Date.now()
  });
  const [code, setCode] = useState(`# Python Example
def hello_world():
    print("Hello from rbAI!")
    
# Try editing this code
# Watch the telemetry update in real-time`);

  // This function will be called when the editor mounts
  function handleEditorDidMount(editor: editor.IStandaloneCodeEditor, _monaco: any) {
    editorRef.current = editor;
    
    // === KEY INTEGRATION POINT 1: Content Change Listener ===
    // This captures EVERY edit (keystrokes, paste, delete)
    editor.onDidChangeModelContent((event: any) => {
      const currentCode = editor.getValue();
      
      // Calculate edit size (characters added/removed)
      const editSize = event.changes.reduce((sum: any, change: any) => {
        return sum + Math.abs(change.text.length - change.rangeLength);
      }, 0);
      
      setTelemetry(prev => ({
        ...prev,
        totalKeystrokes: prev.totalKeystrokes + 1,
        lastEditSize: editSize,
        codeLength: currentCode.length,
        lastActivityTime: Date.now()
      }));
      
      // THIS IS WHERE YOU'D SEND TO YOUR BACKEND:
      // sendTelemetryToBackend({ keystroke: true, editSize, timestamp: Date.now() });
    });

    // === KEY INTEGRATION POINT 2: Focus Tracking ===
    editor.onDidFocusEditorText(() => {
      console.log('✅ Editor FOCUSED - User is active');
      // For your FVC (Focus Violation Count) tracking
    });

    editor.onDidBlurEditorText(() => {
      console.log('⚠️ Editor BLURRED - Potential focus violation');
      // Increment FVC in your backend
    });

    // === KEY INTEGRATION POINT 3: Cursor Position Tracking ===
    editor.onDidChangeCursorPosition((e: any) => {
      // Useful for detecting idle periods (no cursor movement)
      console.log(`Cursor at Line ${e.position.lineNumber}, Column ${e.position.column}`);
    });
  }

  // Simulate getting the current code (for "Run" button in your system)
  const handleGetCode = () => {
    if (editorRef.current) {
      const currentCode = editorRef.current.getValue();
      alert(`Code Length: ${currentCode.length} characters\n\nThis would be sent to your Python execution sandbox.`);
    }
  };

  // Simulate code execution trigger (for your Run-Attempt Timeline Analysis)
  const handleRunCode = () => {
    if (editorRef.current) {
      const currentCode = editorRef.current.getValue();
      console.log('🚀 RUN ATTEMPT LOGGED');
      console.log('Timestamp:', Date.now());
      console.log('Code State Hash:', btoa(currentCode).slice(0, 16)); // Simplified hash
      
      // THIS IS WHERE YOUR ALGORITHM 1.2.5 WOULD LOG THE RUN ATTEMPT
      alert('Run attempt logged!\nCheck console for details.');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <h1 className="text-2xl font-bold mb-2">Monaco Editor - rbAI Integration Demo</h1>
        <p className="text-gray-400 text-sm">
          This demonstrates how Monaco Editor integrates with your behavioral monitoring system
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Editor Panel */}
        <div className="flex-1 flex flex-col border-r border-gray-700">
          <div className="bg-gray-800 p-2 border-b border-gray-700">
            <button
              onClick={handleRunCode}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded mr-2 transition"
            >
              ▶ Run Code
            </button>
            <button
              onClick={handleGetCode}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition"
            >
              📄 Get Code
            </button>
          </div>

          <div className="flex-1">
            <Editor
              height="100%"
              defaultLanguage="python"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
              }}
            />
          </div>
        </div>

        {/* Telemetry Panel (Your Dashboard View) */}
        <div className="w-80 bg-gray-800 p-4 overflow-y-auto">
          <h2 className="text-xl font-bold mb-4 text-green-400">📊 Live Telemetry</h2>
          
          <div className="space-y-4">
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-xs text-gray-400 mb-1">Total Keystrokes</div>
              <div className="text-2xl font-bold text-blue-400">
                {telemetry.totalKeystrokes}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Used for KPM calculation (Section 1.1)
              </div>
            </div>

            <div className="bg-gray-700 p-3 rounded">
              <div className="text-xs text-gray-400 mb-1">Last Edit Size</div>
              <div className="text-2xl font-bold text-purple-400">
                {telemetry.lastEditSize} chars
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Large insertions (&gt;100) trigger provenance check (Fig 6)
              </div>
            </div>

            <div className="bg-gray-700 p-3 rounded">
              <div className="text-xs text-gray-400 mb-1">Code Length</div>
              <div className="text-2xl font-bold text-yellow-400">
                {telemetry.codeLength} chars
              </div>
              <div className="text-xs text-gray-500 mt-1">
                For efficiency ratio calculation
              </div>
            </div>

            <div className="bg-gray-700 p-3 rounded">
              <div className="text-xs text-gray-400 mb-1">Last Activity</div>
              <div className="text-sm font-mono text-green-400">
                {new Date(telemetry.lastActivityTime).toLocaleTimeString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Idle detection starts after 120s threshold
              </div>
            </div>
          </div>

          <div className="mt-6 p-3 bg-gray-700 rounded border border-yellow-500">
            <h3 className="text-sm font-bold text-yellow-400 mb-2">💡 Integration Notes</h3>
            <ul className="text-xs text-gray-300 space-y-1">
              <li>• <strong>onDidChangeModelContent</strong>: Captures all edits</li>
              <li>• <strong>onDidFocusEditorText</strong>: Tracks focus violations</li>
              <li>• <strong>getValue()</strong>: Gets code for Run/Submit</li>
              <li>• Open browser console for detailed logs</li>
            </ul>
          </div>

          <div className="mt-4 p-3 bg-blue-900 rounded text-xs">
            <strong>📚 Reference:</strong> This demo implements the event listeners described in your thesis Section 1.2 (Behavioral Monitoring Algorithms)
          </div>
        </div>
      </div>
    </div>
  );
}

export default CodePlayground;
