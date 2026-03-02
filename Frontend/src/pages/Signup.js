import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import '../styles/Auth.css';

function Signup() {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '', phone: '',
  });
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match.');
    }
    setLoading(true); setError(''); setSuccess('');
    try {
      await authService.userSignup(formData.name, formData.email, formData.password, formData.phone);
      setSuccess('Account created! Redirecting to login…');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Create Account</h2>
        <p className="auth-subtitle">Join BusBazaar and book your tickets easily.</p>

        {error   && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit}>
          <input type="text"  name="name"  placeholder="Full Name"     value={formData.name}            onChange={handleChange} required />
          <input type="email" name="email" placeholder="Email Address" value={formData.email}           onChange={handleChange} required />
          <input type="tel"   name="phone" placeholder="Phone Number"  value={formData.phone}           onChange={handleChange} required />
          <input type="password" name="password"        placeholder="Password"         value={formData.password}        onChange={handleChange} required />
          <input type="password" name="confirmPassword" placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleChange} required />
          <button type="submit" disabled={loading}>
            {loading ? 'Creating Account…' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
