import { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Plus, User, LogOut, CheckCircle2 } from 'lucide-react';
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

// Activity Card Component
const ActivityCard = ({ 
  activity, 
  onEdit, 
  onDelete, 
  onClick,
  onToggleComplete
}: { 
  activity: Activity; 
  onEdit: (id: string) => void; 
  onDelete: (id: string) => void;
  onClick: (activity: Activity) => void;
  onToggleComplete: (id: string) => void;
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div 
      className={`border rounded-lg p-5 hover:border-blue-500/50 transition-all cursor-pointer relative group ${
        activity.completed 
          ? 'bg-gray-800/50 border-green-500/30' 
          : 'bg-gray-800 border-gray-700'
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
          className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
        >
          <MoreVertical size={18} />
        </button>
        
        {/* Dropdown menu */}
        {showMenu && (
          <div className="absolute right-0 mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg py-1 w-40 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleComplete(activity.id);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-600 transition-colors"
            >
              {activity.completed ? 'Mark Incomplete' : 'Mark Complete'}
            </button>
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
        activity.completed ? 'text-gray-300 mt-10' : 'text-white'
      }`}>
        {activity.title}
      </h3>
      <p className="text-gray-400 text-sm mb-4">{activity.description}</p>
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{activity.createdAt}</span>
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

  const handleCreateActivity = () => {
    // TODO: Implement create activity modal/form
    console.log('Create new activity');
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
        <div className="flex items-center justify-center h-screen bg-gray-900">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Loading playground...</p>
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
    <div className="h-screen flex bg-gray-950">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Logo/Title */}
        <div className="h-16 flex items-center px-6 border-b border-gray-800">
          <h1 className="text-xl font-bold text-white">rbAI</h1>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 py-4">
          <button
            onClick={() => setActiveTab('activity')}
            className={`w-full px-6 py-3 text-left flex items-center gap-3 transition-colors ${
              activeTab === 'activity'
                ? 'bg-blue-600/10 text-blue-400 border-r-2 border-blue-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <span className="text-lg">📋</span>
            <span className="font-medium">Activity</span>
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
          <h2 className="text-xl font-semibold text-white">
            {activeTab === 'activity' ? 'Activity' : ''}
          </h2>
          
          {/* User Menu */}
          <div className="flex items-center gap-4 relative">
            {user && (
              <div className="text-right mr-2">
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-gray-400">{user.studentId}</p>
              </div>
            )}
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white cursor-pointer hover:bg-blue-700 transition-colors"
            >
              <User size={20} />
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 top-12 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-2 w-64 z-10">
                {user && (
                  <div className="px-4 py-3 border-b border-gray-700">
                    <p className="text-sm font-semibold text-white">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                    <p className="text-xs text-gray-500 mt-1">{user.program} - {user.year}</p>
                  </div>
                )}
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                    navigate('/');
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 transition-colors flex items-center gap-2"
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
              {/* Create Activity Button */}
              <div className="mb-6">
                <button
                  onClick={handleCreateActivity}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  <Plus size={20} />
                  Create Activity
                </button>
              </div>

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
                  />
                ))}
              </div>

              {/* Empty state */}
              {activities.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg mb-4">No activities yet</p>
                  <p className="text-gray-500 text-sm">Create your first activity to get started</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
