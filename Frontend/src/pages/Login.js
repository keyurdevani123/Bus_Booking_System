import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authService } from '../services/api';
import '../styles/Auth.css';

function Login({ setUserToken, setAdminToken }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-select admin tab if arriving from /admin/login path or ?tab=admin
  const params = new URLSearchParams(location.search);
  const defaultTab = location.pathname === '/admin/login' || params.get('tab') === 'admin'
    ? 'admin' : 'user';

  const [tab, setTab]           = useState(defaultTab);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  // User fields
  const [email, setEmail]       = useState(() => {
    try { return sessionStorage.getItem('loginEmail') || ''; } catch { return ''; }
  });
  const [userPass, setUserPass] = useState('');

  // Admin fields
  const [username, setUsername] = useState('');
  const [adminPass, setAdminPass] = useState('');

  const redirectTo = params.get('redirect') || '/';

  const switchTab = (t) => { setTab(t); setError(''); };

  /* ── User Login ── */
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await authService.userLogin(email, userPass);
      localStorage.setItem('userToken', JSON.stringify(res.data.user));
      sessionStorage.removeItem('loginEmail');
      setUserToken(res.data.user);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally { setLoading(false); }
  };

  /* ── Admin Login ── */
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await authService.adminLogin(username, adminPass);
      if (res.data?.token && res.data?.admin) {
        localStorage.setItem('adminToken', res.data.token);
        localStorage.setItem('adminData', JSON.stringify(res.data.admin));
        setAdminToken(res.data.token);
        setTimeout(() => navigate('/admin/dashboard'), 100);
      } else {
        setError('Invalid server response. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed. Please check your credentials.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-container">
      <div className="auth-box login-combined-box">

        {/* Tab switcher */}
        <div className="login-tabs">
          <button
            className={`login-tab ${tab === 'user' ? 'login-tab-active' : ''}`}
            onClick={() => switchTab('user')}
            type="button">
            <span className="login-tab-icon">👤</span> User
          </button>
          <button
            className={`login-tab ${tab === 'admin' ? 'login-tab-active' : ''}`}
            onClick={() => switchTab('admin')}
            type="button">
            <span className="login-tab-icon">🛡️</span> Admin
          </button>
        </div>

        <h2 className="login-title">
          {tab === 'user' ? '👤 User Login' : '🛡️ Admin Login'}
        </h2>

        {tab === 'user' && params.get('redirect') && (
          <div className="info-message">Please log in to continue.</div>
        )}
        {error && <div className="error-message">{error}</div>}

        {/* ── USER FORM ── */}
        {tab === 'user' && (
          <form onSubmit={handleUserSubmit}>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                try { sessionStorage.setItem('loginEmail', e.target.value); } catch {}
              }}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={userPass}
              onChange={(e) => setUserPass(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Logging in…' : 'Login'}
            </button>
            <p className="forgot-link"><Link to="/forgot-password?type=user">Forgot password?</Link></p>
          </form>
        )}

        {/* ── ADMIN FORM ── */}
        {tab === 'admin' && (
          <form onSubmit={handleAdminSubmit}>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={adminPass}
              onChange={(e) => setAdminPass(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Logging in…' : 'Login'}
            </button>
            <p className="forgot-link"><Link to="/forgot-password?type=admin">Forgot password?</Link></p>
          </form>
        )}

        {tab === 'user' && (
          <p className="auth-footer">
            Don't have an account? <Link to="/signup">Sign up here</Link>
          </p>
        )}
        {tab === 'admin' && (
          <p className="auth-footer" style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Admin accounts are managed by the system owner.
          </p>
        )}

      </div>
    </div>
  );
}

export default Login;
