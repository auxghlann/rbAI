import { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import type { UserData } from './pages/Login.tsx';

// Lazy load components
const Header = lazy(() => import('./components/Header.tsx'));
const Home = lazy(() => import('./pages/Home.tsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.tsx'));
const Login = lazy(() => import('./pages/Login.tsx'));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      <p className="text-[var(--text-tertiary)] text-sm">Loading...</p>
    </div>
  </div>
);

function App() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = (userData: UserData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Home Route */}
            <Route 
              path="/" 
              element={
                <div className="flex flex-col h-screen bg-[var(--bg-primary)]">
                  <Suspense fallback={<div className="h-16 bg-[var(--bg-primary)]" />}>
                    <Header />
                  </Suspense>
                  <main className="flex-1 overflow-hidden">
                    <Home />
                  </main>
                </div>
              } 
            />

          {/* Login Route */}
          <Route 
            path="/login" 
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Login onLogin={handleLogin} />
              )
            } 
          />

          {/* Dashboard Route - Protected */}
          <Route 
            path="/dashboard" 
            element={
              isAuthenticated ? (
                <Dashboard user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;