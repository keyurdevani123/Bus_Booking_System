import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingService, waitlistService } from '../services/api';
import '../styles/BookingHistory.css';

function BookingHistory() {
  const [bookings, setBookings] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all | upcoming | past
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelError, setCancelError] = useState('');
  const [confirmTarget, setConfirmTarget] = useState(null); // bookingId waiting for confirm

  // Waitlist tab
  const [view, setView] = useState('bookings'); // 'bookings' | 'waitlist'
  const [waitlist, setWaitlist] = useState(null); // null = not yet fetched
  const [wlLoading, setWlLoading] = useState(false);
  const [wlError, setWlError] = useState('');

  const userToken = (() => {
    try {
      const s = localStorage.getItem('userToken');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  })();

  const today = new Date().toISOString().split('T')[0];
  const CACHE_KEY = `bh_cache_${userToken?.id || userToken?.email}`;

  useEffect(() => {
    if (!userToken?.email) {
      setError('You must be logged in to view booking history.');
      setLoading(false);
      return;
    }

    // Show cached data instantly so the page feels immediate
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY));
      if (cached?.length) {
        setBookings(cached);
        setFiltered(cached);
        setLoading(false); // render now, refresh silently below
      }
    } catch {}

    bookingService.getUserBookingHistory(userToken.email, userToken.id, userToken.phone)
      .then((res) => {
        const data = res.data || [];
        setBookings(data);
        setFiltered(data);
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load booking history.');
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (filter === 'upcoming') {
      setFiltered(bookings.filter((b) => b.date >= today));
    } else if (filter === 'past') {
      setFiltered(bookings.filter((b) => b.date < today));
    } else {
      setFiltered(bookings);
    }
  }, [filter, bookings, today]);

  // Step 1: open the confirm modal
  const handleCancel = (bookingId) => {
    setConfirmTarget(bookingId);
  };

  // Step 2: user clicked "Yes, Cancel" inside modal
  const doCancel = async () => {
    const bookingId = confirmTarget;
    setConfirmTarget(null);
    setCancellingId(bookingId);
    setCancelError('');
    try {
      await bookingService.cancelBooking(bookingId);
      setBookings((prev) => prev.filter((b) => b._id !== bookingId));
    } catch (err) {
      setCancelError(err.response?.data?.message || 'Failed to cancel booking. Please try again.');
    } finally {
      setCancellingId(null);
    }
  };

  const fetchWaitlist = () => {
    if (!userToken?.email) return;
    setWlLoading(true);
    setWlError('');
    waitlistService.getUserWaitlist(userToken.email, userToken.id)
      .then((res) => setWaitlist(res.data || []))
      .catch((err) => setWlError(err.response?.data?.message || 'Failed to load waitlist.'))
      .finally(() => setWlLoading(false));
  };

  const handleLeaveWaitlist = async (id) => {
    try {
      await waitlistService.leave(id);
      setWaitlist((prev) => prev.filter((e) => e._id !== id));
    } catch (err) {
      setWlError(err.response?.data?.message || 'Failed to leave waitlist.');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (t) => t || '—';

  const getStatus = (b) => {
    if (b.isChecked) return { label: 'Boarded', cls: 'status-boarded' };
    if (b.date < today) return { label: 'Completed', cls: 'status-completed' };
    if (b.date === today) return { label: 'Today', cls: 'status-today' };
    return { label: 'Upcoming', cls: 'status-upcoming' };
  };

  if (loading) {
    return (
      <div className="bh-container">
        <div className="bh-header">
          <div className="bh-header-left">
            <div className="bh-skel bh-skel-title"></div>
            <div className="bh-skel bh-skel-sub"></div>
          </div>
        </div>
        <div className="bh-summary-row">
          {[1,2,3,4].map(i => (
            <div key={i} className="bh-summary-card">
              <div className="bh-skel bh-skel-icon"></div>
              <div><div className="bh-skel bh-skel-num"></div><div className="bh-skel bh-skel-label"></div></div>
            </div>
          ))}
        </div>
        <div className="bh-list">
          {[1,2,3].map(i => (
            <div key={i} className="bh-card">
              <div className="bh-card-accent" style={{background:'#e5e7eb'}}></div>
              <div className="bh-card-body">
                <div className="bh-route-row">
                  <div className="bh-city"><div className="bh-skel bh-skel-xs"></div><div className="bh-skel bh-skel-city"></div><div className="bh-skel bh-skel-time"></div></div>
                  <div className="bh-route-line" style={{flex:1}}><div className="bh-skel" style={{height:2,width:'100%'}}></div></div>
                  <div className="bh-city bh-city-right"><div className="bh-skel bh-skel-xs"></div><div className="bh-skel bh-skel-city"></div><div className="bh-skel bh-skel-time"></div></div>
                </div>
                <div className="bh-meta-row">
                  <div className="bh-skel bh-skel-meta"></div>
                  <div className="bh-skel bh-skel-meta"></div>
                </div>
              </div>
              <div className="bh-card-right"><div className="bh-skel bh-skel-badge"></div></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bh-container">
        <div className="bh-error">
          <span>⚠️</span>
          <p>{error}</p>
          <Link to="/login" className="bh-btn-primary">Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bh-container">
      {/* Header */}
      <div className="bh-header">
        <div className="bh-header-left">
          <h1>My Bookings</h1>
          <p>Welcome back, <strong>{userToken?.name}</strong> — here are all your trips.</p>
        </div>
        <Link to="/search" className="bh-btn-primary">Book Ticket</Link>
      </div>

      {/* Summary Cards */}
      <div className="bh-summary-row">
        <div className="bh-summary-card">
          <span className="bh-sum-icon">🎟️</span>
          <div>
            <div className="bh-sum-val">{bookings.length}</div>
            <div className="bh-sum-label">Total Trips</div>
          </div>
        </div>
        <div className="bh-summary-card">
          <span className="bh-sum-icon">🚀</span>
          <div>
            <div className="bh-sum-val">{bookings.filter((b) => b.date >= today).length}</div>
            <div className="bh-sum-label">Upcoming</div>
          </div>
        </div>
        <div className="bh-summary-card">
          <span className="bh-sum-icon">✅</span>
          <div>
            <div className="bh-sum-val">{bookings.filter((b) => b.date < today).length}</div>
            <div className="bh-sum-label">Completed</div>
          </div>
        </div>
        <div className="bh-summary-card">
          <span className="bh-sum-icon">💺</span>
          <div>
            <div className="bh-sum-val">{bookings.reduce((acc, b) => acc + (b.seats?.length || 0), 0)}</div>
            <div className="bh-sum-label">Seats Booked</div>
          </div>
        </div>
      </div>

      {/* View Switcher */}
      <div className="bh-view-tabs">
        <button
          className={`bh-view-tab${view === 'bookings' ? ' active' : ''}`}
          onClick={() => setView('bookings')}
        >
          🎟 My Bookings
          <span className="bh-badge">{bookings.length}</span>
        </button>
        <button
          className={`bh-view-tab${view === 'waitlist' ? ' active' : ''}`}
          onClick={() => { setView('waitlist'); if (waitlist === null) fetchWaitlist(); }}
        >
          🔔 Waitlist
          {waitlist !== null && <span className="bh-badge">{waitlist.filter(e => e.status === 'waiting').length}</span>}
        </button>
      </div>

      {/* ── BOOKINGS VIEW ── */}
      {view === 'bookings' && (<>

      {/* Filter Tabs */}
      <div className="bh-filters">
        {['all', 'upcoming', 'past'].map((f) => (
          <button
            key={f}
            className={`bh-filter-btn${filter === f ? ' active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'all' && <span className="bh-badge">{bookings.length}</span>}
            {f === 'upcoming' && <span className="bh-badge">{bookings.filter((b) => b.date >= today).length}</span>}
            {f === 'past' && <span className="bh-badge">{bookings.filter((b) => b.date < today).length}</span>}
          </button>
        ))}
      </div>

      {/* Cancel error banner */}
      {cancelError && (
        <div className="bh-cancel-error" onClick={() => setCancelError('')}>
          ⚠️ {cancelError} <span className="bh-dismiss">✕</span>
        </div>
      )}

      {/* Booking List */}
      {filtered.length === 0 ? (
        <div className="bh-empty">
          <div className="bh-empty-icon">🎫</div>
          <h3>No bookings found</h3>
          <p>{filter === 'upcoming' ? "You don't have any upcoming trips." : filter === 'past' ? "No past trips yet." : "You haven't made any bookings yet."}</p>
          <Link to="/search" className="bh-btn-primary">Search Buses</Link>
        </div>
      ) : (
        <div className="bh-list">
          {filtered.map((b) => {
            const st = getStatus(b);
            return (
              <div key={b._id} className={`bh-card ${b.date < today ? 'bh-card-past' : 'bh-card-upcoming'}`}>
                <div className="bh-card-accent"></div>
                <div className="bh-card-body">
                  {/* Route line */}
                  <div className="bh-route-row">
                    <div className="bh-city">
                      <span className="bh-city-label">FROM</span>
                      <span className="bh-city-name">{b.from}</span>
                      <span className="bh-time">{formatTime(b.departureTime)}</span>
                    </div>
                    <div className="bh-route-line">
                      <span className="bh-route-dot"></span>
                      <span className="bh-route-dashes"></span>
                      <span className="bh-bus-icon">🚌</span>
                      <span className="bh-route-dashes"></span>
                      <span className="bh-route-dot"></span>
                    </div>
                    <div className="bh-city bh-city-right">
                      <span className="bh-city-label">TO</span>
                      <span className="bh-city-name">{b.to}</span>
                      <span className="bh-time">{formatTime(b.arrivalTime)}</span>
                    </div>
                  </div>

                  {/* Meta row */}
                  <div className="bh-meta-row">
                    <div className="bh-meta-item">
                      <span className="bh-meta-icon">📅</span>
                      <span>{formatDate(b.date)}</span>
                    </div>
                    <div className="bh-meta-item">
                      <span className="bh-meta-icon">💺</span>
                      <span>Seat{b.seats?.length !== 1 ? 's' : ''}: <strong>{b.seats?.join(', ') || '—'}</strong></span>
                    </div>
                    {b.busName && (
                      <div className="bh-meta-item">
                        <span className="bh-meta-icon">🚌</span>
                        <span>{b.busName}</span>
                      </div>
                    )}
                    {b.numberPlate && (
                      <div className="bh-meta-item">
                        <span className="bh-meta-icon">🪪</span>
                        <span>{b.numberPlate}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status badge + cancel */}
                <div className="bh-card-right">
                  <span className={`bh-status ${st.cls}`}>{st.label}</span>
                  {b.isChecked && <span className="bh-checked-note">✔ Ticket verified</span>}
                  {b.date >= today && !b.isChecked && (
                    <button
                      className="bh-cancel-btn"
                      onClick={() => handleCancel(b._id)}
                      disabled={cancellingId === b._id}
                      title="Cancel this booking"
                    >
                      {cancellingId === b._id ? 'Cancelling…' : 'Cancel'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* end bookings view */}
      </>)}

      {/* ── WAITLIST VIEW ── */}
      {view === 'waitlist' && (
        <div className="wl-history">
          {wlLoading && (
            <div className="bh-loader"><div className="spinner"></div><p>Loading waitlist…</p></div>
          )}
          {wlError && (
            <div className="bh-cancel-error" onClick={() => setWlError('')}>
              ⚠️ {wlError} <span className="bh-dismiss">✕</span>
            </div>
          )}
          {!wlLoading && waitlist !== null && waitlist.length === 0 && (
            <div className="bh-empty">
              <div className="bh-empty-icon">🔔</div>
              <h3>No waitlist entries</h3>
              <p>You're not in any waitlist. Search for a bus and join the waitlist if it's full.</p>
              <Link to="/search" className="bh-btn-primary">Search Buses</Link>
            </div>
          )}
          {!wlLoading && waitlist !== null && waitlist.length > 0 && (
            <div className="bh-list">
              {waitlist.map((w) => {
                const statusMap = { waiting: { label: '⏳ Waiting', cls: 'status-upcoming' }, notified: { label: '🔔 Seat Available!', cls: 'status-today' }, fulfilled: { label: '✅ Notified', cls: 'status-boarded' }, expired: { label: '⌛ Expired', cls: 'status-completed' } };
                const st = statusMap[w.status] || { label: w.status, cls: '' };
                return (
                  <div key={w._id} className="bh-card bh-card-upcoming wl-card">
                    <div className="bh-card-accent" style={{background: w.status==='waiting'?'#ff9800':w.status==='fulfilled'?'#4caf50':'#9e9e9e'}}></div>
                    <div className="bh-card-body">
                      <div className="bh-route-row">
                        <div className="bh-city">
                          <span className="bh-city-label">FROM</span>
                          <span className="bh-city-name">{w.from}</span>
                        </div>
                        <div className="bh-route-line">
                          <span className="bh-route-dot"></span>
                          <span className="bh-route-dashes"></span>
                          <span className="bh-bus-icon">🚌</span>
                          <span className="bh-route-dashes"></span>
                          <span className="bh-route-dot"></span>
                        </div>
                        <div className="bh-city bh-city-right">
                          <span className="bh-city-label">TO</span>
                          <span className="bh-city-name">{w.to}</span>
                        </div>
                      </div>
                      <div className="bh-meta-row">
                        <div className="bh-meta-item">
                          <span className="bh-meta-icon">📅</span>
                          <span>{formatDate(w.date)}</span>
                        </div>
                        <div className="bh-meta-item">
                          <span className="bh-meta-icon">💺</span>
                          <span>Seats wanted: <strong>{w.seatsWanted}</strong></span>
                        </div>
                        {w.seatsNotified > 0 && (
                          <div className="bh-meta-item">
                            <span className="bh-meta-icon">🔔</span>
                            <span>Notified for <strong>{w.seatsNotified}</strong> of <strong>{w.seatsWanted}</strong> seat{w.seatsWanted > 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="bh-card-right">
                      <span className={`bh-status ${st.cls}`}>{st.label}</span>
                      {(w.status === 'waiting' || w.status === 'notified') && (
                        <button
                          className="bh-cancel-btn"
                          onClick={() => handleLeaveWaitlist(w._id)}
                          title="Leave this waitlist"
                        >
                          Leave Queue
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Cancel confirmation modal */}
      {confirmTarget && (
        <div className="bh-modal-overlay" onClick={() => setConfirmTarget(null)}>
          <div className="bh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bh-modal-icon">🎫</div>
            <h3>Cancel Booking?</h3>
            <p>Are you sure you want to cancel this ticket?<br />This action cannot be undone.</p>
            <div className="bh-modal-actions">
              <button className="bh-modal-no" onClick={() => setConfirmTarget(null)}>Keep Ticket</button>
              <button className="bh-modal-yes" onClick={doCancel}>Yes, Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookingHistory;
