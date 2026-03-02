import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import '../styles/Auth.css';

function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const token = params.get('token') || '';
  const type = params.get('type') || 'user';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return setError('Passwords do not match.');
    if (password.length < 5) return setError('Password must be at least 5 characters.');
    setError('');
    setLoading(true);
    try {
      const res = await authService.resetPassword(token, type, password);
      setSuccess(res.data.message || 'Password reset successful!');
      setTimeout(() => navigate(type === 'admin' ? '/login?tab=admin' : '/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <h2>Invalid Link</h2>
          <p className="error-message">No reset token found. Please request a new link.</p>
          <p className="auth-footer"><Link to="/forgot-password">Forgot Password</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Set New Password</h2>

        {success && <div className="success-message">{success}<br /><small>Redirecting to login…</small></div>}
        {error && <div className="error-message">{error}</div>}

        {!success && (
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
        )}

        <p className="auth-footer">
          <Link to={type === 'admin' ? '/login?tab=admin' : '/login'}>Back to Login</Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPassword;
