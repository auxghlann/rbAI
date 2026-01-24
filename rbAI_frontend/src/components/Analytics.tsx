import { useState, useEffect } from 'react';
import { UserData } from '../pages/Login';
import { TrendingUp, TrendingDown, Activity, Users, AlertTriangle, CheckCircle2, Clock, Code, Play, MousePointer, BarChart3, X, Copy, Trash2, Search, ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AnalyticsProps {
  user: UserData | null;
}

interface Student {
  id: string;
  name: string;
  username: string;
  email: string;
}

interface ActivityOption {
  id: string;
  title: string;
}

interface SessionData {
  id: string;
  student_name: string;
  activity_title: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  duration_minutes: number;
  tests_passed: number;
  tests_total: number;
  final_ces_score: number | null;
  final_ces_classification: string | null;
  final_code: string | null;
}

type SortField = 'student_name' | 'started_at' | 'duration_minutes';
type SortDirection = 'asc' | 'desc' | null;

// Helper function to convert UTC to Philippine Time
const toPhilippineTime = (dateString: string) => {
  const date = new Date(dateString);
  // Philippines is UTC+8
  const phTime = new Date(date.getTime() + (8 * 60 * 60 * 1000));
  return phTime;
};

const formatPhilippineDate = (dateString: string) => {
  const phTime = toPhilippineTime(dateString);
  return phTime.toLocaleDateString('en-PH', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

const formatPhilippineTime = (dateString: string) => {
  const phTime = toPhilippineTime(dateString);
  return phTime.toLocaleTimeString('en-PH', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
};

interface SessionDetails {
  session: SessionData;
  telemetry_summary: {
    total_keystrokes: number;
    total_runs: number;
    productive_runs: number;
    rapid_fire_runs: number;
    total_idle_minutes: number;
    focus_violations: number;
    avg_kpm: number;
    avg_ces: number;
    avg_integrity_penalty: number;
  };
  behavioral_flags: Array<{
    flag_type: string;
    flagged_at: string;
    is_spamming: boolean;
    is_suspected_paste: boolean;
    is_rapid_guessing: boolean;
    is_disengagement: boolean;
  }>;
  ces_timeline: Array<{
    computed_at: string;
    ces_score: number;
    ces_classification: string;
    kpm_effective: number;
    ad_effective: number;
    ir_effective: number;
    integrity_penalty: number;
  }>;
}

const Analytics = ({ user }: AnalyticsProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<ActivityOption[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedActivity, setSelectedActivity] = useState<string>('');
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [engagementFilter, setEngagementFilter] = useState<string>('');
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<SessionData[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCodeViewer, setShowCodeViewer] = useState(false);
  const [copyNotification, setCopyNotification] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ show: boolean; sessionId: string; sessionName: string }>({ show: false, sessionId: '', sessionName: '' });
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const paginatedSessions = filteredSessions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Fetch students and activities on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch students
        const studentsRes = await fetch('http://localhost:8000/api/analytics/students');
        if (studentsRes.ok) {
          const studentsData = await studentsRes.json();
          setStudents(studentsData);
        }

        // Fetch activities
        const activitiesRes = await fetch('http://localhost:8000/api/activities');
        const activitiesData = await activitiesRes.json();
        setActivities(activitiesData.map((a: any) => ({ id: a.id, title: a.title })));
      } catch (error) {
        console.error('Failed to fetch analytics data:', error);
      }
    };

    fetchData();
  }, []);

  // Fetch sessions when student or activity changes
  useEffect(() => {
    const fetchSessions = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedStudent) params.append('student_id', selectedStudent);
        if (selectedActivity) params.append('activity_id', selectedActivity);

        const response = await fetch(`http://localhost:8000/api/analytics/sessions?${params}`);
        if (response.ok) {
          const data = await response.json();
          console.log('Fetched sessions:', data);
          // Filter out potential duplicates by session ID
          const uniqueSessions = data.filter((session: SessionData, index: number, self: SessionData[]) => 
            index === self.findIndex((s) => s.id === session.id)
          );
          console.log('Unique sessions:', uniqueSessions);
          setSessions(uniqueSessions);
        }
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
        setSessions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [selectedStudent, selectedActivity]);

  // Filter and sort sessions
  useEffect(() => {
    let filtered = [...sessions];

    // Apply student search filter (real-time)
    if (studentSearchQuery.trim()) {
      const query = studentSearchQuery.toLowerCase();
      filtered = filtered.filter(session => 
        session.student_name.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(session => session.status === statusFilter);
    }

    // Apply engagement filter
    if (engagementFilter) {
      filtered = filtered.filter(session => session.final_ces_classification === engagementFilter);
    }

    // Apply sorting
    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case 'student_name':
            aValue = a.student_name.toLowerCase();
            bValue = b.student_name.toLowerCase();
            break;
          case 'started_at':
            aValue = new Date(a.started_at).getTime();
            bValue = new Date(b.started_at).getTime();
            break;
          case 'duration_minutes':
            aValue = a.duration_minutes || 0;
            bValue = b.duration_minutes || 0;
            break;
          default:
            return 0;
        }

        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });
    }

    setFilteredSessions(filtered);
  }, [sessions, studentSearchQuery, statusFilter, engagementFilter, sortField, sortDirection]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [studentSearchQuery, statusFilter, engagementFilter, selectedActivity, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown size={14} className="text-[var(--text-tertiary)]" />;
    }
    if (sortDirection === 'asc') {
      return <ChevronUp size={14} className="text-[var(--accent)]" />;
    }
    return <ChevronDown size={14} className="text-[var(--accent)]" />;
  };

  // Filter students based on search query
  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    student.username.toLowerCase().includes(studentSearchQuery.toLowerCase())
  );

  const handleSessionClick = async (sessionId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/analytics/sessions/${sessionId}/details`);
      if (response.ok) {
        const data = await response.json();
        setSelectedSession(data);
      } else {
        console.error('Failed to fetch session details');
      }
    } catch (error) {
      console.error('Failed to fetch session details:', error);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/analytics/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove from sessions list
        setSessions(sessions.filter(s => s.id !== sessionId));
        setDeleteConfirmation({ show: false, sessionId: '', sessionName: '' });
        
        // Show success notification
        setDeleteSuccess(true);
        setTimeout(() => setDeleteSuccess(false), 3000);
      } else {
        console.error('Failed to delete session');
        alert('Failed to delete session. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Failed to delete session. Please try again.');
    }
  };

  const getEngagementColor = (classification: string | null) => {
    if (!classification) return 'text-gray-400';
    if (classification.includes('High')) return 'text-green-400';
    if (classification.includes('Moderate')) return 'text-blue-400';
    if (classification.includes('Low')) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      completed: 'bg-green-500/20 text-green-400 border-green-500/30',
      abandoned: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return colors[status as keyof typeof colors] || colors.active;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[var(--text-tertiary)] text-sm">Total Sessions</span>
              <Users size={18} className="text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{filteredSessions.length}</p>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[var(--text-tertiary)] text-sm">Avg CES Score</span>
              <Activity size={18} className="text-green-400" />
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {filteredSessions.length > 0 
                ? (filteredSessions.reduce((sum, s) => sum + (s.final_ces_score || 0), 0) / filteredSessions.length).toFixed(2)
                : '0.00'}
            </p>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[var(--text-tertiary)] text-sm">Completion Rate</span>
              <CheckCircle2 size={18} className="text-green-400" />
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {filteredSessions.length > 0
                ? ((filteredSessions.filter(s => s.status === 'completed').length / filteredSessions.length) * 100).toFixed(0)
                : '0'}%
            </p>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[var(--text-tertiary)] text-sm">At-Risk Students</span>
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {filteredSessions.filter(s => s.final_ces_classification?.includes('At-Risk')).length}
            </p>
          </div>
        </div>

      {/* Sessions Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
        {/* Header with Filters */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between gap-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Session History</h3>
          
          {/* Filters - Right Justified */}
          <div className="flex items-center gap-3">
            {/* Student Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="Search student..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                className="w-64 pl-9 pr-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>

            {/* Activity Dropdown */}
            <select
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors cursor-pointer"
            >
              <option value="">All Activities</option>
              {activities.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              <p className="text-[var(--text-tertiary)] text-sm">Loading sessions...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto max-w-full">
              <table className="w-full min-w-[1200px]">
                <thead className="bg-[var(--bg-secondary)]">
                  <tr>
                    <th 
                      onClick={() => handleSort('student_name')}
                      className="px-3 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Student
                        {getSortIcon('student_name')}
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                      Activity
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                      <div className="flex items-center gap-1">
                        <Filter className="w-3 h-3" />
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1 text-[var(--text-primary)] text-xs cursor-pointer hover:bg-[var(--bg-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors"
                          style={{
                            colorScheme: document.documentElement.classList.contains('dark') ? 'dark' : 'light'
                          }}
                        >
                          <option value="" className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">All Status</option>
                          <option value="active" className="bg-[var(--bg-secondary)] text-blue-400">Active</option>
                          <option value="completed" className="bg-[var(--bg-secondary)] text-green-400">Completed</option>
                        </select>
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('started_at')}
                      className="px-3 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Started (PH Time)
                        {getSortIcon('started_at')}
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                      Ended (PH Time)
                    </th>
                    <th 
                      onClick={() => handleSort('duration_minutes')}
                      className="px-3 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Duration
                        {getSortIcon('duration_minutes')}
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                      Tests Passed
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                      CES Score
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                      <div className="flex items-center gap-1">
                        <Filter className="w-3 h-3" />
                        <select
                          value={engagementFilter}
                          onChange={(e) => setEngagementFilter(e.target.value)}
                          className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1 text-[var(--text-primary)] text-xs cursor-pointer hover:bg-[var(--bg-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors"
                          style={{
                            colorScheme: document.documentElement.classList.contains('dark') ? 'dark' : 'light'
                          }}
                        >
                          <option value="" className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">All Engagement</option>
                          <option value="High Engagement" className="bg-[var(--bg-secondary)] text-green-400">High Engagement</option>
                          <option value="Moderate Engagement" className="bg-[var(--bg-secondary)] text-blue-400">Moderate Engagement</option>
                          <option value="Low Engagement" className="bg-[var(--bg-secondary)] text-yellow-400">Low Engagement</option>
                          <option value="Disengaged/At-Risk" className="bg-[var(--bg-secondary)] text-red-400">Disengaged/At-Risk</option>
                        </select>
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                      Actions
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                      Delete
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-3 py-12 text-center">
                        <BarChart3 size={48} className="mx-auto mb-4 text-[var(--text-tertiary)] opacity-50" />
                        <p className="text-[var(--text-secondary)] text-lg mb-2 font-medium">No sessions found</p>
                        <p className="text-[var(--text-tertiary)] text-sm">
                          {statusFilter || engagementFilter || studentSearchQuery
                            ? 'Try adjusting your filters to see more results'
                            : selectedStudent || selectedActivity
                            ? 'No sessions match the selected criteria'
                            : 'Select a student or activity to view analytics'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedSessions.map((session) => (
                      <tr 
                        key={session.id}
                        className="hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                        onClick={() => handleSessionClick(session.id)}
                      >
                        <td className="px-3 py-2.5 whitespace-nowrap text-sm text-[var(--text-primary)]">
                          {session.student_name}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-sm text-[var(--text-primary)]">
                          {session.activity_title}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(session.status)}`}>
                            {session.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                          <div className="flex flex-col">
                            <span>{formatPhilippineDate(session.started_at)}</span>
                            <span className="text-xs text-[var(--text-tertiary)]">
                              {formatPhilippineTime(session.started_at)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                          {session.ended_at ? (
                            <div className="flex flex-col">
                              <span>{formatPhilippineDate(session.ended_at)}</span>
                              <span className="text-xs text-[var(--text-tertiary)]">
                                {formatPhilippineTime(session.ended_at)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[var(--text-tertiary)] italic">Active</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                          {session.duration_minutes ? `${session.duration_minutes.toFixed(1)} min` : 'In progress'}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                          {session.tests_passed} / {session.tests_total}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">
                          {session.final_ces_score ? session.final_ces_score.toFixed(3) : 'N/A'}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className={`text-xs font-medium ${getEngagementColor(session.final_ces_classification)}`}>
                            {session.final_ces_classification || 'N/A'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSessionClick(session.id);
                            }}
                            className="text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors cursor-pointer"
                          >
                            View
                          </button>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmation({ 
                                show: true, 
                                sessionId: session.id, 
                                sessionName: `${session.student_name} - ${session.activity_title}` 
                              });
                            }}
                            className="text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                            title="Delete session"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination Controls */}
        {!isLoading && filteredSessions.length > 0 && (
          <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between">
            <div className="text-sm text-[var(--text-secondary)]">
              Showing <span className="font-medium text-[var(--text-primary)]">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-medium text-[var(--text-primary)]">
                {Math.min(currentPage * itemsPerPage, filteredSessions.length)}
              </span>{' '}
              of <span className="font-medium text-[var(--text-primary)]">{filteredSessions.length}</span> sessions
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  // Show first page, last page, current page, and pages around current
                  const showPage = 
                    page === 1 || 
                    page === totalPages || 
                    (page >= currentPage - 1 && page <= currentPage + 1);
                  
                  const showEllipsis = 
                    (page === 2 && currentPage > 3) || 
                    (page === totalPages - 1 && currentPage < totalPages - 2);
                  
                  if (showEllipsis) {
                    return (
                      <span key={page} className="px-2 text-[var(--text-tertiary)]">
                        ...
                      </span>
                    );
                  }
                  
                  if (!showPage) return null;
                  
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[2rem] px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${
                        currentPage === page
                          ? 'bg-[var(--accent)] text-white font-medium'
                          : 'border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-primary)] rounded-lg shadow-2xl border border-[var(--border)] w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="p-4 flex items-center justify-between border-b border-[var(--border)] bg-black/5 dark:bg-white/5 z-10">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Session Details - {selectedSession.session.student_name}
              </h3>
              <button
                onClick={() => setSelectedSession(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Metrics Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <MousePointer size={16} className="text-blue-400" />
                    <span className="text-xs text-[var(--text-tertiary)]">Keystrokes</span>
                  </div>
                  <p className="text-xl font-bold text-[var(--text-primary)]">
                    {selectedSession.telemetry_summary.total_keystrokes}
                  </p>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Play size={16} className="text-green-400" />
                    <span className="text-xs text-[var(--text-tertiary)]">Run Attempts</span>
                  </div>
                  <p className="text-xl font-bold text-[var(--text-primary)]">
                    {selectedSession.telemetry_summary.total_runs}
                  </p>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={16} className="text-yellow-400" />
                    <span className="text-xs text-[var(--text-tertiary)]">Idle Time</span>
                  </div>
                  <p className="text-xl font-bold text-[var(--text-primary)]">
                    {selectedSession.telemetry_summary.total_idle_minutes.toFixed(1)}m
                  </p>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity size={16} className="text-purple-400" />
                    <span className="text-xs text-[var(--text-tertiary)]">Avg CES</span>
                  </div>
                  <p className="text-xl font-bold text-[var(--text-primary)]">
                    {selectedSession.telemetry_summary.avg_ces.toFixed(3)}
                  </p>
                </div>
              </div>

              {/* Integrity Penalties Timeline */}
              {(() => {
                const penaltyEvents = selectedSession.ces_timeline.filter(point => point.integrity_penalty > 0);
                return penaltyEvents.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-red-400" />
                      Integrity Penalties ({penaltyEvents.length} incidents)
                      <span className="ml-auto text-xs text-[var(--text-tertiary)] font-normal">
                        Avg: {(selectedSession.telemetry_summary.avg_integrity_penalty * 100).toFixed(1)}%
                      </span>
                    </h4>
                    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full">
                          <thead className="bg-[var(--bg-secondary)] sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase">
                                Timestamp
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase">
                                Penalty
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase">
                                CES Impact
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase">
                                Severity
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)]">
                            {penaltyEvents.map((point, idx) => {
                              const penaltyPercent = point.integrity_penalty * 100;
                              const severityColor = penaltyPercent > 30 ? 'text-red-400' : penaltyPercent > 15 ? 'text-orange-400' : 'text-yellow-400';
                              const severityBg = penaltyPercent > 30 ? 'bg-red-500/20' : penaltyPercent > 15 ? 'bg-orange-500/20' : 'bg-yellow-500/20';
                              const severityLabel = penaltyPercent > 30 ? 'High' : penaltyPercent > 15 ? 'Medium' : 'Low';
                              
                              return (
                                <tr key={idx} className="hover:bg-[var(--bg-secondary)]">
                                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                                    <div className="flex flex-col">
                                      <span>{new Date(point.computed_at).toLocaleTimeString()}</span>
                                      <span className="text-xs text-[var(--text-tertiary)]">
                                        {new Date(point.computed_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`text-sm font-bold ${severityColor}`}>
                                      {penaltyPercent.toFixed(1)}%
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                                    CES: {point.ces_score.toFixed(3)}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${severityBg} ${severityColor}`}>
                                      {severityLabel}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {selectedSession.telemetry_summary.avg_integrity_penalty > 0.15 && (
                        <div className="bg-red-500/10 border-t border-red-500/30 px-4 py-3">
                          <p className="text-xs text-red-400 flex items-center gap-2">
                            <AlertTriangle size={14} />
                            <span>
                              <strong>Warning:</strong> Multiple integrity violations detected. Review session for academic dishonesty.
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Behavioral Flags */}
              {selectedSession.behavioral_flags.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-orange-400" />
                    Behavioral Flags
                  </h4>
                  <div className="space-y-2">
                    {selectedSession.behavioral_flags.map((flag, idx) => (
                      <div key={idx} className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-orange-400">{flag.flag_type}</span>
                          <span className="text-xs text-[var(--text-tertiary)]">
                            {new Date(flag.flagged_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {flag.is_spamming && (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">Spamming</span>
                          )}
                          {flag.is_suspected_paste && (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">Suspected Paste</span>
                          )}
                          {flag.is_rapid_guessing && (
                            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">Rapid Guessing</span>
                          )}
                          {flag.is_disengagement && (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">Disengagement</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CES Timeline Chart */}
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-400" />
                  CES Timeline
                </h4>
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={selectedSession.ces_timeline.map((point, idx) => ({
                      time: new Date(point.computed_at).toLocaleTimeString(),
                      ces: parseFloat(point.ces_score.toFixed(3)),
                      kpm: parseFloat(point.kpm_effective.toFixed(1)),
                      ad: parseFloat(point.ad_effective.toFixed(2)),
                      ir: parseFloat(point.ir_effective.toFixed(2)),
                      classification: point.ces_classification,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis 
                        dataKey="time" 
                        stroke="var(--text-tertiary)"
                        tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
                      />
                      <YAxis 
                        stroke="var(--text-tertiary)"
                        tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
                        domain={[0, 1]}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--bg-card)', 
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)'
                        }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 shadow-lg">
                                <p className="text-[var(--text-primary)] font-semibold mb-2">{data.time}</p>
                                <p className="text-blue-400 font-bold mb-2">CES: {data.ces}</p>
                                <p className="text-[var(--text-secondary)] text-sm mb-1">{data.classification}</p>
                                <div className="border-t border-[var(--border)] pt-2 mt-2 space-y-1">
                                  <p className="text-green-400 text-sm">KPM: {data.kpm}</p>
                                  <p className="text-orange-400 text-sm">AD: {data.ad}</p>
                                  <p className="text-purple-400 text-sm">IR: {data.ir}</p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="ces" 
                        stroke="#3b82f6" 
                        strokeWidth={3} 
                        dot={{ fill: '#3b82f6', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Provenance State Distribution */}
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <Activity size={16} className="text-purple-400" />
                  CES Classification Distribution
                </h4>
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={(() => {
                          const stateCounts: Record<string, number> = {};
                          selectedSession.ces_timeline.forEach(point => {
                            const state = point.ces_classification || 'Unknown';
                            stateCounts[state] = (stateCounts[state] || 0) + 1;
                          });
                          return Object.entries(stateCounts).map(([name, value]) => ({ name, value }));
                        })()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {(() => {
                          const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
                          const stateCounts: Record<string, number> = {};
                          selectedSession.ces_timeline.forEach(point => {
                            const state = point.ces_classification || 'Unknown';
                            stateCounts[state] = (stateCounts[state] || 0) + 1;
                          });
                          return Object.entries(stateCounts).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ));
                        })()}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--bg-card)', 
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* View Code Button */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setShowCodeViewer(true)}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2 cursor-pointer"
                >
                  <Code size={18} />
                  View Student Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Code Viewer Modal */}
      {showCodeViewer && selectedSession && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          {/* Copy Notification - Lower right with slide animation */}
          {copyNotification && (
            <div className="fixed bottom-6 right-6 bg-green-500 text-white text-sm px-4 py-3 rounded-lg shadow-lg z-[70] animate-slide-in-right flex items-center gap-2">
              <span>✓ Copied to clipboard!</span>
            </div>
          )}
          
          <div className="bg-[var(--bg-primary)] rounded-lg shadow-2xl border border-[var(--border)] w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-4 flex items-center justify-between border-b border-[var(--border)] bg-black/5 dark:bg-white/5">
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  Student Code - {selectedSession.session.student_name}
                </h3>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">
                  {selectedSession.session.activity_title}
                </p>
              </div>
              <button
                onClick={() => setShowCodeViewer(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {selectedSession.session.final_code ? (
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
                  <div className="bg-[var(--bg-secondary)] px-4 py-2 border-b border-[var(--border)] flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--text-secondary)]">Python</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedSession.session.final_code || '');
                        setCopyNotification(true);
                        setTimeout(() => setCopyNotification(false), 2000);
                      }}
                      className="p-1.5 hover:bg-[var(--bg-primary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded transition-colors cursor-pointer"
                      title="Copy code"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  <pre className="p-4 overflow-x-auto">
                    <code className="text-sm text-[var(--text-primary)] font-mono">
                      {selectedSession.session.final_code}
                    </code>
                  </pre>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Code size={48} className="mx-auto text-[var(--text-tertiary)] mb-4" />
                  <p className="text-[var(--text-secondary)] text-lg mb-2">No Code Available</p>
                  <p className="text-[var(--text-tertiary)] text-sm">
                    The student hasn't submitted any code for this session yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteConfirmation.show && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-primary)] rounded-lg shadow-2xl border border-[var(--border)] max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  Delete Session
                </h3>
                <p className="text-[var(--text-secondary)] text-sm mb-1">
                  Are you sure you want to delete this session?
                </p>
                <p className="text-[var(--text-tertiary)] text-sm font-medium">
                  {deleteConfirmation.sessionName}
                </p>
                <p className="text-[var(--text-tertiary)] text-xs mt-3">
                  This action cannot be undone. All telemetry data, CES scores, and run attempts will be permanently deleted.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirmation({ show: false, sessionId: '', sessionName: '' })}
                className="px-4 py-2 border border-[var(--border)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteSession(deleteConfirmation.sessionId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors font-semibold cursor-pointer"
              >
                Delete Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Success Notification */}
      {deleteSuccess && (
        <div className="fixed bottom-6 right-6 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg z-[70] animate-slide-in-right flex items-center gap-2">
          <CheckCircle2 size={20} />
          <span className="font-medium">Session deleted successfully!</span>
        </div>
      )}
    </div>
  );
};

export default Analytics;
