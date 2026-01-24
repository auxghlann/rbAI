import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useTheme } from '../contexts/ThemeContext';
import studentProfile from '../assets/stud_dp.png';
import { 
  X, 
  Play, 
  Send, 
  Bot,
  User,
  Terminal as TerminalIcon,
  BookOpen,
  RotateCcw,
  Activity as ActivityIcon,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  FileText,
  StickyNote,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Code as CodeIcon,
  Link as LinkIcon,
  Quote,
  AlignLeft,
  Settings,
  Sun,
  Moon
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

// 1. Header Section with Top Toolbar
interface HeaderProps {
  activityTitle: string;
  onExit: () => void;
  onSubmit: () => void;
  onAIToggle: () => void;
  onNotesToggle: () => void;
  isSubmitting: boolean;
  showAI: boolean;
  showNotes: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const Header = ({ 
  activityTitle, 
  onExit, 
  onSubmit, 
  onAIToggle, 
  onNotesToggle,
  isSubmitting,
  showAI,
  showNotes,
  theme,
  onToggleTheme
}: HeaderProps) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
  <header className={`h-12 ${theme === 'light' ? 'bg-[var(--bg-tertiary)] border-b border-[var(--border)]' : 'bg-[var(--bg-primary)]'} flex items-center justify-between px-6 text-[var(--text-primary)]`}>
    {/* Left: Exit and Title */}
    <div className="flex items-center gap-3 flex-1">
      <button 
        onClick={onExit} 
        className={`p-2 border border-[var(--border)] rounded-full transition-colors cursor-pointer ${theme === 'light' ? 'bg-[#d8dadd] hover:bg-[#c8cacd]' : 'bg-[#252526] hover:bg-[#2d2d30]'}`}
        title="Exit"
      >
        <X size={18} />
      </button>
      <h1 className="font-semibold text-sm tracking-wide">{activityTitle}</h1>
    </div>
    
    {/* Center: Action Buttons */}
    <div className="flex items-center gap-2">
      <button 
        onClick={onSubmit}
        disabled={isSubmitting}
        className={`flex items-center gap-2 px-3 py-1.5 border border-[var(--border)] text-[var(--text-primary)] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${theme === 'light' ? 'bg-[#d8dadd] hover:bg-[#c8cacd]' : 'bg-[#252526] hover:bg-[#2d2d30]'}`}
        title="Submit Code (Ctrl+Shift+Enter)"
      >
        <Send size={16} /> {isSubmitting ? 'Testing...' : 'Submit'}
      </button>
      <button 
        onClick={onAIToggle}
        className={`p-2 border border-[var(--border)] rounded transition-colors cursor-pointer text-[var(--text-secondary)] ${theme === 'light' ? 'bg-[#d8dadd] hover:bg-[#c8cacd]' : 'bg-[#252526] hover:bg-[#2d2d30]'}`}
        title="AI Assistant (Ctrl+Shift+P)"
      >
        <Bot size={18} />
      </button>
    </div>
    
    {/* Right: Settings and Environment Label */}
    <div className="flex-1 flex justify-end items-center gap-3">
      {/* Settings Dropdown */}
      <div className="relative" ref={settingsRef}>
        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className={`p-2 border border-[var(--border)] rounded-lg text-[var(--text-primary)] transition-colors ${theme === 'light' ? 'bg-[#d8dadd] hover:bg-[#c8cacd]' : 'bg-[#252526] hover:bg-[#2d2d30]'}`}
          aria-label="Open settings"
        >
          <Settings size={18} />
        </button>

        {isSettingsOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg z-50">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-[var(--text-tertiary)] uppercase">
                Settings
              </div>
              <button
                onClick={() => {
                  onToggleTheme();
                  setIsSettingsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                {theme === 'dark' ? (
                  <Sun size={16} />
                ) : (
                  <Moon size={16} />
                )}
                <span className="text-sm">
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="text-sm text-[var(--text-tertiary)]">rbAI Environment</div>
    </div>
  </header>
  );
};

// 2. Foldable Panel Wrapper Component
interface FoldablePanelProps {
  children: React.ReactNode;
  title: string;
  onFold: () => void;
  canMaximize?: boolean;
  isMaximized?: boolean;
  onMaximize?: () => void;
  onMinimize?: () => void;
  position?: 'left' | 'right' | 'top' | 'bottom';
  theme?: 'light' | 'dark';
}

const FoldablePanel = ({ 
  children, 
  title, 
  onFold, 
  canMaximize = true,
  isMaximized = false,
  onMaximize,
  onMinimize,
  position = 'left',
  theme = 'dark',
}: FoldablePanelProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const getFoldIcon = () => {
    switch (position) {
      case 'left': return <ChevronLeft size={16} />;
      case 'right': return <ChevronRight size={16} />;
      case 'top': return <ChevronUp size={16} />;
      case 'bottom': return <ChevronDown size={16} />;
    }
  };

  return (
    <div 
      className="h-full flex flex-col bg-[var(--bg-primary)] border-[var(--border)] rounded-lg shadow-lg overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Panel Header with Controls */}
      <div className={`h-10 border-b border-[var(--border)] flex items-center justify-between px-4 ${theme === 'light' ? 'bg-[var(--bg-secondary)]' : 'bg-[var(--bg-card)]'}`}>
        <span className="text-sm text-[var(--text-secondary)] font-medium">{title}</span>
        
        {/* Control Buttons - Show on Hover */}
        <div className={`flex items-center gap-2 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          {canMaximize && !isMaximized && onMaximize && (
            <button
              onClick={onMaximize}
              className="p-1 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Maximize"
            >
              <Maximize2 size={14} />
            </button>
          )}
          {canMaximize && isMaximized && onMinimize && (
            <button
              onClick={onMinimize}
              className="p-1 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Minimize"
            >
              <Minimize2 size={14} />
            </button>
          )}
          <button
            onClick={onFold}
            className="p-1 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Fold Panel"
          >
            {getFoldIcon()}
          </button>
        </div>
      </div>
      
      {/* Panel Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
};

// 4. Left Panel - Description Only
interface LeftPanelProps {
  activity: Activity;
  onFold: () => void;
  canMaximize?: boolean;
  isMaximized?: boolean;
  onMaximize?: () => void;
  onMinimize?: () => void;
  theme?: 'light' | 'dark';
}

const LeftPanel = ({ activity, onFold, canMaximize, isMaximized, onMaximize, onMinimize, theme = 'dark' }: LeftPanelProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="h-full flex flex-col bg-[var(--bg-primary)] rounded-lg shadow-lg overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Panel Header */}
      <div className={`border-b border-[var(--border)] ${theme === 'light' ? 'bg-[var(--bg-secondary)]' : 'bg-[var(--bg-card)]'}`}>
        <div className="flex items-center justify-between px-4 h-10">
          {/* Title */}
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-[var(--text-tertiary)]" />
            <span className="text-[var(--text-primary)] font-medium text-sm">Description</span>
          </div>
          
          {/* Control Buttons */}
          <div className={`flex items-center gap-2 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            {canMaximize && !isMaximized && onMaximize && (
              <button
                onClick={onMaximize}
                className="p-1 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                title="Maximize"
              >
                <Maximize2 size={14} />
              </button>
            )}
            {canMaximize && isMaximized && onMinimize && (
              <button
                onClick={onMinimize}
                className="p-1 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                title="Minimize"
              >
                <Minimize2 size={14} />
              </button>
            )}
            <button
              onClick={onFold}
              className="p-1 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              title="Fold Panel"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col p-1 py-3">
        <div className="flex-1 px-6 pb-6 text-[var(--text-secondary)] overflow-y-auto prose prose-invert max-w-none
          [&::-webkit-scrollbar]:w-2
          [&::-webkit-scrollbar-track]:bg-[var(--bg-card)]
          [&::-webkit-scrollbar-thumb]:bg-slate-500
          [&::-webkit-scrollbar-thumb]:rounded
          [&::-webkit-scrollbar-thumb:hover]:bg-slate-400
          [&::-webkit-scrollbar-button]:h-4
          [&::-webkit-scrollbar-button]:bg-[var(--bg-card)]
          [&::-webkit-scrollbar-button:hover]:bg-slate-600
          [&::-webkit-scrollbar-button:vertical:decrement]:border-b-8
          [&::-webkit-scrollbar-button:vertical:decrement]:border-b-slate-400
          [&::-webkit-scrollbar-button:vertical:decrement]:border-x-4
          [&::-webkit-scrollbar-button:vertical:decrement]:border-x-transparent
          [&::-webkit-scrollbar-button:vertical:increment]:border-t-8
          [&::-webkit-scrollbar-button:vertical:increment]:border-t-slate-400
          [&::-webkit-scrollbar-button:vertical:increment]:border-x-4
          [&::-webkit-scrollbar-button:vertical:increment]:border-x-transparent">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {activity.problemStatement}
          </ReactMarkdown>
          
          {/* Test Cases Section */}
          {activity.testCases && activity.testCases.length > 0 && (
            <div className="mt-6 border-t border-[var(--border)] pt-6">
              <h3 className="text-[var(--text-primary)] font-semibold mb-3">Test Cases</h3>
              {activity.testCases
                .filter(tc => !tc.isHidden)
                .map((testCase) => (
                  <div key={testCase.id} className="bg-[var(--bg-card)]/50 rounded p-3 mb-3 border border-[var(--border)]">
                    <div className="text-sm font-medium text-blue-400 mb-2">{testCase.name}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">
                      <div><span className="text-[var(--text-tertiary)]">Input:</span> {testCase.input}</div>
                      <div><span className="text-[var(--text-tertiary)]">Expected Output:</span> {testCase.expectedOutput}</div>
                    </div>
                  </div>
                ))}
            </div>
          )}
          
          {/* Hints Section */}
          {activity.hints && activity.hints.length > 0 && (
            <div className="mt-6 border-t border-[var(--border)] pt-6">
              <h3 className="text-[var(--text-primary)] font-semibold mb-3">💡 Hints</h3>
              <ul className="list-disc list-inside space-y-2">
                {activity.hints.map((hint, index) => (
                  <li key={index} className="text-sm text-[var(--text-tertiary)]">{hint}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {/* Bottom spacer - creates visual margin illusion */}
        <div className="h-6 bg-[var(--bg-primary)]"></div>
      </div>
    </div>
  );
};
const CodeBlock = ({ language, value }: { language: string; value: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4">
      <div className="absolute right-2 top-2 z-10">
        <button
          onClick={handleCopy}
          className="p-2 bg-[var(--bg-secondary)] hover:bg-gray-600 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
          title="Copy code"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          padding: '1rem',
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

// 6. Chat Panel Component - Standalone
interface ChatPanelProps {
  sessionId: string;
  problemId: string;
  problemStatement: string;
  language: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; isStreaming?: boolean }>;  
  setMessages: React.Dispatch<React.SetStateAction<Array<{ role: 'user' | 'assistant'; content: string; isStreaming?: boolean }>>>;
  onFold: () => void;
  canMaximize?: boolean;
  isMaximized?: boolean;
  onMaximize?: () => void;
  onMinimize?: () => void;
  theme?: 'light' | 'dark';
}

const ChatPanel = ({ sessionId, problemId, problemStatement, language, messages, setMessages, onFold, canMaximize, isMaximized, onMaximize, onMinimize, theme = 'dark' }: ChatPanelProps) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // Add empty assistant message that will be filled via streaming
    const assistantMessageIndex = messages.length + 1;
    setMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true }]);

    // Build chat history for context
    const chatHistory = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    try {
      // Create abort controller for canceling requests
      abortControllerRef.current = new AbortController();
      
      // Check if backend supports streaming (has /stream endpoint)
      const response = await fetch('http://localhost:8000/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          chat_history: chatHistory,
          session_id: sessionId,
          problem_id: problemId,
          problem_description: problemStatement,
          language: language
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No reader available');
      }

      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              break;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulatedContent += parsed.content;
                // Update the message content in real-time
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[assistantMessageIndex] = {
                    role: 'assistant',
                    content: accumulatedContent,
                    isStreaming: true
                  };
                  return newMessages;
                });
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      // Mark streaming as complete
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[assistantMessageIndex] = {
          role: 'assistant',
          content: accumulatedContent,
          isStreaming: false
        };
        return newMessages;
      });

    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Request was cancelled
        return;
      }
      
      // Fallback to non-streaming endpoint
      try {
        const response = await fetch('http://localhost:8000/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: userMessage,
            chat_history: chatHistory,
            session_id: sessionId,
            problem_id: problemId,
            problem_description: problemStatement,
            language: language
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[assistantMessageIndex] = {
              role: 'assistant',
              content: data.response,
              isStreaming: false
            };
            return newMessages;
          });
        } else {
          throw new Error('Non-streaming endpoint failed');
        }
      } catch (fallbackError) {
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[assistantMessageIndex] = {
            role: 'assistant',
            content: 'Sorry, I could not connect to the server. Please make sure the backend is running.',
            isStreaming: false
          };
          return newMessages;
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div 
      className="h-full bg-[var(--bg-primary)] flex flex-col rounded-lg shadow-lg overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Chat Header */}
      <div className={`h-10 flex items-center justify-between px-4 border-b border-[var(--border)] ${theme === 'light' ? 'bg-[var(--bg-secondary)]' : 'bg-[var(--bg-card)]'}`}>
        <div className="flex items-center gap-2">
          <Bot size={16} className={theme === 'light' ? 'text-blue-500' : 'text-blue-400'} />
          <span className="text-[var(--text-primary)] font-semibold text-sm">rbAI Assistant</span>
          <span className={`w-2 h-2 rounded-full animate-pulse ${theme === 'light' ? 'bg-blue-500' : 'bg-blue-400'}`}></span>
        </div>
        
        {/* Control Buttons */}
        <div className={`flex items-center gap-2 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          {canMaximize && !isMaximized && onMaximize && (
            <button
              onClick={onMaximize}
              className="p-1 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              title="Maximize"
            >
              <Maximize2 size={14} />
            </button>
          )}
          {canMaximize && isMaximized && onMinimize && (
            <button
              onClick={onMinimize}
              className="p-1 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              title="Minimize"
            >
              <Minimize2 size={14} />
            </button>
          )}
          <button
            onClick={onFold}
            className="p-1 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            title="Fold Panel"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-[var(--text-tertiary)] mt-8">
            <Bot size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-sm">Ask me anything about your code!</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {/* Profile Icon - Show on left for assistant, right for user */}
            {msg.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center mt-1">
                <Bot size={18} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-[80%] p-3 rounded-lg text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : theme === 'light' 
                    ? 'bg-gray-100 text-gray-900 border border-gray-300'
                    : 'bg-[var(--bg-card)] text-gray-200 border border-[var(--border)]'
              }`}
            >
              {/* Role label for clarity */}
              <div className={`text-xs font-semibold mb-1 opacity-70 ${
                msg.role === 'user' ? 'text-white' : theme === 'light' ? 'text-gray-700' : ''
              }`}>
                {msg.role === 'user' ? 'You' : 'rbAI Assistant'}
              </div>
              <div className={theme === 'light' ? 'prose prose-sm max-w-none' : 'prose prose-invert prose-sm max-w-none'}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      const language = match ? match[1] : '';
                      const value = String(children).replace(/\n$/, '');
                      
                      return !inline && language ? (
                        <CodeBlock language={language} value={value} />
                      ) : (
                        <code className={theme === 'light' 
                          ? 'bg-gray-200 px-1.5 py-0.5 rounded text-green-700 font-mono text-xs'
                          : 'bg-[var(--bg-primary)] px-1.5 py-0.5 rounded text-green-400 font-mono text-xs'} {...props}>
                          {children}
                        </code>
                      );
                    },
                    p: ({ children }) => <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc ml-4 mb-2 space-y-0.5">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal ml-4 mb-2 space-y-0.5">{children}</ol>,
                    li: ({ children }) => <li className={`leading-relaxed ${theme === 'light' ? 'text-gray-700' : 'text-[var(--text-secondary)]'}`}>{children}</li>,
                    h1: ({ children }) => <h1 className={`text-base font-bold mb-1 mt-2 first:mt-0 ${theme === 'light' ? 'text-gray-900' : 'text-[var(--text-primary)]'}`}>{children}</h1>,
                    h2: ({ children }) => <h2 className={`text-base font-bold mb-1 mt-2 first:mt-0 ${theme === 'light' ? 'text-gray-900' : 'text-[var(--text-primary)]'}`}>{children}</h2>,
                    h3: ({ children }) => <h3 className={`text-sm font-bold mb-1 mt-2 first:mt-0 ${theme === 'light' ? 'text-gray-900' : 'text-[var(--text-primary)]'}`}>{children}</h3>,
                    strong: ({ children }) => <strong className={`font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-[var(--text-primary)]'}`}>{children}</strong>,
                    a: ({ children, href }) => (
                      <a href={href} className="text-blue-600 hover:text-blue-700 underline" target="_blank" rel="noopener noreferrer">
                        {children}
                      </a>
                    ),
                  }}
                >
                  {msg.content || ' '}
                </ReactMarkdown>
                {msg.isStreaming && (
                  <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-1"></span>
                )}
              </div>
            </div>
            {/* Profile Icon - Show on right for user */}
            {msg.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden mt-1 border-2 border-gray-400">
                <img src={studentProfile} alt="Student" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center mt-1">
              <Bot size={18} className="text-white" />
            </div>
            <div className={theme === 'light' 
              ? 'bg-gray-100 border border-gray-300 p-3 rounded-lg text-sm text-gray-700'
              : 'bg-[var(--bg-card)] border border-[var(--border)] p-3 rounded-lg text-sm text-[var(--text-tertiary)]'}>
              <div className={`text-xs font-semibold mb-1 opacity-70 ${theme === 'light' ? 'text-gray-700' : ''}`}>rbAI Assistant</div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="p-4 bg-[var(--bg-card)] border-t border-[var(--border)]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask for help..."
            className="flex-1 bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 border border-[var(--border)]"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className="bg-green-600 p-2 rounded hover:bg-green-700 text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
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
  telemetry 
}: { 
  telemetry: TelemetryData | null;
}) => {
  // Show loading state if telemetry not yet computed
  if (!telemetry) {
    return (
      <div className="h-full bg-[var(--bg-primary)] flex flex-col items-center justify-center">
        <div className="text-purple-300 mb-2">Loading telemetry...</div>
        <div className="text-[var(--text-tertiary)] text-sm">Computing behavioral analysis</div>
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
    <div className="h-full bg-[var(--bg-primary)] flex flex-col rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-[var(--bg-tertiary)] p-3 flex items-center border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <ActivityIcon size={18} className="text-purple-500" />
          <span className="text-[var(--text-primary)] font-semibold text-sm">Live Behavioral Telemetry</span>
          <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
        </div>
        <div className="ml-auto">
          <span className="text-xs text-[var(--text-tertiary)] italic">Visual Aid Only</span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4 bg-[var(--bg-primary)]/50 flex-1 overflow-y-auto">
          {/* CES Score - Primary Metric */}
          <div className="bg-[var(--bg-card)]/80 rounded-lg p-4 mb-4 border border-purple-500/30">
            <div className="text-xs text-purple-300 uppercase tracking-wider mb-2">Cognitive Engagement Score</div>
            <div className={`text-4xl font-bold ${getCESColor(telemetry.ces)} mb-1`}>
              {telemetry.ces.toFixed(3)}
            </div>
            <div className="text-sm text-[var(--text-tertiary)]">{getCESLabel(telemetry.ces)}</div>
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
          <div className="bg-[var(--bg-card)]/80 rounded-lg p-3 mb-4 border border-[var(--border)]">
            <div className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Raw Telemetry</div>
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
          <div className="bg-[var(--bg-card)]/80 rounded-lg p-3 border border-[var(--border)]">
            <div className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Data Fusion States</div>
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
          <div className="mt-4 p-3 bg-purple-900/20 rounded border border-purple-500/20 text-xs text-[var(--text-tertiary)]">
            <div className="font-semibold text-purple-300 mb-1">CES Formula:</div>
            <div className="font-mono">0.40×KPM + 0.30×AD - 0.20×IR - 0.10×FVC</div>
          </div>
        </div>
      </div>
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
    <div className={`bg-[var(--bg-card)]/50 rounded p-3 border ${colorMap[color]}`}>
      <div className="text-xs text-[var(--text-tertiary)] mb-1">{label}</div>
      <div className="text-2xl font-bold mb-0.5">{value}</div>
      <div className="text-xs text-[var(--text-tertiary)]">{subtext}</div>
      <div className="text-xs text-gray-600 mt-1">Range: {range}</div>
    </div>
  );
};

const TelemetryRow = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex justify-between py-1">
    <span className="text-[var(--text-tertiary)]">{label}:</span>
    <span className="text-[var(--text-secondary)] font-medium">{value}</span>
  </div>
);

const StateRow = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
  <div className="flex items-center justify-between py-1.5 px-2 bg-[var(--bg-primary)]/50 rounded">
    <span className="text-[var(--text-tertiary)]">{icon} {label}:</span>
    <span className="text-purple-300 font-medium text-xs">{value}</span>
  </div>
);

// // 8. Finish Confirmation Dialog
// const FinishConfirmDialog = ({ 
//   isOpen, 
//   onConfirm, 
//   onCancel 
// }: { 
//   isOpen: boolean; 
//   onConfirm: () => void; 
//   onCancel: () => void;
// }) => {
//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 backdrop-blur-sm">
//       <div className="bg-[var(--bg-card)] rounded-lg shadow-2xl border border-[var(--border)] w-full max-w-md mx-4 p-6">
//         <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">Finish Activity?</h3>
//         <p className="text-[var(--text-secondary)] mb-6">
//           Are you sure you want to finish this activity? Your current progress and engagement metrics will be recorded.
//         </p>
//         <div className="flex justify-end gap-3">
//           <button
//             onClick={onCancel}
//             className="px-4 py-2 bg-[var(--bg-secondary)] hover:bg-gray-600 text-[var(--text-primary)] rounded transition-colors"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={onConfirm}
//             className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-[var(--text-primary)] rounded transition-colors font-semibold"
//           >
//             Yes, Finish
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

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
      <div className="bg-[var(--bg-primary)] rounded-lg shadow-2xl border border-[var(--border)] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-[var(--border)] bg-black/5 dark:bg-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            {message.icon}
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{message.title}</h2>
              <p className="text-[var(--text-secondary)] text-sm mt-1">{message.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-secondary)] rounded-full transition-colors cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Test Results Summary */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
            <h3 className="text-[var(--text-primary)] font-semibold mb-4 flex items-center gap-2">
              <CheckCircle size={20} className="text-green-400" />
              Test Results
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-[var(--bg-primary)] rounded-lg p-4 border border-[var(--border)]">
                <div className="text-[var(--text-tertiary)] text-sm mb-2">Tests Passed</div>
                <div className="text-3xl font-bold text-[var(--text-primary)] mb-1">
                  {result.testsPassed}/{result.testsTotal}
                </div>
                <div className={`text-sm font-semibold ${isPerfect ? 'text-green-400' : 'text-blue-400'}`}>
                  {passRate}% Pass Rate
                </div>
              </div>
              <div className="bg-[var(--bg-primary)] rounded-lg p-4 border border-[var(--border)]">
                <div className="text-[var(--text-tertiary)] text-sm mb-2">Execution Time</div>
                <div className="text-2xl font-bold text-[var(--text-primary)]">
                  {result.executionTime.toFixed(3)}s
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations for non-perfect scores */}
          {!isPerfect && result.completionType !== 'timeout' && (
            <div className="bg-[var(--bg-card)] border border-blue-500/30 rounded-lg p-5">
              <h3 className="text-blue-400 font-semibold mb-3 flex items-center gap-2">
                <TrendingUp size={18} />
                Recommendations
              </h3>
              <ul className="text-sm text-[var(--text-secondary)] space-y-2 list-disc list-inside">
                <li>Review the test cases that failed and understand the expected behavior</li>
                <li>Consider asking the AI tutor for hints on the failing cases</li>
                <li>You can retry this activity to improve your score</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-[var(--bg-card)] p-4 flex justify-end gap-3 border-t border-[var(--border)] flex-shrink-0">
          {onViewDashboard && (
            <button
              onClick={onViewDashboard}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer font-medium"
              title="Return to Dashboard"
            >
              <ChevronLeft size={18} />
              Back to Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// 10. Markdown Toolbar Component
interface MarkdownToolbarProps {
  onInsert: (before: string, after?: string) => void;
}

const MarkdownToolbar = ({ onInsert }: MarkdownToolbarProps) => (
  <div className="flex items-center gap-1 p-2 bg-[var(--bg-card)] border-b border-[var(--border)] flex-wrap">
    <button
      onClick={() => onInsert('**', '**')}
      className="p-2 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
      title="Bold"
    >
      <Bold size={16} />
    </button>
    <button
      onClick={() => onInsert('*', '*')}
      className="p-2 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
      title="Italic"
    >
      <Italic size={16} />
    </button>
    <div className="w-px h-6 bg-[var(--bg-secondary)] mx-1"></div>
    <button
      onClick={() => onInsert('# ', '')}
      className="p-2 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
      title="Heading 1"
    >
      <Heading1 size={16} />
    </button>
    <button
      onClick={() => onInsert('## ', '')}
      className="p-2 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
      title="Heading 2"
    >
      <Heading2 size={16} />
    </button>
    <button
      onClick={() => onInsert('### ', '')}
      className="p-2 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
      title="Heading 3"
    >
      <Heading3 size={16} />
    </button>
    <div className="w-px h-6 bg-[var(--bg-secondary)] mx-1"></div>
    <button
      onClick={() => onInsert('- ', '')}
      className="p-2 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
      title="Bullet List"
    >
      <List size={16} />
    </button>
    <button
      onClick={() => onInsert('1. ', '')}
      className="p-2 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
      title="Numbered List"
    >
      <ListOrdered size={16} />
    </button>
    <div className="w-px h-6 bg-[var(--bg-secondary)] mx-1"></div>
    <button
      onClick={() => onInsert('`', '`')}
      className="p-2 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
      title="Inline Code"
    >
      <CodeIcon size={16} />
    </button>
    <button
      onClick={() => onInsert('```\n', '\n```')}
      className="p-2 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
      title="Code Block"
    >
      <FileText size={16} />
    </button>
    <button
      onClick={() => onInsert('[', '](url)')}
      className="p-2 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
      title="Link"
    >
      <LinkIcon size={16} />
    </button>
    <button
      onClick={() => onInsert('> ', '')}
      className="p-2 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
      title="Quote"
    >
      <Quote size={16} />
    </button>
  </div>
);

// 11. Notes Editor Component with Live Preview
interface NotesEditorProps {
  notes: string;
  setNotes: (notes: string) => void;
}

const NotesEditor = ({ notes, setNotes }: NotesEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInsert = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = notes.substring(start, end);
    const newText = notes.substring(0, start) + before + selectedText + after + notes.substring(end);
    
    setNotes(newText);
    
    // Set cursor position
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + before.length + selectedText.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)]">
      <MarkdownToolbar onInsert={handleInsert} />
      <div className="flex-1 overflow-hidden">
        <textarea
          ref={textareaRef}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full h-full bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 focus:outline-none resize-none font-mono text-sm"
          placeholder="Write your notes here in Markdown format...\n\nUse the toolbar above for quick formatting."
          spellCheck={false}
        />
      </div>
    </div>
  );
};

// 11. Terminal with Tabs Component
interface TerminalWithTabsProps {
  output: string;
  testResults: any;
  activeTab: 'output' | 'tests';
  setActiveTab: (tab: 'output' | 'tests') => void;
  isMaximized: boolean;
  onMaximize: () => void;
  onMinimize: () => void;
  onFold: () => void;
  isSubmitting?: boolean;
  theme?: 'light' | 'dark';
}

const TerminalWithTabs = ({
  output,
  testResults,
  activeTab,
  setActiveTab,
  isMaximized,
  onMaximize,
  onMinimize,
  onFold,
  isSubmitting,
  theme = 'dark'
}: TerminalWithTabsProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="h-full flex flex-col bg-[var(--bg-primary)] rounded-lg shadow-lg overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tab Header */}
      <div className={`h-10 border-b border-[var(--border)] flex items-center justify-between px-4 ${theme === 'light' ? 'bg-[var(--bg-secondary)]' : 'bg-[var(--bg-card)]'}`}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('output')}
            className={`px-4 py-2 text-sm transition-colors rounded-t cursor-pointer ${
              activeTab === 'output'
                ? 'bg-[var(--bg-primary)] text-[var(--text-primary)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <TerminalIcon size={14} className="inline mr-2" />
            Output
          </button>
          <button
            onClick={() => setActiveTab('tests')}
            className={`px-4 py-2 text-sm transition-colors rounded-t cursor-pointer ${
              activeTab === 'tests'
                ? 'bg-[var(--bg-primary)] text-[var(--text-primary)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <CheckCircle size={14} className="inline mr-2" />
            Test Cases
          </button>
        </div>

        {/* Control Buttons */}
        <div className={`flex items-center gap-2 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          {!isMaximized && (
            <button
              onClick={onMaximize}
              className="p-1 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Maximize"
            >
              <Maximize2 size={14} />
            </button>
          )}
          {isMaximized && (
            <button
              onClick={onMinimize}
              className="p-1 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Minimize"
            >
              <Minimize2 size={14} />
            </button>
          )}
          <button
            onClick={onFold}
            className="p-1 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Fold Panel"
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'output' ? (
          <div className="h-full p-4 font-mono text-sm text-[var(--text-primary)] overflow-y-auto whitespace-pre-wrap">
            {output}
          </div>
        ) : (
          <div className="h-full p-4 overflow-y-auto">
            {testResults && testResults.length > 0 ? (
              <div className="space-y-3">
                {testResults.map((result: any, index: number) => (
                  <div 
                    key={index}
                    className={`p-3 rounded border ${
                      result.passed 
                        ? 'bg-green-900/20 border-green-700' 
                        : 'bg-red-900/20 border-red-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {result.passed ? (
                        <CheckCircle size={16} className="text-green-400" />
                      ) : (
                        <AlertCircle size={16} className="text-red-400" />
                      )}
                      <span className={`font-semibold ${
                        result.passed ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {result.test_name || `Test Case ${index + 1}`}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)] space-y-1 ml-6">
                      <div><span className="text-[var(--text-tertiary)]">Input:</span> {result.input}</div>
                      <div><span className="text-[var(--text-tertiary)]">Expected:</span> {result.expected_output}</div>
                      <div><span className="text-[var(--text-tertiary)]">Got:</span> {result.actual_output}</div>
                      {result.error && (
                        <div className="text-red-400 mt-2">
                          <span className="text-[var(--text-tertiary)]">Error:</span> {result.error}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : isSubmitting ? (
              <div className="text-[var(--text-primary)] text-sm font-semibold animate-pulse">
                Testing in progress... Please wait while we evaluate your code.
              </div>
            ) : (
              <div className="text-[var(--text-tertiary)] text-sm">
                No test results yet. Click Submit to run test cases.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// 12. Code Editor with Notes Tabs Component
interface CodeEditorWithNotesProps {
  code: string;
  setCode: (code: string) => void;
  handleCodeChange: (value: string | undefined) => void;
  handleEditorKeyDown: () => void;
  activity: Activity;
  showNotes: boolean;
  codePanelMaximized: boolean;
  onMaximize: () => void;
  onMinimize: () => void;
  onReset: () => void;
  onRunCode: (code?: string) => void;
  isRunning: boolean;
  onSubmit: (code?: string) => void;
  isSubmitting: boolean;
  activeTab: 'code' | 'notes';
  setActiveTab: (tab: 'code' | 'notes') => void;
  theme: 'light' | 'dark';
  editorRef: React.MutableRefObject<any>;
}

const CodeEditorWithNotes = ({
  code,
  setCode,
  handleCodeChange,
  handleEditorKeyDown,
  activity,
  showNotes,
  codePanelMaximized,
  onMaximize,
  onMinimize,
  onReset,
  onRunCode,
  isRunning,
  onSubmit,
  isSubmitting,
  activeTab,
  setActiveTab,
  theme,
  editorRef
}: CodeEditorWithNotesProps) => {
  const [notes, setNotes] = useState<string>('# My Notes\n\nStart writing your notes here...');
  const [isHovered, setIsHovered] = useState(false);

  const handleFormat = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  };

  // Auto-switch to notes tab when notes button is clicked
  useEffect(() => {
    if (showNotes) {
      setActiveTab('notes');
    }
  }, [showNotes]);

  return (
    <div 
      className="h-full flex flex-col bg-[var(--bg-primary)] rounded-lg shadow-lg overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tab Header */}
      <div className={`h-10 flex items-center justify-between px-4 border-b border-[var(--border)] ${theme === 'light' ? 'bg-[var(--bg-secondary)]' : 'bg-[var(--bg-card)]'}`}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-2 text-sm transition-colors rounded-t cursor-pointer ${
              activeTab === 'code'
                ? 'bg-[var(--bg-primary)] text-[var(--text-primary)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <CodeIcon size={14} className="inline mr-2" />
            Code
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2 text-sm transition-colors rounded-t cursor-pointer ${
              activeTab === 'notes'
                ? 'bg-[var(--bg-primary)] text-[var(--text-primary)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <StickyNote size={14} className="inline mr-2" />
            Notes
          </button>
        </div>

        {/* Control Buttons */}
        <div className={`flex items-center gap-2 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          {!codePanelMaximized && (
            <button
              onClick={onMaximize}
              className="p-1 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Maximize"
            >
              <Maximize2 size={14} />
            </button>
          )}
          {codePanelMaximized && (
            <button
              onClick={onMinimize}
              className="p-1 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Minimize"
            >
              <Minimize2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 relative flex flex-col">
        {activeTab === 'code' ? (
          <>
            {/* Code Editor Toolbar */}
            <div className="h-8 bg-[var(--bg-card)] border-b border-[var(--border)] flex items-center justify-between px-3">
              <div className="text-xs text-[var(--text-tertiary)] font-medium">
                Python3
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFormat}
                  className="flex items-center gap-1.5 px-2 py-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  title="Format Document (Ctrl+Alt+F)"
                >
                  <AlignLeft size={18} />
                </button>
                <button
                  onClick={() => onRunCode()}
                  disabled={isRunning}
                  className="flex items-center gap-1.5 px-2 py-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  title="Run Code (Ctrl+Enter)"
                >
                  <Play size={18} />
                </button>
                <button
                  onClick={onReset}
                  className="flex items-center gap-1.5 px-2 py-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  title="Reset Code (Ctrl+Alt+R)"
                >
                  <RotateCcw size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1">
              <Editor
                height="100%"
                defaultLanguage={activity.language}
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                value={code}
                onChange={handleCodeChange}
                onMount={(editor, monaco) => {
                  editorRef.current = editor;
                  editor.onKeyDown(handleEditorKeyDown);
                  
                  // Add keybindings for Run (Ctrl+Enter) and Submit (Ctrl+Shift+Enter)
                  editor.addCommand(
                    monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
                    () => {
                      if (!isRunning) {
                        // Get the latest code directly from the editor and pass it
                        const latestCode = editor.getValue();
                        setCode(latestCode);
                        onRunCode(latestCode);
                      }
                    }
                  );
                  
                  editor.addCommand(
                    monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter,
                    () => {
                      if (!isSubmitting) {
                        // Get the latest code directly from the editor and pass it
                        const latestCode = editor.getValue();
                        setCode(latestCode);
                        onSubmit(latestCode);
                      }
                    }
                  );
                  
                  // Ensure undo/redo is enabled
                  editor.focus();
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  padding: { top: 16 },
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  // Explicitly enable undo/redo
                  readOnly: false,
                  domReadOnly: false
                }}
              />
            </div>
          </>
        ) : (
          <NotesEditor notes={notes} setNotes={setNotes} />
        )}
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
  const { theme, toggleTheme } = useTheme();
  
  // State for code and output - initialize with activity's starter code
  const [code, setCode] = useState(activity.starterCode);
  const codeRef = useRef(activity.starterCode); // Track latest code
  const editorRef = useRef<any>(null); // Monaco editor reference
  const [output, setOutput] = useState("> Ready to execute...");
  // State to handle loading status (good for UX)
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  
  // Session tracking
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Completion state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);

  
  // Panel visibility state
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showTelemetryPanel, setShowTelemetryPanel] = useState(false);
  const [showTerminalPanel, setShowTerminalPanel] = useState(true);
  const [showNotesInEditor, setShowNotesInEditor] = useState(false);
  const [activeEditorTab, setActiveEditorTab] = useState<'code' | 'notes'>('code');
  const [activeTerminalTab, setActiveTerminalTab] = useState<'output' | 'tests'>('output');
  
  // Chat messages state - persists across panel toggles
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; isStreaming?: boolean }>>([]);
  
  // Panel maximize state - only one panel can be maximized at a time
  const [maximizedPanel, setMaximizedPanel] = useState<'left' | 'ai' | 'code' | 'terminal' | 'telemetry' | null>(null);
  
  // Start telemetry only when user begins coding
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [hasStartedCoding, setHasStartedCoding] = useState(false);
  
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
  
  // Use ref to prevent duplicate session creation in React StrictMode
  const sessionInitializedRef = useRef(false);
  
  // Create or load existing session on mount
  useEffect(() => {
    // Prevent duplicate session creation (including React StrictMode double-invocation)
    if (sessionId || sessionInitializedRef.current) {
      console.log('Session already exists or initialization in progress, skipping');
      return;
    }
    
    // Mark as initialized immediately to prevent race condition
    sessionInitializedRef.current = true;

    const initializeSession = async () => {
      try {
        // Get user from localStorage
        const userStr = localStorage.getItem('rbai_user');
        if (!userStr) {
          console.error('No user found in localStorage');
          return;
        }
        
        const user = JSON.parse(userStr);
        setUserId(user.id);
        
        // Only create sessions for students
        if (user.accountType !== 'student') {
          console.log('Skipping session creation for non-student user');
          return;
        }
        
        // Check for existing session (active or completed)
        const checkResponse = await fetch(
          `http://localhost:8000/api/sessions/active/${user.id}/${activity.id}`
        );
        
        if (checkResponse.ok) {
          const existingSession = await checkResponse.json();
          
          if (existingSession.exists) {
            // Resume active session with saved code
            setSessionId(existingSession.id);
            const savedCode = existingSession.saved_code || activity.starterCode;
            setCode(savedCode);
            codeRef.current = savedCode;
            setPreviousCode(savedCode);
            console.log('✅ Resumed active session:', existingSession.id);
            return;
          }
          
          // If previously completed, load their last code (LeetCode-style)
          if (existingSession.is_completed && existingSession.saved_code) {
            console.log('✓ Activity was completed before, loading previous code');
            const savedCode = existingSession.saved_code;
            setCode(savedCode);
            codeRef.current = savedCode;
            setPreviousCode(savedCode);
            // Fall through to create new session with this code
          }
        }
        
        // Create new session (either first time or after completion)
        const initialCode = code; // Use current code (might be from completed session)
        const response = await fetch('http://localhost:8000/api/sessions/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: user.id,
            activity_id: activity.id,
            activity_title: activity.title,
            initial_code: initialCode
          })
        });
        
        if (response.ok) {
          const session = await response.json();
          setSessionId(session.id);
          console.log('📝 New session created:', session.id);
        }
      } catch (error) {
        console.error('Failed to create session:', error);
      }
    };
    
    initializeSession();
  }, [activity.id]); // Use activity.id instead of activity object
  
  // Get raw telemetry to send to backend
  const getRawTelemetry = () => {
    // If user hasn't started coding yet, return minimal telemetry
    if (!sessionStartTime) {
      return {
        user_id: userId || 'unknown',
        problem_id: activity.id,
        session_duration_minutes: 0,
        total_keystrokes: 0,
        total_run_attempts: 0,
        total_idle_minutes: 0,
        focus_violation_count: 0,
        net_code_change: 0,
        last_edit_size_chars: 0,
        last_run_interval_seconds: 0,
        is_semantic_change: false,
        current_idle_duration: 0,
        is_window_focused: windowFocused,
        last_run_was_error: false
      };
    }
    
    const sessionDurationMs = Date.now() - sessionStartTime;
    const sessionDurationMin = sessionDurationMs / 60000;
    const currentIdle = idleStartTime ? (Date.now() - idleStartTime) / 1000 : 0;
    const lastRunInterval = lastRunTime ? (Date.now() - lastRunTime) / 1000 : 0;
    const isSemanticChange = code !== previousCode;
    
    return {
      user_id: userId || 'unknown',
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
    if (!sessionId || !userId) return;
    
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
        
        // Store CES score to database for analytics
        if (sessionId && userId) {
          await fetch('http://localhost:8000/api/sessions/ces', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: sessionId,
              kpm_effective: data.effective_kpm,
              ad_effective: data.effective_ad,
              ir_effective: data.effective_ir,
              fvc_effective: data.fvc,
              kpm_normalized: data.kpm,
              ad_normalized: data.ad,
              ir_normalized: data.ir,
              fvc_normalized: data.fvc,
              ces_score: data.ces,
              ces_classification: data.ces_classification,
              integrity_penalty: data.integrity_penalty,
              total_keystrokes: keystrokeCount,
              total_runs: runCount,
              idle_time_seconds: totalIdleTime * 60,
              active_time_seconds: rawTelemetry.session_duration_minutes * 60 - totalIdleTime * 60
            })
          }).catch(err => console.error('Failed to store CES:', err));
        }
      }
    } catch (error) {
      console.error("Failed to fetch telemetry:", error);
    }
  };
  
  // CORE TELEMETRY CAPTURE - Always running, independent of UI
  // This ensures analytics data is captured regardless of panel visibility
  // Only starts tracking once user begins coding
  useEffect(() => {
    if (!sessionId || !userId || showCompletionModal || !hasStartedCoding) return; 
    
    // Initial fetch and store to database
    fetchComputedTelemetry();
    
    // Continuously capture telemetry every 5 seconds for instructor analytics
    const interval = setInterval(fetchComputedTelemetry, 5000);
    return () => clearInterval(interval);
  }, [sessionId, userId, keystrokeCount, runCount, totalIdleTime, focusViolations, code, showCompletionModal, hasStartedCoding]);
  
  // OPTIONAL UI DISPLAY - Visual aid only, does not affect data capture
  // Updates display faster when student opens the telemetry panel for real-time feedback
  useEffect(() => {
    if (showTelemetryPanel && sessionId && userId) {
      const displayInterval = setInterval(fetchComputedTelemetry, 2000);
      return () => clearInterval(displayInterval);
    }
  }, [showTelemetryPanel, sessionId, userId]);
  
  // Auto-save code only when there are changes
  const lastSavedCodeRef = useRef(activity.starterCode);
  
  useEffect(() => {
    if (!sessionId) return;
    
    const saveInterval = setInterval(async () => {
      // Only save if code has changed since last save
      if (code === lastSavedCodeRef.current) {
        console.log('Code unchanged, skipping auto-save');
        return;
      }
      
      try {
        await fetch('http://localhost:8000/api/sessions/save-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            code: code
          })
        });
        lastSavedCodeRef.current = code; // Update last saved code
        console.log('Code auto-saved');
      } catch (error) {
        console.error('Failed to auto-save code:', error);
      }
    }, 5000); // Check every 5 seconds (reduced from 10s since we're smarter now)
    
    return () => clearInterval(saveInterval);
  }, [sessionId, code]);

  const handleRunCode = async (codeToRun?: string) => {
    // Use provided code or fall back to ref, then state
    // If codeToRun is not a string (e.g., it's an event object), ignore it
    const currentCode = (typeof codeToRun === 'string') ? codeToRun : codeRef.current;
    
    // Check if code contains input() function
    if (currentCode.includes('input(')) {
      setOutput(`> ❌ Error: input() function is not supported

The input() function is not supported in this environment.

Instead, please use one of these alternatives:

1. Use hardcoded values:
   name = "John"  # Instead of: name = input("Enter name: ")

For learning loops and algorithms, hardcoded test values work best!`);
      return;
    }

    setIsRunning(true);
    setActiveTerminalTab('output'); // Switch to output tab
    setOutput("> Executing...");
    
    // Update telemetry
    setRunCount(prev => prev + 1);
    const currentTime = Date.now();
    setLastRunTime(currentTime);
    
    // Store run attempt to database
    if (sessionId) {
      fetch('http://localhost:8000/api/sessions/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          code_content: currentCode,
          status: 'pending',
          tests_passed: 0,
          tests_failed: 0
        })
      }).catch(err => console.error('Failed to store run attempt:', err));
    }

    // 1. Prepare the payload matching your Pydantic 'ExecutionRequest' model
    // In a real scenario, session_id comes from auth, problem_id from the route/props
    const payload = {
      session_id: sessionId || "test-session-001", // Use real session ID
      problem_id: activity.id,
      code: currentCode,
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
    // Use editor API to preserve undo/redo history
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        // Push an undo stop to separate reset from previous edits
        editorRef.current.pushUndoStop();
        
        // Replace the entire content
        const fullRange = model.getFullModelRange();
        editorRef.current.executeEdits('reset', [{
          range: fullRange,
          text: activity.starterCode
        }]);
        
        // Push another undo stop after reset
        editorRef.current.pushUndoStop();
      }
    }
    
    setCode(activity.starterCode);
    setOutput("> Ready to execute...");
    setTestResults(null);
  };

  const handleSubmit = async (codeToRun?: string) => {
    // Use provided code or fall back to ref, then state
    // If codeToRun is not a string (e.g., it's an event object), ignore it
    const currentCode = (typeof codeToRun === 'string') ? codeToRun : codeRef.current;
    
    if (!activity.testCases || activity.testCases.length === 0) {
      setOutput("> No test cases available for this activity.");
      return;
    }

    setIsSubmitting(true);
    setActiveTerminalTab('tests'); // Switch to tests tab
    setShowTerminalPanel(true); // Show terminal panel if hidden
    setOutput("> ========================================\n> TESTING IN PROGRESS...\n> Please wait while we evaluate your code\n> ========================================\n");
    setTestResults(null);

    // Prepare test cases in the format expected by backend
    const testCases = activity.testCases.map(tc => ({
      input: tc.input,
      expected_output: tc.expectedOutput,
      description: tc.name
    }));

    const payload = {
      session_id: sessionId || "unknown-session",
      problem_id: activity.id,
      code: currentCode,
      stdin: "",
      test_cases: testCases,
      telemetry: {
        keystroke_count: keystrokeCount,
        time_since_last_run: lastRunTime ? (Date.now() - lastRunTime) / 1000 : 0,
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

      // Simple output message - detailed results are in Test Cases tab
      let terminalOutput = `> Tests completed: ${passedCount}/${totalCount} passed\n`;
      terminalOutput += `> Execution time: ${data.execution_time.toFixed(3)}s\n`;
      
      if (passedCount === totalCount) {
        terminalOutput += `\n> 🎉 All tests passed! Great job!\n`;
        terminalOutput += `> Check the Test Cases tab for detailed results.`;
        
        // Show completion modal but DON'T complete the session yet
        // This allows students to keep working even after passing
        // Session will only be completed when they close the modal
        console.log('Perfect score achieved! Showing completion modal...', { sessionId, passedCount, totalCount });
        
        // Prepare and show the result modal
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
          
          const result: SubmissionResult = {
            testsPassed: passedCount,
            testsTotal: totalCount,
            executionTime: data.execution_time || 0,
            cesScore: telemetryData?.ces || 0,
            cesClassification: telemetryData?.ces_classification || 'Unknown',
            provenanceState: telemetryData?.provenance_state || 'Unknown',
            iterationState: telemetryData?.iteration_state || 'Unknown',
            cognitiveState: telemetryData?.cognitive_state || 'Unknown',
            totalKeystrokes: keystrokeCount,
            totalRuns: runCount,
            sessionDuration: rawTelemetry.session_duration_minutes,
            completionType: 'perfect'
          };
          
          setSubmissionResult(result);
          setShowCompletionModal(true);
        } catch (error) {
          console.error('Failed to fetch telemetry for modal:', error);
          // Show modal anyway with available data
          setShowCompletionModal(true);
        }
      } else {
        terminalOutput += `\n> ⚠ Some tests failed. Check the Test Cases tab for details.`;
      }

      setOutput(terminalOutput);

    } catch (error: any) {
      setOutput(`> System Error: Failed to connect to rbAI backend.\n> ${error.message}`);
      console.error("Submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // New function to handle activity completion
  const handleFinishActivity = async (type: 'perfect' | 'partial' | 'manual' | 'timeout', testData?: any) => {
    console.log('handleFinishActivity called:', { type, sessionId, userId });
    
    if (!sessionId) {
      console.error('Cannot complete activity: sessionId is null!');
      setShowCompletionModal(true);
      return;
    }
    
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

      console.log('Completing session with:', { passedTests, totalTests, type, sessionId });

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
        sessionDuration: rawTelemetry.session_duration_minutes,
        completionType: type
      };

      setSubmissionResult(result);
      
      // Complete session in database BEFORE showing modal
      const completePayload = {
        session_id: sessionId,
        final_code: code,
        completion_type: type,
        tests_passed: passedTests,
        tests_total: totalTests,
        final_ces_score: telemetryData?.ces || 0,
        final_ces_classification: telemetryData?.ces_classification || 'Unknown'
      };
      
      console.log('Sending session completion request:', completePayload);
      
      const completeResponse = await fetch('http://localhost:8000/api/sessions/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completePayload)
      });
      
      if (completeResponse.ok) {
        const completeData = await completeResponse.json();
        console.log('✅ Session completed successfully:', completeData);
      } else {
        const errorText = await completeResponse.text();
        console.error('❌ Failed to complete session:', completeResponse.status, errorText);
      }
      
      // Show modal after session is completed
      setShowCompletionModal(true);
    } catch (error) {
      console.error('Failed to fetch final telemetry:', error);
      // Show modal anyway with available data
      setShowCompletionModal(true);
    }
  };

  // Handle code changes for telemetry
  const handleCodeChange = (value: string | undefined) => {
    if (value === undefined) return;
    
    // Start telemetry tracking on first code edit
    if (!hasStartedCoding && value !== activity.starterCode) {
      console.log('🎯 User started coding - telemetry tracking begins');
      setSessionStartTime(Date.now());
      setHasStartedCoding(true);
    }
    
    const editSize = Math.abs(value.length - code.length);
    setLastEditSize(editSize);
    setPreviousCode(code);
    setCode(value);
    codeRef.current = value; // Update ref immediately
    
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Enter: Run Code
      if (e.ctrlKey && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!isRunning) {
          handleRunCode();
        }
      }
      // Ctrl + Shift + Enter: Submit Code
      else if (e.ctrlKey && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        if (!isSubmitting) {
          // Get latest code from ref to avoid state lag
          const latestCode = codeRef.current;
          handleSubmit(latestCode);
        }
      }
      // Ctrl + Alt + R: Reset/Retry Code
      else if (e.ctrlKey && e.altKey && e.key === 'r') {
        e.preventDefault();
        handleReset();
      }
      // Ctrl + Alt + F: Format Code
      // else if (e.ctrlKey && e.altKey && e.key === 'f') {
      //   e.preventDefault();
      //   handleFormat();
      // }
      // Ctrl + Shift + P: Toggle AI Panel
      else if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setShowAIPanel(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRunning, isSubmitting]); // Include dependencies to access current state

  return (
    <div className="h-screen w-screen bg-[var(--bg-primary)] flex flex-col overflow-hidden font-sans">
      
      {/* 1. Header with Top Toolbar */}
      <Header 
        activityTitle={activity.title}
        onExit={onExit}
        onSubmit={() => handleSubmit(codeRef.current)}
        onAIToggle={() => setShowAIPanel(!showAIPanel)}
        onNotesToggle={() => setShowNotesInEditor(!showNotesInEditor)}
        isSubmitting={isSubmitting}
        showAI={showAIPanel}
        showNotes={showNotesInEditor}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area with Dynamic Panels */}
      <main className={`flex-1 flex overflow-hidden relative ${theme === 'light' ? 'bg-[#e8eaed]' : 'bg-[#1a1a1a]'}`}>
        
        <PanelGroup direction="horizontal">
          {/* Left Panel - Description/Notes (Conditional) */}
          {showLeftPanel && (
            <>
              <Panel 
                defaultSize={25} 
                minSize={15} 
                maxSize={80}
              >
                <div className="h-full p-1">
                  <LeftPanel
                    activity={activity}
                    onFold={() => setShowLeftPanel(false)}
                    canMaximize={true}
                    isMaximized={maximizedPanel === 'left'}
                    onMaximize={() => setMaximizedPanel('left')}
                    onMinimize={() => setMaximizedPanel(null)}
                    theme={theme}
                  />
                </div>
              </Panel>
              <PanelResizeHandle className={`w-1 hover:bg-blue-500 transition-colors cursor-col-resize ${theme === 'light' ? 'bg-[#e8eaed]' : 'bg-[#1a1a1a]'}`} />
            </>
          )}

          {/* Center/Right Container */}
          <Panel defaultSize={showLeftPanel ? 50 : 75} minSize={30}>
            <PanelGroup direction="horizontal">
              
              {/* Code and Terminal Section */}
              <Panel defaultSize={showAIPanel ? 70 : 100} minSize={40}>
                <PanelGroup direction="vertical">
                  
                  {/* Code Editor Panel with Tabs */}
                  <Panel 
                    defaultSize={showTerminalPanel ? 60 : 100} 
                    minSize={30}
                  >
                    <div className="h-full p-1">
                      <CodeEditorWithNotes
                        code={code}
                        setCode={setCode}
                        handleCodeChange={handleCodeChange}
                        handleEditorKeyDown={handleEditorKeyDown}
                        activity={activity}
                        showNotes={showNotesInEditor}
                        codePanelMaximized={maximizedPanel === 'code'}
                        onMaximize={() => setMaximizedPanel('code')}
                        onMinimize={() => setMaximizedPanel(null)}
                        onReset={handleReset}
                        onRunCode={handleRunCode}
                        isRunning={isRunning}
                        onSubmit={handleSubmit}
                        isSubmitting={isSubmitting}
                        activeTab={activeEditorTab}
                        setActiveTab={setActiveEditorTab}
                        theme={theme}
                        editorRef={editorRef}
                      />
                    </div>
                  </Panel>

                  {/* Terminal Panel (Conditional) */}
                  {showTerminalPanel && (
                    <>
                      <PanelResizeHandle className={`h-1 hover:bg-green-500 transition-colors cursor-row-resize ${theme === 'light' ? 'bg-[#e8eaed]' : 'bg-[#1a1a1a]'}`} />
                      <Panel 
                        defaultSize={40} 
                        minSize={20}
                      >
                        <div className="h-full p-1">
                          <TerminalWithTabs
                            output={output}
                            testResults={testResults}
                            activeTab={activeTerminalTab}
                            setActiveTab={setActiveTerminalTab}
                            isMaximized={maximizedPanel === 'terminal'}
                            onMaximize={() => setMaximizedPanel('terminal')}
                            onMinimize={() => setMaximizedPanel(null)}
                            onFold={() => setShowTerminalPanel(false)}
                            isSubmitting={isSubmitting}
                            theme={theme}
                          />
                        </div>
                      </Panel>
                    </>
                  )}

                </PanelGroup>
              </Panel>

            </PanelGroup>
          </Panel>

          {/* AI Chat Panel (Right Side, Conditional) */}
          {showAIPanel && (
            <>
              <PanelResizeHandle className={`w-1 hover:bg-purple-500 transition-colors cursor-col-resize ${theme === 'light' ? 'bg-[#e8eaed]' : 'bg-[#1a1a1a]'}`} />
              <Panel 
                defaultSize={30} 
                minSize={20} 
                maxSize={70}
              >
                <div className="h-full p-1">
                  <ChatPanel
                    sessionId="test-session-001"
                    problemId={activity.id}
                    problemStatement={activity.problemStatement}
                    language={activity.language}
                    messages={chatMessages}
                    setMessages={setChatMessages}
                    onFold={() => setShowAIPanel(false)}
                    canMaximize={true}
                    isMaximized={maximizedPanel === 'ai'}
                    onMaximize={() => setMaximizedPanel('ai')}
                    onMinimize={() => setMaximizedPanel(null)}
                    theme={theme}
                  />
                </div>
              </Panel>
            </>
          )}

          {/* Telemetry Panel (Right Side, Conditional) */}
          {showTelemetryPanel && (
            <>
              <PanelResizeHandle className={`w-1 hover:bg-purple-500 transition-colors cursor-col-resize ${theme === 'light' ? 'bg-[#e8eaed]' : 'bg-[#1a1a1a]'}`} />
              <Panel 
                defaultSize={25} 
                minSize={20} 
                maxSize={60}
              >
                <div className="h-full p-1">
                  <FoldablePanel
                    title="Live Telemetry"
                    onFold={() => setShowTelemetryPanel(false)}
                    canMaximize={true}
                    isMaximized={maximizedPanel === 'telemetry'}
                    onMaximize={() => setMaximizedPanel('telemetry')}
                    onMinimize={() => setMaximizedPanel(null)}
                    position="right"
                    theme={theme}
                  >
                    <LiveTelemetryPanel telemetry={computedTelemetry} />
                  </FoldablePanel>
                </div>
              </Panel>
            </>
          )}

        </PanelGroup>

        {/* Floating Action Button - Toggle Telemetry (Optional Visual Aid) */}
        <button
          onClick={() => setShowTelemetryPanel(!showTelemetryPanel)}
          className={`fixed bottom-6 right-6 p-3 rounded-full shadow-lg transition-colors z-50 cursor-pointer ${
            showTelemetryPanel 
              ? 'bg-purple-600 hover:bg-purple-700' 
              : 'bg-[var(--bg-secondary)] hover:bg-gray-600'
          } text-[var(--text-primary)]`}
          title="Toggle Telemetry Panel (Visual Aid)"
        >
          <ActivityIcon size={20} />
        </button>

        {/* Floating Action Button - Toggle Terminal (when hidden) */}
        {!showTerminalPanel && (
          <button
            onClick={() => setShowTerminalPanel(true)}
            className="fixed bottom-20 right-6 p-3 bg-[var(--bg-secondary)] hover:bg-gray-600 rounded-full shadow-lg transition-colors z-50 text-[var(--text-primary)] cursor-pointer"
            title="Show Terminal"
          >
            <TerminalIcon size={20} />
          </button>
        )}

      </main>

      {/* Maximized Panel Overlays */}
      {maximizedPanel === 'left' && showLeftPanel && (
        <div className="fixed inset-0 z-[100] bg-[var(--bg-primary)] flex flex-col p-2" style={{ top: '48px' }}>
          <LeftPanel
            activity={activity}
            onFold={() => {
              setMaximizedPanel(null);
              setShowLeftPanel(false);
            }}
            canMaximize={true}
            isMaximized={true}
            onMaximize={() => {}}
            onMinimize={() => setMaximizedPanel(null)}
            theme={theme}
          />
        </div>
      )}

      {maximizedPanel === 'ai' && showAIPanel && (
        <div className="fixed inset-0 z-[100] bg-[var(--bg-primary)] flex flex-col p-2" style={{ top: '48px' }}>
          <ChatPanel
            sessionId="test-session-001"
            problemId={activity.id}
            problemStatement={activity.problemStatement}
            language={activity.language}
            messages={chatMessages}
            setMessages={setChatMessages}
            onFold={() => {
              setMaximizedPanel(null);
              setShowAIPanel(false);
            }}
            canMaximize={true}
            isMaximized={true}
            onMaximize={() => {}}
            onMinimize={() => setMaximizedPanel(null)}
            theme={theme}
          />
        </div>
      )}

      {maximizedPanel === 'code' && (
        <div className="fixed inset-0 z-[100] bg-[var(--bg-primary)] flex flex-col p-2" style={{ top: '48px' }}>
          <CodeEditorWithNotes
            code={code}
            setCode={setCode}
            handleCodeChange={handleCodeChange}
            handleEditorKeyDown={handleEditorKeyDown}
            activity={activity}
            showNotes={showNotesInEditor}
            codePanelMaximized={true}
            onMaximize={() => {}}
            onMinimize={() => setMaximizedPanel(null)}
            onReset={handleReset}
            onRunCode={handleRunCode}
            isRunning={isRunning}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            activeTab={activeEditorTab}
            setActiveTab={setActiveEditorTab}
            theme={theme}
            editorRef={editorRef}
          />
        </div>
      )}

      {maximizedPanel === 'terminal' && showTerminalPanel && (
        <div className="fixed inset-0 z-[100] bg-[var(--bg-primary)] flex flex-col p-2" style={{ top: '48px' }}>
          <TerminalWithTabs
            output={output}
            testResults={testResults}
            activeTab={activeTerminalTab}
            setActiveTab={setActiveTerminalTab}
            isMaximized={true}
            onMaximize={() => {}}
            onMinimize={() => setMaximizedPanel(null)}
            onFold={() => {
              setMaximizedPanel(null);
              setShowTerminalPanel(false);
            }}
            isSubmitting={isSubmitting}
            theme={theme}
          />
        </div>
      )}

      {maximizedPanel === 'telemetry' && showTelemetryPanel && (
        <div className="fixed inset-0 z-[100] bg-[var(--bg-primary)] flex flex-col p-4" style={{ top: '48px' }}>
          <FoldablePanel
            title="Live Telemetry"
            onFold={() => {
              setMaximizedPanel(null);
              setShowTelemetryPanel(false);
            }}
            canMaximize={true}
            isMaximized={true}
            onMaximize={() => {}}
            onMinimize={() => setMaximizedPanel(null)}
            position="right"
            theme={theme}
          >
            <LiveTelemetryPanel telemetry={computedTelemetry} />
          </FoldablePanel>
        </div>
      )}

      {/* Additional Action Buttons for Quick Access */}
      <div className="fixed bottom-6 left-6 flex gap-2 z-50">
        {!showLeftPanel && (
          <button
            onClick={() => setShowLeftPanel(true)}
            className="p-3 bg-[var(--bg-secondary)] hover:bg-gray-600 rounded-full shadow-lg transition-colors text-[var(--text-primary)] cursor-pointer"
            title="Show Description/Notes"
          >
            <BookOpen size={20} />
          </button>
        )}
      </div>

      {/* 8. Completion Modal */}
      <CompletionModal
          isOpen={showCompletionModal}
          onClose={async () => {
            // Complete the session when modal is closed
            if (sessionId && submissionResult) {
              try {
                await fetch('http://localhost:8000/api/sessions/complete', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    session_id: sessionId,
                    final_code: codeRef.current,
                    completion_type: submissionResult.completionType,
                    tests_passed: submissionResult.testsPassed,
                    tests_total: submissionResult.testsTotal,
                    final_ces_score: submissionResult.cesScore,
                    final_ces_classification: submissionResult.cesClassification
                  })
                });
                console.log('Session completed on modal close');
              } catch (error) {
                console.error('Failed to complete session:', error);
              }
            }
            setShowCompletionModal(false);
          }}
          result={submissionResult}
          onViewDashboard={async () => {
            // Complete the session when viewing dashboard
            if (sessionId && submissionResult) {
              try {
                await fetch('http://localhost:8000/api/sessions/complete', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    session_id: sessionId,
                    final_code: codeRef.current,
                    completion_type: submissionResult.completionType,
                    tests_passed: submissionResult.testsPassed,
                    tests_total: submissionResult.testsTotal,
                    final_ces_score: submissionResult.cesScore,
                    final_ces_classification: submissionResult.cesClassification
                  })
                });
                console.log('Session completed before exiting');
              } catch (error) {
                console.error('Failed to complete session:', error);
              }
            }
            onExit();
          }}
        />
    </div>
  );
};

export default CodePlayground;
