import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cityService } from '../services/api';
import CitySearchInput from '../components/CitySearchInput';
import '../styles/Home.css';

function Home() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];

  const [from, setFrom]   = useState('');
  const [to, setTo]       = useState('');
  const [date, setDate]   = useState(today);
  const [cities, setCities] = useState([]);
  const [formErr, setFormErr] = useState('');

  const userToken = (() => {
    try {
      const s = localStorage.getItem('userToken');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  })();

  useEffect(() => {
    cityService.getAllCities()
      .then(r => setCities(Array.isArray(r.data) ? r.data : []))
      .catch(() => setCities([]));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setFormErr('');
    if (!from)        { setFormErr('Please select a departure city.'); return; }
    if (!to)          { setFormErr('Please select a destination city.'); return; }
    if (from === to)  { setFormErr('Departure and destination must be different.'); return; }
    // Pass selections to BusSearch via sessionStorage so it auto-triggers
    try {
      sessionStorage.setItem('busSearchState',   JSON.stringify({ from, to }));
      sessionStorage.setItem('busSearchTrigger', JSON.stringify({ date }));
    } catch {}
    navigate('/search');
  };

  return (
    <div className="home">

      {/* Hero */}
      <section className="hero">
        {/* <img src="https://static.vecteezy.com/system/resources/previews/024/474/342/large_2x/travel-bus-logo-template-with-white-background-suitable-for-your-design-need-logo-illustration-animation-etc-free-vector.jpg" alt="" className="hero-logo" /> */}
        <div className="hero-text">
          {userToken ? (
            <h1>Welcome back, <span>{userToken.name.split(' ')[0]}</span>! 👋</h1>
          ) : (
            <h1>Travel Smarter with <span>BusBazaar</span></h1>
          )}
          <p>Search routes, pick your seat and pay securely.</p>
        </div>
      </section>

      {/* Search Form */}
      <section className="home-search-section">
        <div className="home-search-card">
          <h2>Find Your Bus</h2>
          <form className="home-search-form" onSubmit={handleSearch}>
            <div className="hs-row">
              <div className="hs-field">
                <label htmlFor="hs-from">From</label>
                <CitySearchInput
                  id="hs-from"
                  value={from}
                  onChange={(city) => { setFrom(city); setFormErr(''); }}
                  cities={cities}
                  placeholder="Departure city"
                />
              </div>
              <button type="button" className="hs-swap" title="Swap cities"
                onClick={() => { const t = from; setFrom(to); setTo(t); setFormErr(''); }}>⇄</button>
              <div className="hs-field">
                <label htmlFor="hs-to">To</label>
                <CitySearchInput
                  id="hs-to"
                  value={to}
                  onChange={(city) => { setTo(city); setFormErr(''); }}
                  cities={cities}
                  placeholder="Destination city"
                />
              </div>
              <div className="hs-field hs-date">
                <label>Date</label>
                <input type="date" value={date} min={today} onChange={e => setDate(e.target.value)} />
              </div>
              <button type="submit" className="hs-btn">Search Buses</button>
            </div>
            {formErr && <p className="hs-error">{formErr}</p>}
          </form>
        </div>
      </section>

      {/* Stats */}
      <section className="stats">
        <div className="stat"><span>500+</span><p>Routes</p></div>
        <div className="stat"><span>100+</span><p>Cities</p></div>
        <div className="stat"><span>10K+</span><p>Happy Travelers</p></div>
        <div className="stat"><span>100%</span><p>Secure Payments</p></div>
      </section>

      {/* Features */}
      <section className="features">
        <h2>Why Choose BusBazaar?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🗺️</div>
            <h3>Wide Coverage</h3>
            <p>Hundreds of routes covering major cities and towns across the country.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💺</div>
            <h3>Seat Selection</h3>
            <p>Choose your preferred seat before booking — window, aisle, or anywhere.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💳</div>
            <h3>Secure Payments</h3>
            <p>Pay with confidence using Stripe — your card data is always encrypted.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📧</div>
            <h3>Instant Tickets</h3>
            <p>Get your e-ticket with QR code delivered to your email instantly.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h3>Mobile Friendly</h3>
            <p>Book from any device — phone, tablet, or desktop. Fully responsive.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔄</div>
            <h3>Live Availability</h3>
            <p>Real-time seat availability updated as bookings are made.</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-num">1</div>
            <h4>Search</h4>
            <p>Enter your from/to city and travel date</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-num">2</div>
            <h4>Select Seat</h4>
            <p>Pick your preferred seat from the live seat map</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-num">3</div>
            <h4>Pay &amp; Go</h4>
            <p>Complete payment and get your e-ticket via email</p>
          </div>
        </div>
      </section>

      {/* CTA — only for guests */}
      {!userToken && (
        <section className="cta-section">
          <h2>Ready to book your next trip?</h2>
          <p>Join thousands of travelers who use BusBazaar every day.</p>
          <Link to="/signup" className="btn-primary">Get Started — It's Free</Link>
        </section>
      )}

    </div>
  );
}

export default Home;
