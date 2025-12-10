import { useState } from 'react';
import Header from './components/Header.tsx';
import Home from './pages/Home.tsx';
import CodePlayground from './pages/code_playground.tsx';

function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'playground'>('home');

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {activeTab === 'home' && <Header />}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'home' ? <Home setActiveTab={setActiveTab} /> : <CodePlayground setActiveTab={setActiveTab} />}
      </main>
    </div>
  );
}

export default App;