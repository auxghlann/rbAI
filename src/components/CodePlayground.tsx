import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useTheme } from '../contexts/ThemeContext';
import { 
  X, 
  Play, 
  Send, 
  Bot,
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
  <header className="h-12 bg-[var(--bg-primary)] border-b border-[var(--border)] flex items-center justify-between px-6 text-[var(--text-primary)]">
    {/* Left: Exit and Title */}
    <div className="flex items-center gap-3 flex-1">
      <button 
        onClick={onExit} 
        className="p-2 hover:bg-[var(--bg-card)] rounded-full transition-colors cursor-pointer"
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
        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        title="Submit Code (Ctrl+Shift+Enter)"
      >
        <Send size={16} /> {isSubmitting ? 'Testing...' : 'Submit'}
      </button>
      <button 
        onClick={onAIToggle}
        className={`p-2 rounded transition-colors cursor-pointer ${
          showAI 
            ? 'bg-purple-600 hover:bg-purple-700 text-[var(--text-primary)]' 
            : 'bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
        }`}
        title="AI Assistant"
      >
        <Bot size={18} />
      </button>
      <button 
        onClick={onNotesToggle}
        className={`p-2 rounded transition-colors cursor-pointer ${
          showNotes 
            ? 'bg-blue-600 hover:bg-blue-700 text-[var(--text-primary)]' 
            : 'bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
        }`}
        title="Notes"
      >
        <StickyNote size={18} />
      </button>
    </div>
    
    {/* Right: Environment Label and Settings */}
    <div className="flex-1 flex justify-end items-center gap-3">
      <div className="text-sm text-[var(--text-tertiary)]">rbAI Environment</div>
      
      {/* Settings Dropdown */}
      <div className="relative" ref={settingsRef}>
        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="p-2 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-primary)] transition-colors"
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
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] transition-colors"
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
}

const FoldablePanel = ({ 
  children, 
  title, 
  onFold, 
  canMaximize = true,
  isMaximized = false,
  onMaximize,
  onMinimize,
  position = 'left'
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
      className="h-full flex flex-col bg-[var(--bg-primary)] border-[var(--border)]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Panel Header with Controls */}
      <div className="h-10 bg-[var(--bg-card)] border-b border-[var(--border)] flex items-center justify-between px-4">
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
}

const LeftPanel = ({ activity, onFold, canMaximize, isMaximized, onMaximize, onMinimize }: LeftPanelProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="h-full flex flex-col bg-[var(--bg-primary)]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Panel Header */}
      <div className="bg-[var(--bg-card)] border-b border-[var(--border)]">
        <div className="flex items-center justify-between px-4 h-10">
          {/* Title */}
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-blue-400" />
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
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-6 text-[var(--text-secondary)] overflow-y-auto prose prose-invert max-w-none
          [&::-webkit-scrollbar]:w-2
          [&::-webkit-scrollbar-track]:bg-[var(--bg-card)]
          [&::-webkit-scrollbar-thumb]:bg-slate-600
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb:hover]:bg-slate-500">
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
          className="p-2 bg-[var(--bg-secondary)] hover:bg-gray-600 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all opacity-0 group-hover:opacity-100"
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
  onFold: () => void;
  canMaximize?: boolean;
  isMaximized?: boolean;
  onMaximize?: () => void;
  onMinimize?: () => void;
}

const ChatPanel = ({ sessionId, problemId, onFold, canMaximize, isMaximized, onMaximize, onMinimize }: ChatPanelProps) => {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; isStreaming?: boolean }>>([]);
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
          problem_id: problemId
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
            problem_id: problemId
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
      className="h-full bg-[var(--bg-primary)] flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Chat Header */}
      <div className="h-10 bg-gradient-to-r from-purple-900 to-purple-800 flex items-center justify-between px-4 border-b border-purple-700">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-purple-300" />
          <span className="text-[var(--text-primary)] font-semibold text-sm">rbAI Assistant</span>
          <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
        </div>
        
        {/* Control Buttons */}
        <div className={`flex items-center gap-2 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          {canMaximize && !isMaximized && onMaximize && (
            <button
              onClick={onMaximize}
              className="p-1 hover:bg-purple-800 rounded text-purple-300 hover:text-[var(--text-primary)] transition-colors"
              title="Maximize"
            >
              <Maximize2 size={14} />
            </button>
          )}
          {canMaximize && isMaximized && onMinimize && (
            <button
              onClick={onMinimize}
              className="p-1 hover:bg-purple-800 rounded text-purple-300 hover:text-[var(--text-primary)] transition-colors"
              title="Minimize"
            >
              <Minimize2 size={14} />
            </button>
          )}
          <button
            onClick={onFold}
            className="p-1 hover:bg-purple-800 rounded text-purple-300 hover:text-[var(--text-primary)] transition-colors"
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
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] p-3 rounded-lg text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-[var(--text-primary)]'
                  : 'bg-[var(--bg-card)] text-gray-200 border border-[var(--border)]'
              }`}
            >
              <div className="prose prose-invert prose-sm max-w-none">
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
                        <code className="bg-[var(--bg-primary)] px-1.5 py-0.5 rounded text-green-400 font-mono text-xs" {...props}>
                          {children}
                        </code>
                      );
                    },
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="text-[var(--text-secondary)]">{children}</li>,
                    h1: ({ children }) => <h1 className="text-xl font-bold mb-2 text-[var(--text-primary)]">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-lg font-bold mb-2 text-[var(--text-primary)]">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-base font-bold mb-2 text-[var(--text-primary)]">{children}</h3>,
                    strong: ({ children }) => <strong className="font-semibold text-[var(--text-primary)]">{children}</strong>,
                    a: ({ children, href }) => (
                      <a href={href} className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">
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
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[var(--bg-card)] border border-[var(--border)] p-3 rounded-lg text-sm text-[var(--text-tertiary)]">
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
            className="bg-green-600 p-2 rounded hover:bg-green-700 text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
    <div className="h-full bg-[var(--bg-primary)] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900 to-purple-800 p-3 flex items-center border-b border-purple-700">
        <div className="flex items-center gap-2">
          <ActivityIcon size={18} className="text-purple-300" />
          <span className="text-[var(--text-primary)] font-semibold text-sm">Live Behavioral Telemetry</span>
          <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 bg-[var(--bg-primary)]/50 flex-1 overflow-y-auto">
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
        <div className={`${message.bgColor} p-4 text-[var(--text-primary)] flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {message.icon}
              <div>
                <h2 className="text-xl font-bold">{message.title}</h2>
                <p className="text-[var(--text-primary)]/90 text-sm mt-1">{message.subtitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Test Results Summary */}
          <div className="bg-[var(--bg-card)] rounded-lg p-3">
            <h3 className="text-[var(--text-primary)] font-semibold mb-2 flex items-center gap-2 text-sm">
              <CheckCircle size={18} className="text-green-400" />
              Test Results
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[var(--text-tertiary)] text-sm">Tests Passed</div>
                <div className="text-3xl font-bold text-[var(--text-primary)]">
                  {result.testsPassed}/{result.testsTotal}
                </div>
                <div className={`text-sm font-semibold ${isPerfect ? 'text-green-400' : 'text-blue-400'}`}>
                  {passRate}% Pass Rate
                </div>
              </div>
              <div>
                <div className="text-[var(--text-tertiary)] text-sm">Execution Time</div>
                <div className="text-2xl font-bold text-[var(--text-primary)]">
                  {result.executionTime.toFixed(3)}s
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations for non-perfect scores */}
          {!isPerfect && result.completionType !== 'timeout' && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-blue-400 font-semibold mb-2">💡 Recommendations</h3>
              <ul className="text-sm text-[var(--text-secondary)] space-y-1 list-disc list-inside">
                <li>Review the test cases that failed and understand the expected behavior</li>
                <li>Consider asking the AI tutor for hints on the failing cases</li>
                <li>You can retry this activity to improve your score</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-[var(--bg-card)] p-3 flex justify-end gap-2 border-t border-[var(--border)] flex-shrink-0">
          {onViewDashboard && (
            <button
              onClick={onViewDashboard}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-[var(--text-primary)] text-sm rounded transition-colors cursor-pointer"
              title="Return to Dashboard"
            >
              <ChevronLeft size={16} />
              Dashboard
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
  isSubmitting
}: TerminalWithTabsProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="h-full flex flex-col bg-[var(--bg-primary)]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tab Header */}
      <div className="h-10 bg-[var(--bg-card)] border-b border-[var(--border)] flex items-center justify-between px-4">
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
  theme
}: CodeEditorWithNotesProps) => {
  const [notes, setNotes] = useState<string>('# My Notes\n\nStart writing your notes here...');
  const [isHovered, setIsHovered] = useState(false);
  const editorRef = useRef<any>(null);

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
      className="h-full flex flex-col bg-[var(--bg-primary)]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tab Header */}
      <div className="h-10 bg-[var(--bg-card)] flex items-center justify-between px-4 border-b border-[var(--border)]">
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
                  title="Format Document"
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
                  title="Reset Code"
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
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  padding: { top: 16 }
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
  const [output, setOutput] = useState("> Ready to execute...");
  // State to handle loading status (good for UX)
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  
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
  
  // Panel maximize state - only one panel can be maximized at a time
  const [maximizedPanel, setMaximizedPanel] = useState<'left' | 'ai' | 'code' | 'terminal' | 'telemetry' | null>(null);
  
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
  
  // Periodically update telemetry when telemetry panel is visible
  useEffect(() => {
    if (showTelemetryPanel) {
      fetchComputedTelemetry();
      const interval = setInterval(fetchComputedTelemetry, 3000); // Update every 3 seconds
      return () => clearInterval(interval);
    }
  }, [showTelemetryPanel, keystrokeCount, runCount, totalIdleTime, focusViolations, code]);

  const handleRunCode = async (codeToRun?: string) => {
    // Use provided code or fall back to ref, then state
    const currentCode = codeToRun ?? codeRef.current;
    
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

    // 1. Prepare the payload matching your Pydantic 'ExecutionRequest' model
    // In a real scenario, session_id comes from auth, problem_id from the route/props
    const payload = {
      session_id: "test-session-001", // Placeholder for research prototyping
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
    setCode(activity.starterCode);
    setOutput("> Ready to execute...");
    setTestResults(null);
  };

  const handleSubmit = async (codeToRun?: string) => {
    // Use provided code or fall back to ref, then state
    const currentCode = codeToRun ?? codeRef.current;
    
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
      session_id: "test-session-001",
      problem_id: activity.id,
      code: currentCode,
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

      // Simple output message - detailed results are in Test Cases tab
      let terminalOutput = `> Tests completed: ${passedCount}/${totalCount} passed\n`;
      terminalOutput += `> Execution time: ${data.execution_time.toFixed(3)}s\n`;
      
      if (passedCount === totalCount) {
        terminalOutput += `\n> 🎉 All tests passed! Great job!\n`;
        terminalOutput += `> Check the Test Cases tab for detailed results.`;
      } else {
        terminalOutput += `\n> ⚠ Some tests failed. Check the Test Cases tab for details.`;
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
          handleSubmit();
        }
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
        onSubmit={handleSubmit}
        onAIToggle={() => setShowAIPanel(!showAIPanel)}
        onNotesToggle={() => setShowNotesInEditor(!showNotesInEditor)}
        isSubmitting={isSubmitting}
        showAI={showAIPanel}
        showNotes={showNotesInEditor}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area with Dynamic Panels */}
      <main className="flex-1 flex overflow-hidden relative">
        
        <PanelGroup direction="horizontal">
          {/* Left Panel - Description/Notes (Conditional) */}
          {showLeftPanel && (
            <>
              <Panel 
                defaultSize={25} 
                minSize={15} 
                maxSize={80}
              >
                <LeftPanel
                  activity={activity}
                  onFold={() => setShowLeftPanel(false)}
                  canMaximize={true}
                  isMaximized={maximizedPanel === 'left'}
                  onMaximize={() => setMaximizedPanel('left')}
                  onMinimize={() => setMaximizedPanel(null)}
                />
              </Panel>
              <PanelResizeHandle className="w-1 bg-[var(--bg-secondary)] hover:bg-blue-500 transition-colors cursor-col-resize" />
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
                    />
                  </Panel>

                  {/* Terminal Panel (Conditional) */}
                  {showTerminalPanel && (
                    <>
                      <PanelResizeHandle className="h-1 bg-[var(--bg-secondary)] hover:bg-green-500 transition-colors cursor-row-resize" />
                      <Panel 
                        defaultSize={40} 
                        minSize={20}
                      >
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
                        />
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
              <PanelResizeHandle className="w-1 bg-[var(--bg-secondary)] hover:bg-purple-500 transition-colors cursor-col-resize" />
              <Panel 
                defaultSize={30} 
                minSize={20} 
                maxSize={70}
              >
                <ChatPanel
                  sessionId="test-session-001"
                  problemId={activity.id}
                  onFold={() => setShowAIPanel(false)}
                  canMaximize={true}
                  isMaximized={maximizedPanel === 'ai'}
                  onMaximize={() => setMaximizedPanel('ai')}
                  onMinimize={() => setMaximizedPanel(null)}
                />
              </Panel>
            </>
          )}

          {/* Telemetry Panel (Right Side, Conditional) */}
          {showTelemetryPanel && (
            <>
              <PanelResizeHandle className="w-1 bg-[var(--bg-secondary)] hover:bg-purple-500 transition-colors cursor-col-resize" />
              <Panel 
                defaultSize={25} 
                minSize={20} 
                maxSize={60}
              >
                <FoldablePanel
                  title="Live Telemetry"
                  onFold={() => setShowTelemetryPanel(false)}
                  canMaximize={true}
                  isMaximized={maximizedPanel === 'telemetry'}
                  onMaximize={() => setMaximizedPanel('telemetry')}
                  onMinimize={() => setMaximizedPanel(null)}
                  position="right"
                >
                  <LiveTelemetryPanel telemetry={computedTelemetry} />
                </FoldablePanel>
              </Panel>
            </>
          )}

        </PanelGroup>

        {/* Floating Action Button - Toggle Telemetry */}
        <button
          onClick={() => setShowTelemetryPanel(!showTelemetryPanel)}
          className={`fixed bottom-6 right-6 p-3 rounded-full shadow-lg transition-colors z-50 cursor-pointer ${
            showTelemetryPanel 
              ? 'bg-purple-600 hover:bg-purple-700' 
              : 'bg-[var(--bg-secondary)] hover:bg-gray-600'
          } text-[var(--text-primary)]`}
          title="Toggle Telemetry Panel"
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
        <div className="fixed inset-0 z-[100] bg-[var(--bg-primary)] flex flex-col" style={{ top: '48px' }}>
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
          />
        </div>
      )}

      {maximizedPanel === 'ai' && showAIPanel && (
        <div className="fixed inset-0 z-[100] bg-[var(--bg-primary)] flex flex-col" style={{ top: '48px' }}>
          <ChatPanel
            sessionId="test-session-001"
            problemId={activity.id}
            onFold={() => {
              setMaximizedPanel(null);
              setShowAIPanel(false);
            }}
            canMaximize={true}
            isMaximized={true}
            onMaximize={() => {}}
            onMinimize={() => setMaximizedPanel(null)}
          />
        </div>
      )}

      {maximizedPanel === 'code' && (
        <div className="fixed inset-0 z-[100] bg-[var(--bg-primary)] flex flex-col" style={{ top: '48px' }}>
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
          />
        </div>
      )}

      {maximizedPanel === 'terminal' && showTerminalPanel && (
        <div className="fixed inset-0 z-[100] bg-[var(--bg-primary)] flex flex-col" style={{ top: '48px' }}>
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
          />
        </div>
      )}

      {maximizedPanel === 'telemetry' && showTelemetryPanel && (
        <div className="fixed inset-0 z-[100] bg-[var(--bg-primary)] flex flex-col" style={{ top: '48px' }}>
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
          onClose={() => {
            setShowCompletionModal(false);
          }}
          result={submissionResult}
          onViewDashboard={onExit}
        />
    </div>
  );
};

export default CodePlayground;
