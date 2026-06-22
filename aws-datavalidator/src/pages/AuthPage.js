import React, { useState } from 'react';
import { signIn } from '../auth';
import './AuthPage.css';

export default function AuthPage({ onLogin }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await signIn(email, password);
      onLogin();
    } catch (err) {
      const msg = err.code === 'UserNotFoundException' ? 'User not found.'
        : err.code === 'NotAuthorizedException' ? 'Incorrect email or password.'
        : err.code === 'UserNotConfirmedException' ? 'Email not verified.'
        : err.message || 'Sign in failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">AR Automation</div>
        <p className="auth-subtitle">AR Document Validation Platform</p>

        <form onSubmit={handleSignIn} className="auth-form">
          <h2>Sign In</h2>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          {error && <p className="auth-error">{error}</p>}
        </form>
      </div>
    </div>
  );
}
