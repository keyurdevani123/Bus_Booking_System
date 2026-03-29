import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { bookingService } from '../services/api';
import '../styles/PaymentSuccess.css';

function PaymentSuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const confirmed = useRef(false); // prevent double-call on StrictMode re-renders
  const [confirmState, setConfirmState] = useState('confirming'); // confirming | confirmed | failed
  const [confirmMessage, setConfirmMessage] = useState('Confirming your booking...');

  const from       = params.get('from')        || '—';
  const to         = params.get('to')          || '—';
  const date       = params.get('date')        || '—';
  const departure  = params.get('departure')   || '—';
  const arrival    = params.get('arrival')     || '—';
  const seats      = params.get('seats')       || '—';
  const price      = params.get('price')       || '—';
  const bus        = params.get('bus')         || '—';
  const busName    = params.get('name')        || '—';
  const email      = params.get('email')       || '—';
  const tempBookId = params.get('tempBookId')  || '';

  // Confirm booking on the backend (fallback for when Stripe webhook can't reach localhost)
  useEffect(() => {
    if (!tempBookId) {
      setConfirmState('failed');
      setConfirmMessage('Missing booking reference. Please contact support with payment details.');
      return;
    }
    if (confirmed.current) return;
    confirmed.current = true;
    setConfirmState('confirming');
    bookingService.confirmBooking(tempBookId)
      .then(() => {
        setConfirmState('confirmed');
        setConfirmMessage('Your booking is confirmed.');
        console.log('Booking confirmed via success page');
      })
      .catch((err) => {
        console.error('Confirm booking error:', err);
        setConfirmState('failed');
        setConfirmMessage(err.response?.data?.message || 'Payment received, but booking confirmation failed. Please contact support.');
      });
  }, [tempBookId]);

  const seatList = seats.split(',').join(', ');

  return (
    <div className="ps-wrapper">
      {/* Confetti dots (pure CSS) */}
      <div className="ps-confetti" aria-hidden="true">
        {[...Array(18)].map((_, i) => <span key={i} className={`ps-dot ps-dot-${i % 6}`} />)}
      </div>

      <div className="ps-card">
        {/* Icon */}
        <div className="ps-icon-ring">
          <svg viewBox="0 0 52 52" className="ps-checkmark" xmlns="http://www.w3.org/2000/svg">
            <circle cx="26" cy="26" r="25" fill="none" className="ps-circle" />
            <path className="ps-check" fill="none" strokeLinecap="round" strokeLinejoin="round" d="M14 27 l9 9 l16-16" />
          </svg>
        </div>

        <h1 className="ps-title">Payment Successful!</h1>
        <p className="ps-subtitle">
          {confirmState === 'confirming' && <>We received your payment. <strong>{confirmMessage}</strong></>}
          {confirmState === 'confirmed' && <>Your booking is <strong>confirmed</strong>. A ticket PDF has been sent to <strong>{email}</strong>.</>}
          {confirmState === 'failed' && <><strong>{confirmMessage}</strong></>}
        </p>

        {/* Ticket strip */}
        <div className="ps-ticket">
          {/* Route header */}
          <div className="ps-route-header">
            <div className="ps-city">
              <span className="ps-city-label">From</span>
              <span className="ps-city-name">{from}</span>
            </div>
            <div className="ps-route-line">
              <span className="ps-dot-small" />
              <span className="ps-line" />
              <span className="ps-plane">🚌</span>
              <span className="ps-line" />
              <span className="ps-dot-small" />
            </div>
            <div className="ps-city ps-city-right">
              <span className="ps-city-label">To</span>
              <span className="ps-city-name">{to}</span>
            </div>
          </div>

          {/* Details grid */}
          <div className="ps-divider-dashed" />
          <div className="ps-details-grid">
            <div className="ps-detail-item">
              <span className="ps-detail-label">Date</span>
              <span className="ps-detail-value">{date}</span>
            </div>
            <div className="ps-detail-item">
              <span className="ps-detail-label">Departure</span>
              <span className="ps-detail-value">{departure}</span>
            </div>
            <div className="ps-detail-item">
              <span className="ps-detail-label">Arrival</span>
              <span className="ps-detail-value">{arrival}</span>
            </div>
            <div className="ps-detail-item">
              <span className="ps-detail-label">Bus No.</span>
              <span className="ps-detail-value">{bus}</span>
            </div>
            <div className="ps-detail-item">
              <span className="ps-detail-label">Bus Name</span>
              <span className="ps-detail-value">{busName}</span>
            </div>
            <div className="ps-detail-item">
              <span className="ps-detail-label">Seat(s)</span>
              <span className="ps-detail-value">{seatList}</span>
            </div>
          </div>

          {/* Price footer */}
          <div className="ps-price-bar">
            <span className="ps-price-label">Total Paid</span>
            <span className="ps-price-amount">₹ {price}</span>
          </div>
        </div>

        {confirmState === 'confirmed' && (
          <p className="ps-email-note">
            📧 Check your inbox at <strong>{email}</strong> for the ticket PDF with QR code.
          </p>
        )}

        {confirmState === 'failed' && (
          <p className="ps-email-note">
            ⚠️ Ticket email was not sent because booking confirmation did not complete.
          </p>
        )}

        <button className="ps-home-btn" onClick={() => navigate('/')}>
          ← Back to Homepage
        </button>
      </div>
    </div>
  );
}

export default PaymentSuccess;
