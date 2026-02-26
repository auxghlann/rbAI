import { useState, lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import type { UserData } from './pages/Login.tsx';
import { logger } from './utils/logger';

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
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('rbai_user');
    const storedAuth = localStorage.getItem('rbai_authenticated');
    
    if (storedUser && storedAuth === 'true') {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        logger.error('Failed to parse stored user data', error);
        localStorage.removeItem('rbai_user');
        localStorage.removeItem('rbai_authenticated');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (userData: UserData) => {
    setUser(userData);
    setIsAuthenticated(true);
    // Persist to localStorage
    localStorage.setItem('rbai_user', JSON.stringify(userData));
    localStorage.setItem('rbai_authenticated', 'true');
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    // Clear localStorage
    localStorage.removeItem('rbai_user');
    localStorage.removeItem('rbai_authenticated');
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return <LoadingSpinner />;
  }

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

          {/* Dashboard Analytics Route - Protected */}
          <Route 
            path="/dashboard/analytics" 
            element={
              isAuthenticated ? (
                <Dashboard user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />

          {/* Activity Route - Protected, with activity ID */}
          <Route 
            path="/activity/:activityId" 
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