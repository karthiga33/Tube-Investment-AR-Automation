import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import TopNav from './components/TopNav';
import DashboardPage from './pages/DashboardPage';
import ValidationPage from './pages/ValidationPage';
import StatusPage from './pages/StatusPage';
import AuthPage from './pages/AuthPage';
import { getCurrentSession, signOut, getUserAttributes } from './auth';
import './index.css';

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking,      setChecking]      = useState(true);
  const [userName,      setUserName]      = useState('');

  // Check if user is already logged in (session stored in localStorage by Cognito)
  useEffect(() => {
    getCurrentSession()
      .then(() => getUserAttributes())
      .then((attrs) => {
        setUserName(attrs.name || attrs.email || '');
        setAuthenticated(true);
      })
      .catch(() => setAuthenticated(false))
      .finally(() => setChecking(false));
  }, []);

  const handleLogin = () => {
    getUserAttributes()
      .then((attrs) => setUserName(attrs.name || attrs.email || ''))
      .catch(() => {});
    setAuthenticated(true);
  };

  const handleLogout = () => {
    signOut();
    setAuthenticated(false);
    setUserName('');
  };

  // Show nothing while checking session
  if (checking) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'#6b7280' }}>
        Loading...
      </div>
    );
  }

  // Not logged in → show login page
  if (!authenticated) {
    return <AuthPage onLogin={handleLogin} />;
  }

  // Logged in → show app
  return (
    <BrowserRouter>
      <div className="app-shell">
        <TopNav userName={userName} onLogout={handleLogout} />
        <div className="app-body">
          <Routes>
            <Route path="/"           element={<DashboardPage />} />
            <Route path="/validate"   element={<ValidationPage />} />
            <Route path="/status"     element={<StatusPage />} />
            <Route path="*"           element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
