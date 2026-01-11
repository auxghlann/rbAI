import { useState, useEffect } from 'react';
import { UserData } from '../pages/Login';
import { TrendingUp, TrendingDown, Activity, Users, AlertTriangle, CheckCircle2, Clock, Code, Play, MousePointer, BarChart3 } from 'lucide-react';
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
}

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
  }>;
}

const Analytics = ({ user }: AnalyticsProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<ActivityOption[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedActivity, setSelectedActivity] = useState<string>('');
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
          setSessions(data);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Student Analytics</h2>
          <p className="text-[var(--text-tertiary)] text-sm mt-1">
            Monitor student engagement and behavior patterns
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Student Selector */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Student
            </label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors cursor-pointer"
            >
              <option value="">All Students</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.username})
                </option>
              ))}
            </select>
          </div>

          {/* Activity Selector */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Activity
            </label>
            <select
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors cursor-pointer"
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
      </div>

      {/* Summary Cards */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[var(--text-tertiary)] text-sm">Total Sessions</span>
              <Users size={18} className="text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{sessions.length}</p>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[var(--text-tertiary)] text-sm">Avg CES Score</span>
              <Activity size={18} className="text-green-400" />
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {(sessions.reduce((sum, s) => sum + (s.final_ces_score || 0), 0) / sessions.length).toFixed(2)}
            </p>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[var(--text-tertiary)] text-sm">Completion Rate</span>
              <CheckCircle2 size={18} className="text-green-400" />
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {((sessions.filter(s => s.status === 'completed').length / sessions.length) * 100).toFixed(0)}%
            </p>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[var(--text-tertiary)] text-sm">At-Risk Students</span>
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {sessions.filter(s => s.final_ces_classification?.includes('At-Risk')).length}
            </p>
          </div>
        </div>
      )}

      {/* Sessions Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="p-6 border-b border-[var(--border)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Session History</h3>
        </div>

        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              <p className="text-[var(--text-tertiary)] text-sm">Loading sessions...</p>
            </div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[var(--text-secondary)] text-lg mb-2">No sessions found</p>
            <p className="text-[var(--text-tertiary)] text-sm">
              {!selectedStudent && !selectedActivity
                ? 'Select a student or activity to view analytics'
                : 'No sessions match the selected filters'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-secondary)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                    Tests Passed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                    CES Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                    Engagement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {sessions.map((session) => (
                  <tr 
                    key={session.id}
                    className="hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                    onClick={() => handleSessionClick(session.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                      {session.student_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                      {session.activity_title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(session.status)}`}>
                        {session.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                      {session.duration_minutes ? `${session.duration_minutes.toFixed(1)} min` : 'In progress'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                      {session.tests_passed} / {session.tests_total}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">
                      {session.final_ces_score ? session.final_ces_score.toFixed(3) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getEngagementColor(session.final_ces_classification)}`}>
                        {session.final_ces_classification || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSessionClick(session.id);
                        }}
                        className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium cursor-pointer"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-primary)] rounded-lg shadow-2xl border border-[var(--border)] w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="bg-[var(--accent)] p-4 flex items-center justify-between rounded-t-lg sticky top-0">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Session Details - {selectedSession.session.student_name}
              </h3>
              <button
                onClick={() => setSelectedSession(null)}
                className="text-[var(--text-primary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
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
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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


            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
