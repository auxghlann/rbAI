import { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import Draggable from 'react-draggable';
import { 
  X, 
  FileCode, 
  Settings, 
  Play, 
  Send, 
  MessageSquare, 
  Terminal as TerminalIcon,
  BookOpen
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
            Hello! I am your AI guide. I noticed you paused on the loop structure. Do you need a hint?
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
  // State for code and output
  const [code, setCode] = useState("# Write your Python code here\ndef main():\n    print('Hello rbAI!')\n\nif __name__ == '__main__':\n    main()");
  const [output, setOutput] = useState("> Ready to execute...");

  const handleRunCode = () => {
    setOutput("> Compiling...\n> Hello rbAI!\n> Process finished with exit code 0");
    // TODO: Integrate your backend compilation logic here
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
          
          {/* 3. Left Panel: Problem Instructions */}
          <section className="w-1/3 bg-gray-900 border-r border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-800 bg-gray-800/30">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <BookOpen size={18} className="text-blue-400"/> Problem Description
              </h2>
            </div>
            <div className="flex-1 p-6 text-gray-300 overflow-y-auto prose prose-invert max-w-none">
              <h3 className="text-xl text-white font-bold mb-2">Printing Patterns</h3>
              <p className="mb-4">
                Write a program that prints a pyramid pattern of asterisks based on user input <code>n</code>.
              </p>
              <div className="bg-gray-800 p-4 rounded-md border border-gray-700 mb-4 font-mono text-sm">
                Input: 5<br/>
                Output:<br/>
                *<br/>
                **<br/>
                ***<br/>
                ****<br/>
                *****
              </div>
              <p>Ensure you use nested loops for this activity.</p>
            </div>
          </section>

          {/* Right Side Container */}
          <section className="flex-1 flex flex-col min-w-0">
            
            {/* 4. Right Upper Panel: Code Editor */}
            <div className="h-2/3 flex flex-col bg-[#1e1e1e]">
              <div className="h-10 bg-[#2d2d2d] flex items-center justify-between px-4 border-b border-[#1e1e1e]">
                <span className="text-sm text-gray-400">main.py</span>
                <div className="flex gap-2">
                  <button 
                    onClick={handleRunCode}
                    className="flex items-center gap-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                  >
                    <Play size={14} /> Run
                  </button>
                  <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors">
                    Submit
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

            {/* 5. Right Lower Panel: Terminal */}
            <div className="h-1/3 bg-gray-900 border-t border-gray-700 flex flex-col">
              <div className="h-8 bg-gray-800 flex items-center px-4 border-b border-gray-700">
                <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-2">
                  <TerminalIcon size={14} /> Terminal / Output
                </span>
              </div>
              <div className="flex-1 p-4 font-mono text-sm text-green-400 overflow-y-auto whitespace-pre-wrap">
                {output}
              </div>
            </div>

          </section>
        </main>

        {/* 6. Moveable Chatbot Overlay */}
        <DraggableChatbot />

      </div>
    </div>
  );
};

export default CodePlayground;