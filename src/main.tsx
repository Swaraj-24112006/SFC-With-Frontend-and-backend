import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import LoginPage from './Login/LoginPage.tsx';
import { isAuthenticated, AuthUser, getUser, saveUser } from './utils/auth.ts';
import './index.css';

function Root() {
  const [loggedIn, setLoggedIn] = useState<boolean>(() => isAuthenticated());
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getUser());

  // Session timeout watcher — check every 60 seconds
  useEffect(() => {
    if (!loggedIn) return;
    const interval = setInterval(() => {
      if (!isAuthenticated()) {
        setLoggedIn(false);
        setCurrentUser(null);
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [loggedIn]);

  const handleLoginSuccess = (user: AuthUser) => {
    saveUser(user);
    setCurrentUser(user);
    setLoggedIn(true);
  };

  const handleSessionEnd = () => {
    // Called on explicit logout OR automatic session timeout
    setLoggedIn(false);
    setCurrentUser(null);
  };

  if (!loggedIn) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return <App loggedInUser={currentUser} onLogout={handleSessionEnd} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

