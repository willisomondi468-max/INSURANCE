import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import api from '../api';

/**
 * Login.jsx - Premium cinematic login page
 * Split-screen design with cinematic visual on left, auth form on right
 */
const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await login(email, password, rememberMe);
      if (result.success) {
        const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user'));
        if (user.role === 'system_admin') navigate('/system/dashboard');
        else if (user.role === 'company_admin' || user.role === 'admin') navigate('/admin');
        else if (user.role === 'provider') navigate('/provider');
        else if (user.role === 'customer') navigate('/customer');
        else navigate('/workforce/attendance');
      } else {
        setError(result.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/forgot-password', { email: resetEmail });
      if (response.success) {
        alert('If an account exists with this email, a password reset link has been sent.');
        setForgotPassword(false);
        setResetEmail('');
      } else {
        setError(response.message || 'Password reset request failed.');
      }
    } catch (err) {
      setError(err.message || 'Password reset failed. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  if (forgotPassword) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> Forgot Password
          </div>
          <h1 className="auth-title">Reset Your Password</h1>
          <p className="auth-subtitle">Enter your email and we'll send you reset instructions</p>

          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={resetLoading}>
              {resetLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="text-center mt-4">
            <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => setForgotPassword(false)}>
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      {/* Left: Cinematic Visual */}
      <div className="auth-visual">
        <div className="auth-visual-content">
          <div className="auth-visual-logo">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span style={{ fontSize: '24px', fontWeight: 800, color: 'white', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>InsuraVault</span>
          </div>
          <h1 style={{ fontSize: '34px', fontWeight: 800, color: 'white', marginBottom: '16px', lineHeight: 1.2 }}>Security Begins With Confidence.</h1>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.9)', maxWidth: '450px', lineHeight: 1.6, marginBottom: '32px' }}>
            Your gateway to intelligent insurance management. Securely access your workforce data, attendance records, task management, and performance analytics.
          </p>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.9)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>24/7 Access Control</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.9)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              <span>Secure Authentication</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.9)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="9"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="15"/></svg>
              <span>Real-time Analytics</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> InsuraVault
          </div>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to your account</p>
        </div>

        {error && (
          <div className="form-group" style={{ color: '#dc2626', background: '#fef2f2', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label htmlFor="rememberMe" className="form-label" style={{ fontSize: '14px', fontWeight: 500, marginBottom: 0 }}>
              Remember me
            </label>
            <button className="text-link" onClick={(e) => { e.preventDefault(); setForgotPassword(true); }} style={{ color: '#1677FF', textDecoration: 'none', fontSize: '14px', marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Forgot password?
            </button>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center mt-3">
          Don't have an account? <a href="/register">Register</a>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
