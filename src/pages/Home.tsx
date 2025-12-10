interface HomeProps {
  setActiveTab: (tab: 'home' | 'playground') => void;
}

function Home({ setActiveTab }: HomeProps) {
  return (
    <div className="flex items-center justify-center h-full bg-gray-900">
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold text-white mb-4">
          Welcome to rbAI
        </h1>
        <p className="text-xl text-gray-400 mb-8">
          Rule-Based AI for Behavioral Monitoring and Analysis
        </p>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          A comprehensive system for tracking coding behavior, monitoring telemetry,
          and analyzing student performance through intelligent behavioral patterns.
        </p>
        <button
          onClick={() => setActiveTab('playground')}
          className="mt-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
        >
          Try Demo
        </button>
        <div className="mt-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="text-lg font-semibold text-white mb-2">Real-time Telemetry</h3>
              <p className="text-sm text-gray-400">
                Track keystrokes, edit patterns, and code changes in real-time
              </p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="text-lg font-semibold text-white mb-2">Behavioral Analysis</h3>
              <p className="text-sm text-gray-400">
                Monitor focus violations and detect suspicious patterns
              </p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="text-3xl mb-3">💻</div>
              <h3 className="text-lg font-semibold text-white mb-2">Code Playground</h3>
              <p className="text-sm text-gray-400">
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
