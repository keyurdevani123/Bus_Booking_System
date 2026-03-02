import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import '../styles/Auth.css';

function AdminLogin({ setToken }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log("Attempting admin login with:", { username });
      const response = await authService.adminLogin(username, password);
      console.log("Login response:", response.data);
      
      if (response.data && response.data.token && response.data.admin) {
        console.log("Setting tokens and navigating...");
        localStorage.setItem('adminToken', response.data.token);
        localStorage.setItem('adminData', JSON.stringify(response.data.admin));
        setToken(response.data.token);
        
        // Add a small delay to allow state to update before navigating
        setTimeout(() => {
          console.log("Navigating to /admin/dashboard");
          navigate('/admin/dashboard');
        }, 100);
      } else {
        console.error("Invalid response structure:", response.data);
        setError('Invalid server response. Please try again.');
      }
    } catch (err) {
      console.error("Login error:", err);
      const errorMsg = err.response?.data?.message || err.message || 'Login failed. Please check your credentials.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Admin Login</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="auth-footer">
          Don't have an account? <Link to="/signup">Create one here</Link>
        </p>
      </div>
    </div>
  );
}

export default AdminLogin;
