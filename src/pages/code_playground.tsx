import { useState, useRef } from 'react';
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
  RotateCcw
} from 'lucide-react'; // Using Lucide React for clean icons

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
const Sidebar = () => (
  <aside className="w-16 bg-gray-900 border-r border-gray-700 flex flex-col items-center py-4 gap-6 text-gray-400">
    {/* Placeholder Icons */}
    <div className="p-2 bg-blue-600/10 text-blue-500 rounded-lg cursor-pointer">
      <FileCode size={24} />
    </div>
    <div className="p-2 hover:text-white cursor-pointer transition-colors">
      <BookOpen size={24} />
    </div>
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

// --- Main Page Component ---

interface CodePlaygroundProps {
  setActiveTab?: (tab: 'home' | 'playground') => void;
}

const CodePlayground = ({ setActiveTab }: CodePlaygroundProps = {}) => {
  // Default code for the activity
  const defaultCode = "# Write your Python code here\ndef main():\n    print('Hello rbAI!')\n\nif __name__ == '__main__':\n    main()";
  
  // State for code and output
  const [code, setCode] = useState(defaultCode);
  const [output, setOutput] = useState("> Ready to execute...");
  // State to handle loading status (good for UX)
  const [isRunning, setIsRunning] = useState(false);

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput("> Executing...");

    // 1. Prepare the payload matching your Pydantic 'ExecutionRequest' model
    // In a real scenario, session_id comes from auth, problem_id from the route/props
    const payload = {
      session_id: "test-session-001", // Placeholder for research prototyping
      problem_id: "activity-001",     // Placeholder
      code: code,
      stdin: "",                      // Add input handling if needed later
      telemetry: {
        // This maps to your "Telemetry Capture" stage in Figure 9a
        keystroke_count: 0, // You will need to hook this up to a real counter later
        timestamp: new Date().toISOString()
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
    setCode(defaultCode);
    setOutput("> Ready to execute...");
  };

  const handleExit = () => {
    if (setActiveTab) {
      setActiveTab('home');
    }
  };

  return (
    <div className="h-screen w-screen bg-gray-950 flex flex-col overflow-hidden font-sans">
      
      {/* 1. Header */}
      <Header activityTitle="Activity 1: Introduction to Loops" onExit={handleExit} />

      <div className="flex flex-1 overflow-hidden relative">
        
        {/* 2. Sidebar */}
        <Sidebar />

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
                    {`# Printing Patterns

Write a program that prints a pyramid pattern of asterisks based on user input \`n\`.

## Example

\`\`\`
Input: 5
Output:
*
**
***
****
*****
\`\`\`

## Requirements
- Ensure you use **nested loops** for this activity
- The program should handle any positive integer input
- Each line should contain the correct number of asterisks`}
                  </ReactMarkdown>
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
                      <span className="text-sm text-gray-400">main.py</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={handleRunCode}
                          disabled={isRunning}
                          className="flex items-center gap-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Play size={14} /> {isRunning ? 'Running...' : 'Run'}
                        </button>
                        <button className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors">
                          <Send size={14} /> Submit
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
                        defaultLanguage="python"
                        theme="vs-dark"
                        value={code}
                        onChange={(value) => setCode(value || "")}
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

      </div>
    </div>
  );
};

export default CodePlayground;