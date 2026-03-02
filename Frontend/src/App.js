import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './styles/App.css';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import BusSearch from './pages/BusSearch';
import Booking from './pages/Booking';
import Signup from './pages/Signup';
import AdminDashboard from './pages/AdminDashboard';
import CheckerLogin from './pages/CheckerLogin';
import CheckerDashboard from './pages/CheckerDashboard';
import Login from './pages/Login';
import PaymentSuccess from './pages/PaymentSuccess';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

function PrivateRoute({ userToken, children }) {
  const location = useLocation();
  if (!userToken && !localStorage.getItem('userToken')) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  return children;
}

function App() {
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken'));
  const [checkerToken, setCheckerToken] = useState(localStorage.getItem('checkerToken'));
  const [userToken, setUserToken] = useState(() => {
    try {
      const stored = localStorage.getItem('userToken');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const handleSetAdminToken = (token) => {
    console.log("App: Setting admin token:", token);
    if (token) {
      localStorage.setItem('adminToken', token);
    } else {
      localStorage.removeItem('adminToken');
    }
    setAdminToken(token);
  };

  const handleSetCheckerToken = (token) => {
    console.log("App: Setting checker token:", token);
    setCheckerToken(token);
  };

  const handleSetUserToken = (token) => {
    console.log("App: Setting user token:", token);
    setUserToken(token);
  };

  const handleAdminLogout = () => {
    setAdminToken(null);
    localStorage.removeItem('adminToken');
    sessionStorage.clear();
  };

  const handleCheckerLogout = () => {
    setCheckerToken(null);
    localStorage.removeItem('checkerToken');
    sessionStorage.clear();
  };

  const handleUserLogout = () => {
    setUserToken(null);
    localStorage.removeItem('userToken');
    sessionStorage.clear();
  };

  return (
    <Router>
      <Navbar 
        adminToken={adminToken} 
        checkerToken={checkerToken} 
        userToken={userToken}
        onAdminLogout={handleAdminLogout} 
        onCheckerLogout={handleCheckerLogout}
        onUserLogout={handleUserLogout}
      />
      <main className="main-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<BusSearch />} />
          <Route path="/booking/:busId" element={
            <PrivateRoute userToken={userToken}><Booking /></PrivateRoute>
          } />
          <Route path="/signup" element={<Signup />} />
          <Route path="/admin/login" element={<Navigate to="/login?tab=admin" replace />} />
          <Route
            path="/admin/dashboard"
            element={(adminToken || localStorage.getItem('adminToken')) ? (
              <AdminDashboard token={adminToken || localStorage.getItem('adminToken')} />
            ) : (
              <Navigate to="/admin/login" />
            )}
          />
          <Route path="/checker/login" element={<CheckerLogin setToken={handleSetCheckerToken} />} />
          <Route path="/checker/dashboard" element={checkerToken ? <CheckerDashboard token={checkerToken} /> : <Navigate to="/checker/login" />} />
          <Route path="/user/login" element={<Login setUserToken={handleSetUserToken} setAdminToken={handleSetAdminToken} />} />
          <Route path="/login"      element={<Login setUserToken={handleSetUserToken} setAdminToken={handleSetAdminToken} />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/payment-success" element={
            <PrivateRoute userToken={userToken}><PaymentSuccess /></PrivateRoute>
          } />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
