import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center h-full bg-[var(--bg-primary)]">
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold text-[var(--text-primary)] mb-4">
          Welcome to rbAI
        </h1>
        <p className="text-xl text-[var(--text-secondary)] mb-8">
          Rule-Based AI for Behavioral Monitoring and Analysis
        </p>
        <p className="text-lg text-[var(--text-tertiary)] max-w-2xl mx-auto">
          A comprehensive system for tracking coding behavior, monitoring telemetry,
          and analyzing student performance through intelligent behavioral patterns.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="mt-8 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-inverse)] font-semibold px-8 py-3 rounded-lg transition-colors cursor-pointer"
        >
          Try Demo
        </button>
        <div className="mt-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-[var(--bg-card)] p-6 rounded-lg border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Real-time Telemetry</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Track keystrokes, edit patterns, and code changes in real-time
              </p>
            </div>
            <div className="bg-[var(--bg-card)] p-6 rounded-lg border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Behavioral Analysis</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Monitor focus violations and detect suspicious patterns
              </p>
            </div>
            <div className="bg-[var(--bg-card)] p-6 rounded-lg border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors">
              <div className="text-3xl mb-3">💻</div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Code Playground</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Interactive Monaco Editor with integrated monitoring
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
