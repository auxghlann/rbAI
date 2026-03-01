import { useState, useEffect } from 'react';
import { MoreVertical, Plus, CheckCircle2, X, Eye, EyeOff, Trash2, Sparkles, Code2, Filter } from 'lucide-react';
import type { UserData } from '../Login';
import { useTheme } from '../../contexts/ThemeContext';
import { API_URL } from '../../config';

// Test case definition
interface TestCase {
  id: string;
  name: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

// Activity type definition
export interface Activity {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  problemStatement: string;
  language: 'python' | 'java';
  starterCode: string;
  testCases?: TestCase[];
  hints?: string[];
  timeLimit?: number;
  memoryLimit?: number;
  completed?: boolean;
}

// Create/Edit Activity Modal Component
interface CreateActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (activity: Activity) => void;
  editingActivity?: Activity | null;
}

const CreateActivityModal = ({ isOpen, onClose, onCreate, editingActivity }: CreateActivityModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [language, setLanguage] = useState<'python' | 'java'>('python');
  const [starterCode, setStarterCode] = useState('');
  const [testCases, setTestCases] = useState<TestCase[]>([
    { id: 'test1', name: 'Test Case 1', input: '', expectedOutput: '', isHidden: false }
  ]);
  const [hints, setHints] = useState<string[]>(['']);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiGenerator, setShowAiGenerator] = useState(false);

  // Load editing activity data when modal opens or editingActivity changes
  useEffect(() => {
    if (editingActivity && isOpen) {
      setTitle(editingActivity.title || '');
      setDescription(editingActivity.description || '');
      setProblemStatement(editingActivity.problemStatement || '');
      setStarterCode(editingActivity.starterCode || '');
      setTestCases(editingActivity.testCases || [{ id: 'test1', name: 'Test Case 1', input: '', expectedOutput: '', isHidden: false }]);
      setHints(editingActivity.hints || ['']);
      setShowAiGenerator(false);
    } else if (!editingActivity && isOpen) {
      resetForm();
    }
  }, [editingActivity, isOpen]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setProblemStatement('');
    setStarterCode('');
    setTestCases([{ id: 'test1', name: 'Test Case 1', input: '', expectedOutput: '', isHidden: false }]);
    setHints(['']);
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
      const response = await fetch(`${API_URL}/api/ai/generate-activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: aiPrompt,
          language: language 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate activity');
      }

      const generatedActivity = await response.json();

      setTitle(generatedActivity.title || '');
      setDescription(generatedActivity.description || '');
      setProblemStatement(generatedActivity.problemStatement || '');
      setLanguage(generatedActivity.language || 'python');
      setStarterCode(generatedActivity.starterCode || '');
      
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
    
    const validTestCases = testCases.filter(tc => tc.input.trim() && tc.expectedOutput.trim());
    if (validTestCases.length === 0) {
      newErrors.testCases = 'At least one complete test case is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = () => {
    if (!validateForm()) return;

    const validHints = hints.filter(h => h.trim());
    const validTestCases = testCases.filter(tc => tc.input.trim() && tc.expectedOutput.trim());

    const activityData: Activity = {
      id: editingActivity?.id || Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      createdAt: editingActivity?.createdAt || new Date().toISOString().split('T')[0],
      problemStatement: problemStatement.trim(),
      language: language,
      starterCode: starterCode.trim(),
      testCases: validTestCases,
      hints: validHints.length > 0 ? validHints : undefined,
      completed: editingActivity?.completed || false
    };

    onCreate(activityData);
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
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <div className="text-center">
                  <p className="text-[var(--text-primary)] font-medium mb-1">Generating Activity...</p>
                  <p className="text-[var(--text-tertiary)] text-sm">AI is creating your activity</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-[var(--border)] bg-black/5 dark:bg-white/5">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {editingActivity ? 'Edit Activity' : 'Create New Activity'}
          </h2>
          <div className="flex items-center gap-2">
            {!editingActivity && (
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
            )}
            <button
              onClick={() => { resetForm(); onClose(); }}
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
              <h3 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
                <Sparkles size={16} />
                AI Activity Generator
              </h3>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe the activity you want to create... (e.g., 'Create a Python activity about list comprehensions for beginners')"
                className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-purple-500 transition-colors min-h-[100px] resize-none"
                disabled={isGenerating}
              />
              {errors.ai && <p className="text-red-400 text-sm mt-2">{errors.ai}</p>}
              <button
                onClick={handleAIGenerate}
                disabled={!aiPrompt.trim() || isGenerating}
                className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Generate Activity
              </button>
            </div>
          )}
          
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] border-b border-[var(--border)] pb-2">Basic Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                placeholder="e.g., Simple Addition"
              />
              {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors min-h-[80px] resize-none"
                placeholder="Brief description of what students will learn"
              />
              {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Programming Language *
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'python' | 'java')}
                className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors cursor-pointer"
              >
                <option value="python">Python</option>
                <option value="java">Java</option>
              </select>
            </div>
          </div>

          {/* Problem Statement */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] border-b border-[var(--border)] pb-2">Problem Statement</h3>
            
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Problem Description * (Markdown supported)
              </label>
              <textarea
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:outline-none focus:border-[var(--accent)] transition-colors min-h-[200px]"
                placeholder="Write the problem statement..."
              />
              {errors.problemStatement && <p className="text-red-400 text-sm mt-1">{errors.problemStatement}</p>}
            </div>
          </div>

          {/* Starter Code */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] border-b border-[var(--border)] pb-2">Starter Code</h3>
            
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                {language === 'python' ? 'Python' : 'Java'} Code *
              </label>
              <textarea
                value={starterCode}
                onChange={(e) => setStarterCode(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:outline-none focus:border-[var(--accent)] transition-colors min-h-[150px]"
                placeholder={language === 'python' ? 'def solution():\n    pass' : 'public class Main {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}'}
              />
              {errors.starterCode && <p className="text-red-400 text-sm mt-1">{errors.starterCode}</p>}
            </div>
          </div>

          {/* Test Cases */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Test Cases</h3>
              <button
                onClick={addTestCase}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors cursor-pointer flex items-center gap-1"
              >
                <Plus size={14} />
                Add Test
              </button>
            </div>
            
            {errors.testCases && <p className="text-red-400 text-sm">{errors.testCases}</p>}
            
            <div className="space-y-3">
              {testCases.map((testCase, index) => (
                <div key={testCase.id} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <input
                      type="text"
                      value={testCase.name}
                      onChange={(e) => updateTestCase(index, 'name', e.target.value)}
                      className="flex-1 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded text-[var(--text-primary)] text-sm font-medium"
                      placeholder="Test case name"
                    />
                    <button
                      onClick={() => removeTestCase(index)}
                      className="ml-2 p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors cursor-pointer"
                      disabled={testCases.length === 1}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                    <div>
                      <label className="block text-xs text-[var(--text-tertiary)] mb-1">Input</label>
                      <textarea
                        value={testCase.input}
                        onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                        className="w-full px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded text-[var(--text-primary)] text-sm font-mono resize-none"
                        rows={2}
                        placeholder="5, 3"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--text-tertiary)] mb-1">Expected Output</label>
                      <textarea
                        value={testCase.expectedOutput}
                        onChange={(e) => updateTestCase(index, 'expectedOutput', e.target.value)}
                        className="w-full px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded text-[var(--text-primary)] text-sm font-mono resize-none"
                        rows={2}
                        placeholder="8"
                      />
                    </div>
                  </div>
                  
                  <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={testCase.isHidden}
                      onChange={(e) => updateTestCase(index, 'isHidden', e.target.checked)}
                      className="cursor-pointer"
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
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors cursor-pointer flex items-center gap-1"
              >
                <Plus size={14} />
                Add Hint
              </button>
            </div>
            
            <div className="space-y-2">
              {hints.map((hint, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={hint}
                    onChange={(e) => updateHint(index, e.target.value)}
                    className="flex-1 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-[var(--text-primary)] text-sm"
                    placeholder={`Hint ${index + 1}`}
                  />
                  <button
                    onClick={() => removeHint(index)}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded transition-colors cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[var(--bg-card)] p-4 flex justify-end gap-3 border-t border-[var(--border)] rounded-b-lg">
          <button
            onClick={() => { resetForm(); onClose(); }}
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
            {editingActivity ? 'Save Changes' : 'Create Activity'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Delete Confirmation Modal Component
interface DeleteConfirmationModalProps {
  isOpen: boolean;
  activityTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmationModal = ({ isOpen, activityTitle, onConfirm, onCancel }: DeleteConfirmationModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[var(--bg-primary)] rounded-lg shadow-2xl border border-[var(--border)] w-full max-w-md">
        <div className="p-6">
          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">Delete Activity?</h3>
          <p className="text-[var(--text-secondary)] mb-2">
            Are you sure you want to delete "<span className="font-semibold text-[var(--text-primary)]">{activityTitle}</span>"?
          </p>
          <p className="text-[var(--text-tertiary)] text-sm">
            This action cannot be undone. All associated data will be permanently removed.
          </p>
        </div>
        
        <div className="bg-[var(--bg-card)] p-4 flex justify-end gap-3 border-t border-[var(--border)] rounded-b-lg">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-[var(--border)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors font-semibold cursor-pointer"
          >
            Delete Activity
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

  // Language badge colors
  const languageConfig = {
    python: {
      bg: 'bg-blue-500/20',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
      label: 'Python'
    },
    java: {
      bg: 'bg-orange-500/20',
      text: 'text-orange-400',
      border: 'border-orange-500/30',
      label: 'Java'
    }
  };

  const langConfig = languageConfig[activity.language] || languageConfig.python;

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
                className="w-full px-4 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2 cursor-pointer"
              >
                {activity.completed ? <EyeOff size={14} /> : <Eye size={14} />}
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
                  className="w-full px-4 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(activity.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-[var(--bg-primary)] transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>
       
      {/* Badges */}
      <div className="absolute top-4 left-4 flex flex-row flex-wrap gap-2">
        {/* Language Badge */}
        <div className={`flex items-center gap-1.5 ${langConfig.bg} ${langConfig.text} px-2.5 py-1 rounded-full border ${langConfig.border}`}>
          <Code2 size={14} />
          <span className="text-xs font-medium">{langConfig.label}</span>
        </div>
        
        {/* Completed Badge */}
        {activity.completed && (
          <div className="flex items-center gap-1.5 bg-green-500/20 text-green-400 px-2.5 py-1 rounded-full border border-green-500/30">
            <CheckCircle2 size={14} />
            <span className="text-xs font-medium">Completed</span>
          </div>
        )}
      </div>

      {/* Card content */}
      <h3 className={`text-lg font-semibold mb-2 pr-8 ${
        activity.completed ? 'text-[var(--text-secondary)] mt-12' : 'text-[var(--text-primary)] mt-10'
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

// Activities Component
interface ActivitiesProps {
  user: UserData | null;
  activities: Activity[];
  isLoading: boolean;
  hasError: boolean;
  onCreateActivity: () => void;
  onEditActivity: (activity: Activity) => void;
  onDeleteActivity: (id: string) => void;
  onActivityClick: (activity: Activity) => void;
  onToggleComplete: (id: string) => void;
  showCreateModal: boolean;
  onCloseModal: () => void;
  onCreateSubmit: (activity: Activity) => void;
}

const Activities = ({
  user,
  activities,
  isLoading,
  hasError,
  onCreateActivity,
  onEditActivity,
  onDeleteActivity,
  onActivityClick,
  onToggleComplete,
  showCreateModal,
  onCloseModal,
  onCreateSubmit
}: ActivitiesProps) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [languageFilter, setLanguageFilter] = useState<'all' | 'python' | 'java'>('all');

  const handleDeleteClick = (activity: Activity) => {
    setActivityToDelete(activity);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (activityToDelete) {
      onDeleteActivity(activityToDelete.id);
      setShowDeleteModal(false);
      setActivityToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setActivityToDelete(null);
  };

  const handleEditClick = (activity: Activity) => {
    setEditingActivity(activity);
  };

  const handleCloseEditModal = () => {
    setEditingActivity(null);
  };

  const handleEditSubmit = (activity: Activity) => {
    onEditActivity(activity);
    setEditingActivity(null);
  };

  // Filter activities by language
  const filteredActivities = languageFilter === 'all' 
    ? activities 
    : activities.filter(activity => activity.language === languageFilter);

  return (
    <>
      {/* Top Bar with Filters and Create Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        {/* Language Filter */}
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-[var(--text-tertiary)]" />
          <div className="flex items-center gap-2 bg-[var(--bg-secondary)] rounded-lg p-1 border border-[var(--border)]">
            <button
              onClick={() => setLanguageFilter('all')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors cursor-pointer ${
                languageFilter === 'all'
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setLanguageFilter('python')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                languageFilter === 'python'
                  ? 'bg-blue-600 text-white'
                  : 'text-[var(--text-secondary)] hover:text-blue-400'
              }`}
            >
              <Code2 size={14} />
              Python
            </button>
            <button
              onClick={() => setLanguageFilter('java')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                languageFilter === 'java'
                  ? 'bg-orange-600 text-white'
                  : 'text-[var(--text-secondary)] hover:text-orange-400'
              }`}
            >
              <Code2 size={14} />
              Java
            </button>
          </div>
        </div>

        {/* Create Activity Button - Only for instructors */}
        {user?.accountType === 'instructor' && (
          <button
            onClick={onCreateActivity}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium cursor-pointer"
          >
            <Plus size={18} />
            Create Activity
          </button>
        )}
      </div>

      {/* Activities Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            <p className="text-[var(--text-tertiary)] text-sm">Loading activities...</p>
          </div>
        </div>
      ) : hasError ? (
        <div className="text-center py-20">
          <p className="text-red-400 text-lg mb-2">Failed to load activities</p>
          <p className="text-[var(--text-tertiary)] text-sm">Please check your connection and try again</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[var(--text-secondary)] text-lg mb-2">No activities yet</p>
          <p className="text-[var(--text-tertiary)] text-sm">
            {user?.accountType === 'instructor' 
              ? 'Create your first activity to get started' 
              : 'Check back later for new activities'}
          </p>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[var(--text-secondary)] text-lg mb-2">No {languageFilter} activities found</p>
          <p className="text-[var(--text-tertiary)] text-sm">
            Try selecting a different language filter
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredActivities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onEdit={() => handleEditClick(activity)}
              onDelete={() => handleDeleteClick(activity)}
              onClick={onActivityClick}
              onToggleComplete={onToggleComplete}
              accountType={user?.accountType || 'student'}
            />
          ))}
        </div>
      )}

      {/* Create Activity Modal */}
      <CreateActivityModal
        isOpen={showCreateModal}
        onClose={onCloseModal}
        onCreate={onCreateSubmit}
        editingActivity={null}
      />

      {/* Edit Activity Modal */}
      <CreateActivityModal
        isOpen={editingActivity !== null}
        onClose={handleCloseEditModal}
        onCreate={handleEditSubmit}
        editingActivity={editingActivity}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        activityTitle={activityToDelete?.title || ''}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
};

export default Activities;
