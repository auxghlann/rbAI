import { useState } from 'react';
import Header from './components/Header.tsx';
import Home from './pages/Home.tsx';
import Dashboard from './pages/Dashboard.tsx';

function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'dashboard'>('home');

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {activeTab === 'home' && <Header />}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'home' ? <Home setActiveTab={setActiveTab} /> : <Dashboard />}
      </main>
    </div>
  );
}

export default App;