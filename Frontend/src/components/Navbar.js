import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Navbar.css';

function Navbar({ adminToken, userToken, onAdminLogout, onUserLogout }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const close = () => setOpen(false);

  const handleAdminLogout = () => { onAdminLogout(); close(); navigate('/'); };
  const handleUserLogout = () => { onUserLogout(); close(); navigate('/'); };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Brand */}
        <Link to="/" className="navbar-brand" onClick={close}>
          <img src="https://static.vecteezy.com/system/resources/previews/024/474/342/large_2x/travel-bus-logo-template-with-white-background-suitable-for-your-design-need-logo-illustration-animation-etc-free-vector.jpg" alt="BusBazaar logo" className="brand-logo" />
          <span className="brand-name">Bus<span className="brand-accent">Bazaar</span></span>
        </Link>

        {/* Desktop links */}
        <ul className="navbar-menu">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/search">Search Buses</Link></li>

          {userToken && (
            <li><Link to="/my-bookings" className="nav-bookings">My Bookings</Link></li>
          )}

          {adminToken && (
            <>
              <li><Link to="/my-bookings" className="nav-bookings">My Bookings</Link></li>
              <li><Link to="/admin/dashboard" className="nav-dashboard">Dashboard</Link></li>
            </>
          )}

          {!adminToken && !userToken && (
            <>
              <li><Link to="/signup" className="nav-signup">Sign Up</Link></li>
              <li><Link to="/login" className="nav-login">Login</Link></li>
            </>
          )}

          {userToken && (
            <>
              <li><span className="nav-welcome">👤 {userToken.name}</span></li>
              <li><button onClick={handleUserLogout} className="nav-logout-btn">Logout</button></li>
            </>
          )}

          {adminToken && (
            <li><button onClick={handleAdminLogout} className="nav-logout-btn">Logout</button></li>
          )}

        </ul>

        {/* Hamburger */}
        <button className={`hamburger${open ? ' open' : ''}`} onClick={() => setOpen(o => !o)} aria-label="Menu">
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="mobile-menu">
          <Link to="/" onClick={close}>Home</Link>
          <Link to="/search" onClick={close}>Search Buses</Link>

          {userToken && (
            <Link to="/my-bookings" onClick={close} className="nav-bookings-mobile">🎟️ My Bookings</Link>
          )}

          {adminToken && (
            <>
              <Link to="/my-bookings" onClick={close} className="nav-bookings-mobile">🎟️ My Bookings</Link>
              <Link to="/admin/dashboard" onClick={close}>Dashboard</Link>
            </>
          )}

          {!adminToken && !userToken && (
            <>
              <Link to="/signup" onClick={close}>Sign Up</Link>
              <Link to="/login" onClick={close}>Login</Link>
            </>
          )}

          {userToken && (
            <>
              <span className="mobile-welcome">👤 {userToken.name}</span>
              <button onClick={handleUserLogout} className="mobile-logout">Logout</button>
            </>
          )}

          {adminToken && (
            <button onClick={handleAdminLogout} className="mobile-logout">Logout</button>
          )}

        </div>
      )}
    </nav>
  );
}

export default Navbar;
