import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/api';
import '../styles/Auth.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [type, setType] = useState('user');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await authService.forgotPassword(email, type);
      setMessage(res.data.message || 'If that email is registered, a reset link has been sent.');
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Forgot Password</h2>
        <p className="auth-subtitle">Enter your email and we'll send you a reset link.</p>

        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        {!sent && (
          <form onSubmit={handleSubmit}>
            <div className="type-toggle">
              <button
                type="button"
                className={`toggle-btn${type === 'user' ? ' active' : ''}`}
                onClick={() => setType('user')}
              >User</button>
              <button
                type="button"
                className={`toggle-btn${type === 'admin' ? ' active' : ''}`}
                onClick={() => setType('admin')}
              >Admin</button>
            </div>
            <input
              type="email"
              placeholder="Registered Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <p className="auth-footer">
          Remember your password?{' '}
          <Link to={type === 'admin' ? '/login?tab=admin' : '/login'}>Log in</Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
