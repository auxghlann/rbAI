import { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Plus, User, LogOut, CheckCircle2, X, Eye, EyeOff, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { UserData } from './Login';

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
const mockActivities: Activity[] = [
  {
    id: '1',
    title: 'Simple Addition',
    description: 'Learn the basics of functions and arithmetic operations in Python',
    createdAt: '2025-12-10',
    language: 'python',
    problemStatement: `# Simple Addition

Write a function that takes two numbers as input and returns their sum.

## Example

\`\`\`
Input: 5, 3
Output: 8
\`\`\`

## Requirements
- The function should accept two parameters
- Return the sum of the two numbers
- Handle both positive and negative integers`,
    starterCode: `# Write your Python code here
def add_numbers(a, b):
    # Your code here
    pass

# Comment out the lines of code below when submitting your solution
if __name__ == '__main__':
    result = add_numbers(5, 3)
    print(result)`,
    testCases: [
      {
        id: 'test1',
        name: 'Test Case 1: 5 + 3',
        input: '5, 3',
        expectedOutput: '8',
        isHidden: false
      },
      {
        id: 'test2',
        name: 'Test Case 2: 10 + 20',
        input: '10, 20',
        expectedOutput: '30',
        isHidden: false
      },
      {
        id: 'test3',
        name: 'Test Case 3: -5 + 3',
        input: '-5, 3',
        expectedOutput: '-2',
        isHidden: false
      },
      {
        id: 'test4',
        name: 'Test Case 4: 0 + 0',
        input: '0, 0',
        expectedOutput: '0',
        isHidden: false
      }
    ],
    hints: [
      'Use the + operator to add two numbers',
      'Remember to return the result'
    ]
  },
  {
    id: '2',
    title: 'Array Manipulation',
    description: 'Practice array operations and transformations',
    createdAt: '2025-12-11',
    language: 'python',
    problemStatement: `# Array Manipulation

Write a function that reverses an array without using built-in reverse methods.

## Example

\`\`\`
Input: [1, 2, 3, 4, 5]
Output: [5, 4, 3, 2, 1]
\`\`\`

## Requirements
- Do not use built-in reverse() or [::-1]
- Implement in-place reversal
- Handle empty arrays`,
    starterCode: `def reverse_array(arr):
    # Your code here
    pass

if __name__ == '__main__':
    test_arr = [1, 2, 3, 4, 5]
    reverse_array(test_arr)
    print(test_arr)`,
    testCases: [
      {
        id: 'test1',
        name: 'Test Case 1: Basic array',
        input: '[1, 2, 3, 4, 5]',
        expectedOutput: '[5, 4, 3, 2, 1]',
        isHidden: false
      }
    ]
  },
  {
    id: '3',
    title: 'Recursive Algorithms',
    description: 'Understanding recursion through practical examples',
    createdAt: '2025-12-12',
    language: 'python',
    problemStatement: `# Factorial Using Recursion

Implement a recursive function to calculate the factorial of a number.

## Example

\`\`\`
Input: 5
Output: 120
\`\`\`

## Requirements
- Must use recursion
- Handle base case (n = 0 or n = 1)
- Handle edge cases`,
    starterCode: `def factorial(n):
    # Your code here
    pass

if __name__ == '__main__':
    result = factorial(5)
    print(result)`,
    testCases: [
      {
        id: 'test1',
        name: 'Test Case 1: factorial(5)',
        input: '5',
        expectedOutput: '120',
        isHidden: false
      },
      {
        id: 'test2',
        name: 'Test Case 2: factorial(0)',
        input: '0',
        expectedOutput: '1',
        isHidden: true
      }
    ],
    hints: [
      'Base case: factorial(0) = factorial(1) = 1',
      'Recursive case: factorial(n) = n * factorial(n-1)'
    ]
  }
];

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
      console.error('AI generation failed:', error);
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
      <div className="bg-[var(--bg-primary)] rounded-lg shadow-2xl border border-[var(--border)] w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[var(--accent)] p-4 flex items-center justify-between rounded-t-lg">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Create New Activity</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAiGenerator(!showAiGenerator)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                showAiGenerator 
                  ? 'bg-purple-500 hover:bg-purple-600 text-[var(--text-primary)]' 
                  : 'bg-[var(--accent-hover)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
              }`}
            >
              ✨ AI Generate
            </button>
            <button
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="p-2 hover:bg-[var(--accent-hover)] rounded-full transition-colors"
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
            <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg p-4 border border-purple-500/30">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                ✨ AI Activity Generator
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
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-[var(--bg-secondary)] disabled:cursor-not-allowed text-[var(--text-primary)] rounded transition-colors font-semibold flex items-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[var(--text-primary)] border-t-transparent rounded-full animate-spin"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        ✨ Generate
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
                className="flex items-center gap-2 px-3 py-1 bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded text-sm transition-colors"
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
                className="flex items-center gap-2 px-3 py-1 bg-[var(--success)] hover:bg-[var(--success)] text-[var(--text-primary)] rounded text-sm transition-colors"
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
                        className="ml-2 p-1 hover:bg-red-600 rounded text-[var(--error)] hover:text-[var(--text-primary)] transition-colors"
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
                  
                  <label className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                    <input
                      type="checkbox"
                      checked={testCase.isHidden}
                      onChange={(e) => updateTestCase(index, 'isHidden', e.target.checked)}
                      className="rounded"
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
                className="flex items-center gap-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-[var(--text-primary)] rounded text-sm transition-colors"
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
                      className="p-2 hover:bg-red-600 rounded text-[var(--error)] hover:text-[var(--text-primary)] transition-colors"
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
            className="px-4 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-primary)] rounded transition-colors font-semibold"
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

  return (
    <div 
      className={`border rounded-lg p-5 hover:border-blue-500/50 transition-all cursor-pointer relative group ${
        activity.completed 
          ? 'bg-[var(--bg-card)]/50 border-green-500/30' 
          : 'bg-[var(--bg-card)] border-[var(--border)]'
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
          className="p-1 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
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
                className="w-full px-4 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
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
                  className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-600 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(activity.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-600 transition-colors"
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
  const [activeTab, setActiveTab] = useState<'activity'>('activity');
  const [activities, setActivities] = useState<Activity[]>(mockActivities);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateActivity = () => {
    setShowCreateModal(true);
  };

  const handleCreateActivitySubmit = (newActivity: Activity) => {
    setActivities([newActivity, ...activities]);
    // TODO: Later - save to backend/JSON file
    console.log('New activity created:', newActivity);
  };

  const handleEditActivity = (id: string) => {
    // TODO: Implement edit activity modal/form
    console.log('Edit activity:', id);
  };

  const handleDeleteActivity = (id: string) => {
    // TODO: Implement delete confirmation
    setActivities(activities.filter(a => a.id !== id));
    console.log('Delete activity:', id);
  };

  const handleActivityClick = (activity: Activity) => {
    setSelectedActivity(activity);
  };

  const handleExitPlayground = () => {
    setSelectedActivity(null);
  };

  const handleToggleComplete = (id: string) => {
    setActivities(activities.map(a => 
      a.id === id ? { ...a, completed: !a.completed } : a
    ));
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
              onClick={() => setActiveTab('activity')}
              className={`w-full px-6 py-3 text-left flex items-center gap-3 transition-colors ${
                activeTab === 'activity'
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-r-2 border-[var(--accent)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]/50'
              }`}
            >
              <span className="text-lg">📋</span>
              <span className="font-medium">Activity</span>
            </button>
          </nav>
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
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              {activeTab === 'activity' ? 'Activity' : ''}
            </h2>
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
              className="w-9 h-9 bg-[var(--accent)] rounded-full flex items-center justify-center text-[var(--text-primary)] cursor-pointer hover:bg-[var(--accent-hover)] transition-colors"
            >
              <User size={20} />
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
                  className="w-full px-4 py-2 text-left text-sm text-[var(--error)] hover:bg-[var(--bg-secondary)] transition-colors flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content Panel */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'activity' && (
            <div>
              {/* Create Activity Button - Only show for instructors */}
              {user?.accountType === 'instructor' && (
                <div className="mb-6">
                  <button
                    onClick={handleCreateActivity}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-primary)] rounded-lg transition-colors font-medium"
                  >
                    <Plus size={20} />
                    Create Activity
                  </button>
                </div>
              )}

              {/* Activities Grid */}
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

              {/* Empty state */}
              {activities.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-[var(--text-tertiary)] text-lg mb-4">No activities yet</p>
                  <p className="text-[var(--text-tertiary)] text-sm">Create your first activity to get started</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Create Activity Modal */}
      <CreateActivityModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateActivitySubmit}
      />
    </div>
  );
};

export default Dashboard;
