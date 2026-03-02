import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authService } from '../services/api';
import '../styles/Auth.css';

function UserLogin({ setToken }) {
  const [email, setEmail] = useState(() => {
    try { return sessionStorage.getItem('loginEmail') || ''; } catch { return ''; }
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Read redirect destination from query param e.g. /user/login?redirect=%2Fsearch
  const params = new URLSearchParams(location.search);
  const redirectTo = params.get('redirect') || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authService.userLogin(email, password);
      localStorage.setItem('userToken', JSON.stringify(response.data.user));
      sessionStorage.removeItem('loginEmail');
      setToken(response.data.user);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>User Login</h2>
        {params.get('redirect') && (
          <div className="info-message">Please log in to continue.</div>
        )}
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => { setEmail(e.target.value); try { sessionStorage.setItem('loginEmail', e.target.value); } catch {} }}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="auth-footer">
          Don't have an account? <Link to="/signup">Sign up here</Link>
        </p>
      </div>
    </div>
  );
}

export default UserLogin;
