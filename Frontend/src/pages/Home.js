import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Home.css';

function Home() {
  return (
    <div className="home">

      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-badge">🇮🇳 India's Smart Bus Booking</div>
          <h1>Travel Smarter with <span>BusBazaar</span></h1>
          <p>Search routes, pick your seat and pay securely — all in minutes.</p>
          <div className="hero-actions">
            <Link to="/search" className="btn-primary">🔍 Search Buses</Link>
            <Link to="/signup" className="btn-outline">Create Free Account</Link>
          </div>
        </div>
        <div className="hero-visual">🚌</div>
      </section>

      {/* Stats */}
      <section className="stats">
        <div className="stat"><span>500+</span><p>Routes</p></div>
        <div className="stat"><span>50+</span><p>Cities</p></div>
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
            <h4>Pay & Go</h4>
            <p>Complete payment and get your e-ticket via email</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <h2>Ready to book your next trip?</h2>
        <p>Join thousands of travelers who use BusBazaar every day.</p>
        <Link to="/signup" className="btn-primary">Get Started — It's Free</Link>
      </section>

    </div>
  );
}

export default Home;
