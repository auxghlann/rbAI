import { useState, lazy, Suspense, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LogOut, CheckCircle2, X, Sun, Moon, ClipboardList, BarChart3 } from 'lucide-react';
import type { UserData } from './Login';
import { useTheme } from '../contexts/ThemeContext';
import { API_URL } from '../config';
import Analytics from './dashboard/Analytics';
import Activities, { type Activity } from './dashboard/Activities';
import adminDP from '../assets/admin_dp.png';
import studDP from '../assets/stud_dp.png';
import logo from '../assets/logo.png';

// Lazy load CodePlayground
const CodePlayground = lazy(() => import('./CodePlayground'));

// Main Dashboard Component
const Dashboard = ({ user, onLogout }: { user: UserData | null; onLogout: () => void }) => {
  const navigate = useNavigate();
  const { activityId } = useParams();
  const { theme, toggleTheme } = useTheme();
  
  // State management
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

  // Fetch activities from backend
  useEffect(() => {
    const fetchActivities = async () => {
      setIsLoadingActivities(true);
      setActivitiesError(false);
      try {
        const response = await fetch(`${API_URL}/api/activities`);
        if (!response.ok) throw new Error('Failed to fetch activities');
        
        const data = await response.json();
        const mappedActivities: Activity[] = await Promise.all(data.map(async (activity: any) => {
          let completed = false;
          if (user?.accountType === 'student' && user?.id) {
            try {
              const completionResponse = await fetch(
                `${API_URL}/api/sessions/completed/${user.id}/${activity.id}`
              );
              if (completionResponse.ok) {
                const completionData = await completionResponse.json();
                completed = completionData.completed;
              }
            } catch (error) {
              // Silently fail
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
        navigate('/dashboard', { replace: true });
      }
    } else if (!activityId) {
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

  // Event handlers
  const handleTabChange = (tab: 'activity' | 'analytics') => {
    setActiveTab(tab);
    navigate(tab === 'analytics' ? '/dashboard/analytics' : '/dashboard');
  };

  const handleCreateActivity = () => setShowCreateModal(true);

  const handleCreateActivitySubmit = async (newActivity: Activity) => {
    try {
      const response = await fetch(`${API_URL}/api/activities`);
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
        setActivities([newActivity, ...activities]);
        showNotification('success', 'Activity created successfully!');
      }
    } catch (error) {
      setActivities([newActivity, ...activities]);
      showNotification('warning', 'Activity created locally. Server connection failed.');
    }
  };

  const handleEditActivity = async (updatedActivity: Activity) => {
    try {
      const response = await fetch(`${API_URL}/api/activities/${updatedActivity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: updatedActivity.title,
          description: updatedActivity.description,
          problemStatement: updatedActivity.problemStatement,
          starterCode: updatedActivity.starterCode,
          language: updatedActivity.language,
          testCases: updatedActivity.testCases,
          hints: updatedActivity.hints,
        }),
      });

      if (response.ok) {
        setActivities(activities.map(a => a.id === updatedActivity.id ? updatedActivity : a));
        showNotification('success', 'Activity updated successfully!');
      } else {
        showNotification('error', 'Failed to update activity. Please try again.');
      }
    } catch (error) {
      setActivities(activities.map(a => a.id === updatedActivity.id ? updatedActivity : a));
      showNotification('warning', 'Activity updated locally. Server connection failed.');
    }
  };

  const handleDeleteActivity = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/activities/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setActivities(activities.filter(a => a.id !== id));
        showNotification('success', 'Activity deleted successfully!');
      } else {
        showNotification('error', 'Failed to delete activity. Please try again.');
      }
    } catch (error) {
      setActivities(activities.filter(a => a.id !== id));
      showNotification('warning', 'Activity removed from view. Server connection failed.');
    }
  };

  const handleActivityClick = (activity: Activity) => {
    navigate(`/activity/${activity.id}`);
    setSelectedActivity(activity);
  };

  const handleExitPlayground = async () => {
    navigate('/dashboard');
    setSelectedActivity(null);
    
    // Refresh activities
    setIsLoadingActivities(true);
    try {
      const response = await fetch(`${API_URL}/api/activities`);
      if (!response.ok) throw new Error('Failed to fetch activities');
      
      const data = await response.json();
      const mappedActivities: Activity[] = await Promise.all(data.map(async (activity: any) => {
        let completed = false;
        if (user?.accountType === 'student' && user?.id) {
          try {
            const completionResponse = await fetch(
              `${API_URL}/api/sessions/completed/${user.id}/${activity.id}`
            );
            if (completionResponse.ok) {
              const completionData = await completionResponse.json();
              completed = completionData.completed;
            }
          } catch (error) {
            // Silently fail
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
        <CodePlayground activity={selectedActivity} onExit={handleExitPlayground} />
      </Suspense>
    );
  }

  // Main Dashboard Layout
  return (
    <div className="h-screen flex bg-[var(--bg-primary)]">
      {/* Sidebar - Only for instructors */}
      {user?.accountType === 'instructor' && (
        <aside className="w-16 bg-[var(--bg-primary)] border-r border-[var(--border)] flex flex-col">
          <div className="h-16 flex items-center justify-center border-b border-[var(--border)]">
            <img src={logo} alt="rbAI Logo" className="w-10 h-10 object-cover rounded-full" />
          </div>

          <nav className="flex-1 py-4 flex flex-col items-center gap-2">
            <button
              onClick={() => handleTabChange('activity')}
              className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors cursor-pointer group relative ${
                activeTab === 'activity'
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]/50'
              }`}
              title="Activities"
            >
              <ClipboardList size={20} />
              <span className="absolute left-full ml-2 px-2 py-1 bg-[var(--bg-card)] border border-[var(--border)] rounded text-xs text-[var(--text-primary)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Activities
              </span>
            </button>
            
            <button
              onClick={() => handleTabChange('analytics')}
              className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors cursor-pointer group relative ${
                activeTab === 'analytics'
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]/50'
              }`}
              title="Analytics"
            >
              <BarChart3 size={20} />
              <span className="absolute left-full ml-2 px-2 py-1 bg-[var(--bg-card)] border border-[var(--border)] rounded text-xs text-[var(--text-primary)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Analytics
              </span>
            </button>
          </nav>

          <div className="p-2 border-t border-[var(--border)] flex justify-center">
            <button
              onClick={toggleTheme}
              className="w-12 h-12 flex items-center justify-center rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer group relative"
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              <span className="absolute left-full ml-2 px-2 py-1 bg-[var(--bg-card)] border border-[var(--border)] rounded text-xs text-[var(--text-primary)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-[var(--bg-primary)] border-b border-[var(--border)] flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            {user?.accountType === 'instructor' ? (
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                {activeTab === 'activity' ? 'Manage Activities' : 'Student Analytics'}
              </h1>
            ) : (
              <div className="flex items-center gap-3">
                <img src={logo} alt="rbAI Logo" className="w-10 h-10 object-cover rounded-full" />
                <h1 className="text-xl font-bold text-[var(--text-primary)]">rbAI</h1>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4 relative">
            {user && (
              <div className="text-right mr-2">
                <p className="text-sm font-medium text-[var(--text-primary)]">{user.name}</p>
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

        {/* Content */}
        <main className={`flex-1 overflow-y-auto p-6 ${theme === 'light' ? 'bg-[#f8f9fb]' : ''}`}>
          {activeTab === 'activity' && (
            <Activities
              user={user}
              activities={activities}
              isLoading={isLoadingActivities}
              hasError={activitiesError}
              onCreateActivity={handleCreateActivity}
              onEditActivity={handleEditActivity}
              onDeleteActivity={handleDeleteActivity}
              onActivityClick={handleActivityClick}
              onToggleComplete={handleToggleComplete}
              showCreateModal={showCreateModal}
              onCloseModal={() => setShowCreateModal(false)}
              onCreateSubmit={handleCreateActivitySubmit}
            />
          )}

          {activeTab === 'analytics' && user?.accountType === 'instructor' && (
            <Analytics user={user} />
          )}
        </main>
      </div>

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
