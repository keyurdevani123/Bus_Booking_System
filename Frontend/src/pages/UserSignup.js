import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import '../styles/Auth.css';

function UserSignup({ setToken }) {
  const [formData, setFormData] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('signupForm') || 'null');
      return saved || { name: '', email: '', password: '', phone: '' };
    } catch { return { name: '', email: '', password: '', phone: '' }; }
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);
    // Persist everything except password
    try {
      sessionStorage.setItem('signupForm', JSON.stringify({ ...updated, password: '' }));
    } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.name || !formData.email || !formData.password || !formData.phone) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    try {
      const response = await authService.userSignup(
        formData.name,
        formData.email,
        formData.password,
        formData.phone
      );
      const { token, user } = response.data;
      if (token) localStorage.setItem('userToken', token);
      if (user) localStorage.setItem('userData', JSON.stringify(user));
      setToken(token || (user && user._id) || null);
      navigate('/');
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Signup failed. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Create Account</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="tel"
            name="phone"
            placeholder="Phone Number"
            value={formData.phone}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        <p className="auth-footer">
          Already have an account? <Link to="/user/login">Login here</Link>
        </p>
      </div>
    </div>
  );
}

export default UserSignup;
