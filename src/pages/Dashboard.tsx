import { useState, lazy, Suspense, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MoreVertical, Plus, User, LogOut, CheckCircle2, X, Eye, EyeOff, Trash2, Sun, Moon, ClipboardList, BarChart3, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { UserData } from './Login';
import { useTheme } from '../contexts/ThemeContext';
import Analytics from './Analytics';
import adminDP from '../assets/admin_dp.png';
import studDP from '../assets/stud_dp.png';

// Lazy load CodePlayground
const CodePlayground = lazy(() => import('../components/CodePlayground'));

// Test case definition
interface TestCase {
  id: string;
  name: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

// Activity type definition
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
  completed?: boolean;
}

// Mock activities data
// const mockActivities: Activity[] = [
//   {
//     id: '1',
//     title: 'Simple Addition',
//     description: 'Learn the basics of functions and arithmetic operations in Python',
//     createdAt: '2025-12-10',
//     language: 'python',
//     problemStatement: `# Simple Addition

// Write a function that takes two numbers as input and returns their sum.

// ## Example

// \`\`\`
// Input: 5, 3
// Output: 8
// \`\`\`

// ## Requirements
// - The function should accept two parameters
// - Return the sum of the two numbers
// - Handle both positive and negative integers`,
//     starterCode: `# Write your Python code here
// def add_numbers(a, b):
//     # Your code here
//     pass

// # Comment out the lines of code below when submitting your solution
// if __name__ == '__main__':
//     result = add_numbers(5, 3)
//     print(result)`,
//     testCases: [
//       {
//         id: 'test1',
//         name: 'Test Case 1: 5 + 3',
//         input: '5, 3',
//         expectedOutput: '8',
//         isHidden: false
//       },
//       {
//         id: 'test2',
//         name: 'Test Case 2: 10 + 20',
//         input: '10, 20',
//         expectedOutput: '30',
//         isHidden: false
//       },
//       {
//         id: 'test3',
//         name: 'Test Case 3: -5 + 3',
//         input: '-5, 3',
//         expectedOutput: '-2',
//         isHidden: false
//       },
//       {
//         id: 'test4',
//         name: 'Test Case 4: 0 + 0',
//         input: '0, 0',
//         expectedOutput: '0',
//         isHidden: false
//       }
//     ],
//     hints: [
//       'Use the + operator to add two numbers',
//       'Remember to return the result'
//     ]
//   },
//   {
//     id: '2',
//     title: 'Array Manipulation',
//     description: 'Practice array operations and transformations',
//     createdAt: '2025-12-11',
//     language: 'python',
//     problemStatement: `# Array Manipulation

// Write a function that reverses an array without using built-in reverse methods.

// ## Example

// \`\`\`
// Input: [1, 2, 3, 4, 5]
// Output: [5, 4, 3, 2, 1]
// \`\`\`

// ## Requirements
// - Do not use built-in reverse() or [::-1]
// - Implement in-place reversal
// - Handle empty arrays`,
//     starterCode: `def reverse_array(arr):
//     # Your code here
//     pass

// if __name__ == '__main__':
//     test_arr = [1, 2, 3, 4, 5]
//     reverse_array(test_arr)
//     print(test_arr)`,
//     testCases: [
//       {
//         id: 'test1',
//         name: 'Test Case 1: Basic array',
//         input: '[1, 2, 3, 4, 5]',
//         expectedOutput: '[5, 4, 3, 2, 1]',
//         isHidden: false
//       }
//     ]
//   },
//   {
//     id: '3',
//     title: 'Recursive Algorithms',
//     description: 'Understanding recursion through practical examples',
//     createdAt: '2025-12-12',
//     language: 'python',
//     problemStatement: `# Factorial Using Recursion

// Implement a recursive function to calculate the factorial of a number.

// ## Example

// \`\`\`
// Input: 5
// Output: 120
// \`\`\`

// ## Requirements
// - Must use recursion
// - Handle base case (n = 0 or n = 1)
// - Handle edge cases`,
//     starterCode: `def factorial(n):
//     # Your code here
//     pass

// if __name__ == '__main__':
//     result = factorial(5)
//     print(result)`,
//     testCases: [
//       {
//         id: 'test1',
//         name: 'Test Case 1: factorial(5)',
//         input: '5',
//         expectedOutput: '120',
//         isHidden: false
//       },
//       {
//         id: 'test2',
//         name: 'Test Case 2: factorial(0)',
//         input: '0',
//         expectedOutput: '1',
//         isHidden: true
//       }
//     ],
//     hints: [
//       'Base case: factorial(0) = factorial(1) = 1',
//       'Recursive case: factorial(n) = n * factorial(n-1)'
//     ]
//   }
// ];

// Create Activity Modal Component
interface CreateActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (activity: Activity) => void;
}

const CreateActivityModal = ({ isOpen, onClose, onCreate }: CreateActivityModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [starterCode, setStarterCode] = useState('');
  const [testCases, setTestCases] = useState<TestCase[]>([
    { id: 'test1', name: 'Test Case 1', input: '', expectedOutput: '', isHidden: false }
  ]);
  const [hints, setHints] = useState<string[]>(['']);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiGenerator, setShowAiGenerator] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setProblemStatement('');
    setStarterCode('');
    setTestCases([{ id: 'test1', name: 'Test Case 1', input: '', expectedOutput: '', isHidden: false }]);
    setHints(['']);
    setShowPreview(false);
    setErrors({});
    setAiPrompt('');
    setShowAiGenerator(false);
  };

  // AI Generation Function
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;

    setIsGenerating(true);
    setErrors({});

    try {
      // Call LLM API with function calling
      const response = await fetch('http://localhost:8000/api/ai/generate-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: aiPrompt,
          // The backend will use function calling to generate structured data
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate activity');
      }

      const generatedActivity = await response.json();

      // Auto-fill the form with AI-generated data
      setTitle(generatedActivity.title || '');
      setDescription(generatedActivity.description || '');
      setProblemStatement(generatedActivity.problemStatement || '');
      setStarterCode(generatedActivity.starterCode || '');
      
      // Map test cases
      if (generatedActivity.testCases && generatedActivity.testCases.length > 0) {
        const mappedTests = generatedActivity.testCases.map((tc: any, idx: number) => ({
          id: `test${idx + 1}`,
          name: tc.name || `Test Case ${idx + 1}`,
          input: tc.input || '',
          expectedOutput: tc.expectedOutput || '',
          isHidden: tc.isHidden || false,
        }));
        setTestCases(mappedTests);
      }
      
      // Map hints
      if (generatedActivity.hints && generatedActivity.hints.length > 0) {
        setHints(generatedActivity.hints);
      }

      setShowAiGenerator(false);
      setAiPrompt('');

    } catch (error) {
      setErrors({ ai: 'Failed to generate activity. Please try again or fill manually.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!problemStatement.trim()) newErrors.problemStatement = 'Problem statement is required';
    if (!starterCode.trim()) newErrors.starterCode = 'Starter code is required';
    
    // Check if at least one test case is valid
    const validTestCases = testCases.filter(tc => tc.input.trim() && tc.expectedOutput.trim());
    if (validTestCases.length === 0) {
      newErrors.testCases = 'At least one complete test case is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = () => {
    if (!validateForm()) return;

    // Filter out empty hints and test cases
    const validHints = hints.filter(h => h.trim());
    const validTestCases = testCases.filter(tc => tc.input.trim() && tc.expectedOutput.trim());

    const newActivity: Activity = {
      id: Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString().split('T')[0],
      problemStatement: problemStatement.trim(),
      language: 'python',
      starterCode: starterCode.trim(),
      testCases: validTestCases,
      hints: validHints.length > 0 ? validHints : undefined,
      completed: false
    };

    onCreate(newActivity);
    resetForm();
    onClose();
  };

  const addTestCase = () => {
    const newId = `test${testCases.length + 1}`;
    setTestCases([...testCases, { 
      id: newId, 
      name: `Test Case ${testCases.length + 1}`, 
      input: '', 
      expectedOutput: '', 
      isHidden: false 
    }]);
  };

  const removeTestCase = (index: number) => {
    if (testCases.length > 1) {
      setTestCases(testCases.filter((_, i) => i !== index));
    }
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: string | boolean) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], [field]: value };
    setTestCases(updated);
  };

  const addHint = () => {
    setHints([...hints, '']);
  };

  const removeHint = (index: number) => {
    setHints(hints.filter((_, i) => i !== index));
  };

  const updateHint = (index: number, value: string) => {
    const updated = [...hints];
    updated[index] = value;
    setHints(updated);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[var(--bg-primary)] rounded-lg shadow-2xl border border-[var(--border)] w-full max-w-4xl max-h-[90vh] flex flex-col relative">
        {/* Loading Overlay */}
        {isGenerating && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
            <div className="bg-[var(--bg-card)] rounded-lg p-8 shadow-2xl border border-[var(--border)] max-w-sm mx-4">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles size={28} className="text-purple-400" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-[var(--text-primary)] mb-1">Generating Activity</p>
                  <p className="text-sm text-[var(--text-secondary)]">AI is creating your activity...</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-2">This may take a few moments</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-[var(--border)] bg-black/5 dark:bg-white/5">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Create New Activity</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAiGenerator(!showAiGenerator)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                showAiGenerator 
                  ? 'bg-purple-600 text-white hover:bg-purple-700' 
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
              disabled={isGenerating}
            >
              <Sparkles size={16} />
            </button>
            <button
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="p-2 hover:bg-[var(--accent-hover)] rounded-full transition-colors cursor-pointer"
              title="Close"
            >
              <X size={20} className="text-[var(--text-primary)]" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* AI Generator Section */}
          {showAiGenerator && (
            <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/30">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <Sparkles size={20} className="text-purple-400" />
                AI Activity Generator
              </h3>
              <p className="text-[var(--text-secondary)] text-sm mb-4">
                Describe what kind of activity you want to create, and AI will generate everything for you!
              </p>
              <div className="space-y-3">
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full bg-[var(--bg-card)] text-[var(--text-primary)] rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 border border-[var(--border)]"
                  rows={3}
                  placeholder="Example: Create a Python activity about binary search for beginners. Include 3 test cases and 2 hints."
                  disabled={isGenerating}
                />
                <div className="flex justify-between items-center">
                  <div className="text-xs text-[var(--text-tertiary)]">
                    {isGenerating ? 'Generating with AI...' : 'Tip: Be specific about difficulty, topics, and requirements'}
                  </div>
                  <button
                    onClick={handleAIGenerate}
                    disabled={!aiPrompt.trim() || isGenerating}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors font-medium flex items-center gap-2 cursor-pointer"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Generate
                      </>
                    )}
                  </button>
                </div>
                {errors.ai && (
                  <p className="text-[var(--error)] text-sm bg-red-900/20 p-2 rounded">{errors.ai}</p>
                )}
              </div>
            </div>
          )}
          
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] border-b border-[var(--border)] pb-2">Basic Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Title <span className="text-[var(--error)]">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[var(--bg-card)] text-[var(--text-primary)] rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] border border-[var(--border)]"
                placeholder="e.g., Simple Addition"
              />
              {errors.title && <p className="text-[var(--error)] text-xs mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Description <span className="text-[var(--error)]">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[var(--bg-card)] text-[var(--text-primary)] rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] border border-[var(--border)]"
                rows={2}
                placeholder="Brief description of the activity"
              />
              {errors.description && <p className="text-[var(--error)] text-xs mt-1">{errors.description}</p>}
            </div>
          </div>

          {/* Problem Statement */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Problem Statement</h3>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 px-3 py-1 border border-[var(--border)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded text-sm transition-colors cursor-pointer"
              >
                {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
                {showPreview ? 'Edit' : 'Preview'}
              </button>
            </div>
            
            {!showPreview ? (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Markdown Content <span className="text-[var(--error)]">*</span>
                </label>
                <textarea
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                  className="w-full bg-[var(--bg-card)] text-[var(--text-primary)] rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] border border-[var(--border)] font-mono text-sm"
                  rows={10}
                  placeholder="# Problem Title&#10;&#10;Write your problem statement in Markdown...&#10;&#10;## Example&#10;&#10;```&#10;Input: example&#10;Output: result&#10;```"
                />
                {errors.problemStatement && <p className="text-[var(--error)] text-xs mt-1">{errors.problemStatement}</p>}
              </div>
            ) : (
              <div className="bg-[var(--bg-card)] rounded p-4 border border-[var(--border)] prose prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {problemStatement || '*No content yet*'}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Starter Code */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] border-b border-[var(--border)] pb-2">Starter Code</h3>
            
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Python Code <span className="text-[var(--error)]">*</span>
              </label>
              <textarea
                value={starterCode}
                onChange={(e) => setStarterCode(e.target.value)}
                className="w-full bg-[var(--bg-card)] text-[var(--text-primary)] rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] border border-[var(--border)] font-mono text-sm"
                rows={8}
                placeholder="def solution():&#10;    # Your code here&#10;    pass"
              />
              {errors.starterCode && <p className="text-[var(--error)] text-xs mt-1">{errors.starterCode}</p>}
            </div>
          </div>

          {/* Test Cases */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Test Cases</h3>
              <button
                onClick={addTestCase}
                className="flex items-center gap-2 px-3 py-1 border border-[var(--border)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded text-sm transition-colors cursor-pointer"
              >
                <Plus size={16} />
                Add Test
              </button>
            </div>
            
            {errors.testCases && <p className="text-[var(--error)] text-xs">{errors.testCases}</p>}
            
            <div className="space-y-3">
              {testCases.map((testCase, index) => (
                <div key={testCase.id} className="bg-[var(--bg-card)] rounded p-4 border border-[var(--border)]">
                  <div className="flex items-center justify-between mb-3">
                    <input
                      type="text"
                      value={testCase.name}
                      onChange={(e) => updateTestCase(index, 'name', e.target.value)}
                      className="flex-1 bg-[var(--bg-primary)] text-[var(--text-primary)] rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] border border-[var(--border)] text-sm"
                      placeholder="Test case name"
                    />
                    {testCases.length > 1 && (
                      <button
                        onClick={() => removeTestCase(index)}
                        className="ml-2 p-1 hover:bg-red-600 rounded text-[var(--error)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                        title="Remove test case"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">Input</label>
                      <input
                        type="text"
                        value={testCase.input}
                        onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                        className="w-full bg-[var(--bg-primary)] text-[var(--text-primary)] rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] border border-[var(--border)] text-sm"
                        placeholder="e.g., 5, 3"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">Expected Output</label>
                      <input
                        type="text"
                        value={testCase.expectedOutput}
                        onChange={(e) => updateTestCase(index, 'expectedOutput', e.target.value)}
                        className="w-full bg-[var(--bg-primary)] text-[var(--text-primary)] rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] border border-[var(--border)] text-sm"
                        placeholder="e.g., 8"
                      />
                    </div>
                  </div>
                  
                  <label className="flex items-center gap-2 text-sm text-[var(--text-tertiary)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={testCase.isHidden}
                      onChange={(e) => updateTestCase(index, 'isHidden', e.target.checked)}
                      className="rounded cursor-pointer"
                    />
                    Hidden test case
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Hints */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Hints (Optional)</h3>
              <button
                onClick={addHint}
                className="flex items-center gap-2 px-3 py-1 border border-[var(--border)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded text-sm transition-colors cursor-pointer"
              >
                <Plus size={16} />
                Add Hint
              </button>
            </div>
            
            <div className="space-y-2">
              {hints.map((hint, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={hint}
                    onChange={(e) => updateHint(index, e.target.value)}
                    className="flex-1 bg-[var(--bg-card)] text-[var(--text-primary)] rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] border border-[var(--border)] text-sm"
                    placeholder={`Hint ${index + 1}`}
                  />
                  {hints.length > 1 && (
                    <button
                      onClick={() => removeHint(index)}
                      className="p-2 hover:bg-red-600 rounded text-[var(--error)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                      title="Remove hint"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[var(--bg-card)] p-4 flex justify-end gap-3 border-t border-[var(--border)] rounded-b-lg">
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            disabled={isGenerating}
            className="px-4 py-2 border border-[var(--border)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Activity
          </button>
        </div>
      </div>
    </div>
  );
};

// Activity Card Component
const ActivityCard = ({ 
  activity, 
  onEdit, 
  onDelete, 
  onClick,
  onToggleComplete,
  accountType
}: { 
  activity: Activity; 
  onEdit: (id: string) => void; 
  onDelete: (id: string) => void;
  onClick: (activity: Activity) => void;
  onToggleComplete: (id: string) => void;
  accountType: 'student' | 'instructor';
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const { theme } = useTheme();

  return (
    <div 
      className={`border rounded-lg p-5 transition-all cursor-pointer relative group ${
        activity.completed 
          ? 'bg-[var(--bg-card)]/50 border-green-500/30' 
          : `bg-[var(--bg-card)] border-[var(--border)] ${theme === 'light' ? 'hover:bg-[var(--bg-secondary)]' : 'hover:border-blue-500/50'}`
      }`}
      onClick={() => onClick(activity)}
    >
      {/* Three dots menu */}
      <div className="absolute top-4 right-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          <MoreVertical size={18} />
        </button>
        
        {/* Dropdown menu */}
        {showMenu && (
          <div className="absolute right-0 mt-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg shadow-lg py-1 w-40 z-10">
            {accountType === 'student' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleComplete(activity.id);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
              >
                {activity.completed ? 'Mark Incomplete' : 'Mark Complete'}
              </button>
            )}
            {accountType === 'instructor' && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(activity.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-600 transition-colors cursor-pointer"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(activity.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-600 transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>
       

      {/* Completed Badge */}
      {activity.completed && (
        <div className="absolute top-4 left-4">
          <div className="flex items-center gap-1.5 bg-green-500/20 text-green-400 px-2.5 py-1 rounded-full border border-green-500/30">
            <CheckCircle2 size={14} />
            <span className="text-xs font-medium">Completed</span>
          </div>
        </div>
      )}

      {/* Card content */}
      <h3 className={`text-lg font-semibold mb-2 pr-8 ${
        activity.completed ? 'text-[var(--text-secondary)] mt-10' : 'text-[var(--text-primary)]'
      }`}>
        {activity.title}
      </h3>
      <p className="text-[var(--text-tertiary)] text-sm mb-4">{activity.description}</p>
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--text-tertiary)]">{activity.createdAt}</span>
        {activity.completed && (
          <span className="text-xs text-green-400 font-medium">✓ Done</span>
        )}
      </div>
    </div>
  );
};

// Main Dashboard Component
const Dashboard = ({ user, onLogout }: { user: UserData | null; onLogout: () => void }) => {
  const navigate = useNavigate();
  const { activityId } = useParams(); // Get activity ID from URL
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'activity' | 'analytics'>('activity');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [activitiesError, setActivitiesError] = useState(false);
  const [notification, setNotification] = useState<{ type: 'error' | 'success' | 'warning'; message: string } | null>(null);

  // Show notification helper
  const showNotification = (type: 'error' | 'success' | 'warning', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Fetch activities from backend on component mount
  useEffect(() => {
    const fetchActivities = async () => {
      setIsLoadingActivities(true);
      setActivitiesError(false);
      try {
        const response = await fetch('http://localhost:8000/api/activities');
        if (!response.ok) {
          throw new Error('Failed to fetch activities');
        }
        const data = await response.json();
        
        // Map backend response to frontend Activity interface
        const mappedActivities: Activity[] = await Promise.all(data.map(async (activity: any) => {
          // Check completion status for students
          let completed = false;
          if (user?.accountType === 'student' && user?.id) {
            try {
              const completionResponse = await fetch(
                `http://localhost:8000/api/sessions/completed/${user.id}/${activity.id}`
              );
              if (completionResponse.ok) {
                const completionData = await completionResponse.json();
                completed = completionData.completed;
              }
            } catch (error) {
              // Silently fail for completion status check
            }
          }
          
          return {
            id: activity.id,
            title: activity.title,
            description: activity.description,
            createdAt: activity.createdAt,
            problemStatement: activity.problemStatement,
            language: activity.language,
            starterCode: activity.starterCode,
            testCases: activity.testCases,
            hints: activity.hints,
            completed: completed,
          };
        }));
        
        setActivities(mappedActivities);
      } catch (error) {
        setActivitiesError(true);
        setActivities([]);
        showNotification('error', 'Failed to load activities. Please check your connection and try again.');
      } finally {
        setIsLoadingActivities(false);
      }
    };

    fetchActivities();
  }, [user]);

  // Handle activity ID from URL
  useEffect(() => {
    if (activityId && activities.length > 0) {
      const activity = activities.find(a => a.id === activityId);
      if (activity) {
        setSelectedActivity(activity);
      } else {
        // Activity not found, redirect to dashboard
        navigate('/dashboard', { replace: true });
      }
    } else if (!activityId) {
      // No activity ID in URL, clear selected activity to show dashboard
      setSelectedActivity(null);
    }
  }, [activityId, activities, navigate]);

  // Handle tab changes from URL
  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('/analytics')) {
      setActiveTab('analytics');
    } else if (path.includes('/activity') && !activityId) {
      setActiveTab('activity');
    }
  }, [activityId]);

  const handleTabChange = (tab: 'activity' | 'analytics') => {
    setActiveTab(tab);
    if (tab === 'analytics') {
      navigate('/dashboard/analytics');
    } else {
      navigate('/dashboard');
    }
  };

  const handleCreateActivity = () => {
    setShowCreateModal(true);
  };

  const handleCreateActivitySubmit = async (newActivity: Activity) => {
    try {
      // The activity is already saved to the database by the AI generate endpoint
      // We just need to refresh the activities list
      const response = await fetch('http://localhost:8000/api/activities');
      if (response.ok) {
        const data = await response.json();
        const mappedActivities: Activity[] = data.map((activity: any) => ({
          id: activity.id,
          title: activity.title,
          description: activity.description,
          createdAt: activity.createdAt,
          problemStatement: activity.problemStatement,
          language: activity.language,
          starterCode: activity.starterCode,
          testCases: activity.testCases,
          hints: activity.hints,
          completed: false,
        }));
        setActivities(mappedActivities);
        showNotification('success', 'Activity created successfully!');
      } else {
        // Fallback to local state update
        setActivities([newActivity, ...activities]);
        showNotification('success', 'Activity created successfully!');
      }
    } catch (error) {
      // Fallback to local state update
      setActivities([newActivity, ...activities]);
      showNotification('warning', 'Activity created locally. Server connection failed.');
    }
  };

  const handleEditActivity = (id: string) => {
    // TODO: Implement edit activity modal/form
  };

  const handleDeleteActivity = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/activities/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setActivities(activities.filter(a => a.id !== id));
        showNotification('success', 'Activity deleted successfully!');
      } else {
        showNotification('error', 'Failed to delete activity. Please try again.');
      }
    } catch (error) {
      // Still remove from UI even if backend fails
      setActivities(activities.filter(a => a.id !== id));
      showNotification('warning', 'Activity removed from view. Server connection failed.');
    }
  };

  const handleActivityClick = (activity: Activity) => {
    // Navigate to activity route with ID in URL
    navigate(`/activity/${activity.id}`);
    setSelectedActivity(activity);
  };

  const handleExitPlayground = async () => {
    // Navigate back to dashboard
    navigate('/dashboard');
    setSelectedActivity(null);
    
    // Refresh activities to update completion status
    setIsLoadingActivities(true);
    try {
      const response = await fetch('http://localhost:8000/api/activities');
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      const data = await response.json();
      
      const mappedActivities: Activity[] = await Promise.all(data.map(async (activity: any) => {
        let completed = false;
        if (user?.accountType === 'student' && user?.id) {
          try {
            const completionResponse = await fetch(
              `http://localhost:8000/api/sessions/completed/${user.id}/${activity.id}`
            );
            if (completionResponse.ok) {
              const completionData = await completionResponse.json();
              completed = completionData.completed;
            }
          } catch (error) {
            // Silently fail for completion status check
          }
        }
        
        return {
          id: activity.id,
          title: activity.title,
          description: activity.description,
          createdAt: activity.createdAt,
          problemStatement: activity.problemStatement,
          language: activity.language,
          starterCode: activity.starterCode,
          testCases: activity.testCases,
          hints: activity.hints,
          completed: completed,
        };
      }));
      
      setActivities(mappedActivities);
    } catch (error) {
      showNotification('error', 'Failed to refresh activities.');
    } finally {
      setIsLoadingActivities(false);
    }
  };

  const handleToggleComplete = async (id: string) => {
    // This manual toggle is now just for UI - actual completion is handled by session completion
    // We can remove this feature or keep it as a manual override
    setActivities(activities.map(a => 
      a.id === id ? { ...a, completed: !a.completed } : a
    ));
    // Note: Manual completion doesn't affect backend - real completion comes from finishing activity
  };

  // If an activity is selected, show the CodePlayground
  if (selectedActivity) {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            <p className="text-[var(--text-tertiary)] text-sm">Loading playground...</p>
          </div>
        </div>
      }>
        <CodePlayground
          activity={selectedActivity}
          onExit={handleExitPlayground}
        />
      </Suspense>
    );
  }

  return (
    <div className="h-screen flex bg-[var(--bg-primary)]">
      {/* Sidebar - Only show for instructors */}
      {user?.accountType === 'instructor' && (
        <aside className="w-64 bg-[var(--bg-primary)] border-r border-[var(--border)] flex flex-col">
          {/* Logo/Title */}
          <div className="h-16 flex items-center px-6 border-b border-[var(--border)]">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">rbAI</h1>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex-1 py-4">
            <button
              onClick={() => handleTabChange('activity')}
              className={`w-full px-6 py-3 text-left flex items-center gap-3 transition-colors cursor-pointer ${
                activeTab === 'activity'
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-r-2 border-[var(--accent)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]/50'
              }`}
            >
              <ClipboardList size={18} />
              <span className="font-medium">Activity</span>
            </button>
            
            <button
              onClick={() => handleTabChange('analytics')}
              className={`w-full px-6 py-3 text-left flex items-center gap-3 transition-colors cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-r-2 border-[var(--accent)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]/50'
              }`}
            >
              <BarChart3 size={18} />
              <span className="font-medium">Analytics</span>
            </button>
          </nav>

          {/* Theme Toggle at Bottom */}
          <div className="p-4 border-t border-[var(--border)]">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun size={18} />
              ) : (
                <Moon size={18} />
              )}
              <span className="text-sm font-medium">
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-[var(--bg-primary)] border-b border-[var(--border)] flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            {user?.accountType === 'student' && (
              <h1 className="text-xl font-bold text-[var(--text-primary)]">rbAI</h1>
            )}
            {/* <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              {activeTab === 'activity' ? 'Activity' : 'Analytics'}
            </h2> */}
          </div>
          
          {/* User Menu */}
          <div className="flex items-center gap-4 relative">
            {user && (
              <div className="text-right mr-2">
                <p className="text-sm font-medium text-[var(--text-primary)]">{user.name}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{user.studentId}</p>
              </div>
            )}
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-9 h-9 rounded-full overflow-hidden border-2 border-[var(--accent)] cursor-pointer hover:border-[var(--accent-hover)] transition-colors"
            >
              <img 
                src={user?.accountType === 'instructor' ? adminDP : studDP} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 top-12 mt-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg py-2 w-64 z-10">
                {user && (
                  <div className="px-4 py-3 border-b border-[var(--border)]">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{user.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{user.email}</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">{user.program} - {user.year}</p>
                  </div>
                )}
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                    navigate('/');
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-[var(--error)] hover:bg-[var(--bg-secondary)] transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content Panel */}
        <main className={`flex-1 overflow-y-auto p-6 ${theme === 'light' ? 'bg-[#f8f9fb]' : ''}`}>
          {activeTab === 'activity' && (
            <div>
              {/* Create Activity Button - Only show for instructors */}
              {user?.accountType === 'instructor' && (
                <div className="mb-6">
                  <button
                    onClick={handleCreateActivity}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium cursor-pointer ${
                      theme === 'light' 
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white'
                    }`}
                  >
                    <Plus size={20} />
                    Create Activity
                  </button>
                </div>
              )}

              {/* Activities Grid */}
              {isLoadingActivities ? (
                <div className="col-span-full flex items-center justify-center py-20">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[var(--text-tertiary)] text-sm">Loading activities...</p>
                  </div>
                </div>
              ) : activitiesError ? (
                <div className="col-span-full flex items-center justify-center py-20">
                  <div className="text-center bg-red-500/10 border border-red-500/30 rounded-lg p-8 max-w-md mx-auto">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <X size={32} className="text-red-400" />
                    </div>
                    <p className="text-[var(--text-secondary)] text-lg font-semibold mb-2">Unable to Load Activities</p>
                    <p className="text-[var(--text-tertiary)] text-sm mb-4">
                      The system cannot retrieve activities right now. Please check if the backend server is running.
                    </p>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-primary)] rounded transition-colors cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : activities.length === 0 ? (
                <div className="col-span-full flex items-center justify-center py-20">
                  <div className="text-center">
                    <p className="text-[var(--text-secondary)] text-lg mb-2">No activities yet</p>
                    <p className="text-[var(--text-tertiary)] text-sm">
                      {user?.accountType === 'instructor' 
                        ? 'Create your first activity to get started!'
                        : 'Check back later for new activities'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activities.map((activity) => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      onEdit={handleEditActivity}
                      onDelete={handleDeleteActivity}
                      onClick={handleActivityClick}
                      onToggleComplete={handleToggleComplete}
                      accountType={user?.accountType || 'student'}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && user?.accountType === 'instructor' && (
            <Analytics user={user} />
          )}
        </main>
      </div>

      {/* Create Activity Modal */}
      <CreateActivityModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateActivitySubmit}
      />

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border max-w-md ${
            notification.type === 'error' 
              ? 'bg-red-500/20 border-red-500/50 text-red-200'
              : notification.type === 'success'
              ? 'bg-green-500/20 border-green-500/50 text-green-200'
              : 'bg-yellow-500/20 border-yellow-500/50 text-yellow-200'
          }`}>
            <div className="flex-shrink-0 mt-0.5">
              {notification.type === 'error' && <X size={20} />}
              {notification.type === 'success' && <CheckCircle2 size={20} />}
              {notification.type === 'warning' && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="flex-shrink-0 hover:opacity-70 transition-opacity"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
