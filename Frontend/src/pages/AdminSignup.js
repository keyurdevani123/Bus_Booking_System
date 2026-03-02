import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import '../styles/Auth.css';

function AdminSignup() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'admin',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const roles = [
    { value: 'super_admin', label: 'Super Admin (Full Access)' },
    { value: 'admin', label: 'Admin (Limited Access)' },
    { value: 'moderator', label: 'Moderator (View Only)' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.username || !formData.password) {
      setError('Username and password are required');
      setLoading(false);
      return;
    }

    try {
      const response = await authService.adminSignup(
        formData.username,
        formData.email,
        formData.password,
        formData.role
      );
      setError('');
      // Show success message and redirect to login
      alert('Admin account created successfully! Please login with your credentials.');
      navigate('/admin/login');
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
        <h2>Create Admin Account</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="username"
            placeholder="Admin Username"
            value={formData.username}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email Address (Optional)"
            value={formData.email}
            onChange={handleChange}
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <div className="role-section">
            <label>Select Admin Role:</label>
            <div className="role-options">
              {roles.map(role => (
                <label key={role.value} className="role-option">
                  <input
                    type="radio"
                    name="role"
                    value={role.value}
                    checked={formData.role === role.value}
                    onChange={handleChange}
                  />
                  <span>{role.label}</span>
                </label>
              ))}
            </div>
            <div className="role-description">
              {formData.role === 'super_admin' && (
                <p>Super Admin: Full access to all features and admin management</p>
              )}
              {formData.role === 'admin' && (
                <p>Admin: Can manage buses, bookings, and view reports</p>
              )}
              {formData.role === 'moderator' && (
                <p>Moderator: Can view data but limited editing capabilities</p>
              )}
            </div>
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Admin Account'}
          </button>
        </form>
        <p className="auth-footer">
          Already have an account? <Link to="/admin/login">Login here</Link>
        </p>
      </div>
    </div>
  );
}

export default AdminSignup;
