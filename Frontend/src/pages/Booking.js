import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { bookingService, busService } from '../services/api';
import '../styles/Booking.css';

const API_URL = process.env.REACT_APP_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');

function Booking() {
  const { busId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Restore search context: priority = router state → sessionStorage → URL query params
  const searchParams = new URLSearchParams(location.search);
  const getSaved = () => { try { return JSON.parse(sessionStorage.getItem('bookingBus') || 'null'); } catch { return null; } };
  const passed = location.state || getSaved() || {};

  const [bus, setBus] = useState(passed.bus || null);
  const [searchDate] = useState(passed.date || searchParams.get('date') || new Date().toISOString().split('T')[0]);
  const [fromCity] = useState(passed.from || searchParams.get('from') || '');
  const [toCity] = useState(passed.to || searchParams.get('to') || '');
  // Derive fallback cities from the bus itself if not passed via router state
  const effectiveFrom = fromCity || (bus?.busFrom?.city || bus?.route?.[0]?.city || '');
  const effectiveTo   = toCity   || (bus?.busTo?.city   || bus?.route?.[bus?.route?.length - 1]?.city || '');

  const [selectedSeats, setSelectedSeats] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!bus) {
      busService.getBusById(busId)
        .then((res) => setBus(res.data))
        .catch((err) => console.error('Failed to load bus:', err));
    }
  }, [bus, busId]);

  const getSeatStatus = (seat) => {
    if (!seat.isBookable) return 'not-bookable';

    // Primary: use availabilityBoolean pre-computed by the search endpoint (most accurate)
    if (seat.availabilityBoolean !== undefined && seat.availabilityBoolean !== 0) {
      if (seat.availabilityBoolean === 3) return 'available';
      if (seat.availabilityBoolean === 1) return 'booked';
      if (seat.availabilityBoolean === 2) return 'processing';
    }

    // Fallback: bus loaded fresh via getBusById — check availability array directly
    const dateEntry = (seat.availability || []).find((a) => a.date === searchDate);
    if (!dateEntry) return 'available';
    const booked = dateEntry.booked || [];

    if (effectiveFrom && effectiveTo) {
      const fromIdx = booked.findIndex((b) => b.city === effectiveFrom);
      if (fromIdx === -1) return 'available';
      for (let i = fromIdx; i < booked.length; i++) {
        if (booked[i].city === effectiveTo) break;
        const take = booked[i].take || {};
        if (take.in === 1 || take.out === 1) return 'booked';
        if (take.in === 2 || take.out === 2) return 'processing';
      }
      return 'available';
    }

    // Last resort: flag any booked/processing entry on this date
    for (const entry of booked) {
      const take = entry.take || {};
      if (take.in === 1 || take.out === 1) return 'booked';
      if (take.in === 2 || take.out === 2) return 'processing';
    }
    return 'available';
  };

  const handleSeatClick = (seatNum, status) => {
    if (status !== 'available') return;
    setSelectedSeats((prev) =>
      prev.includes(seatNum) ? prev.filter((s) => s !== seatNum) : [...prev, seatNum]
    );
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedSeats.length === 0) {
      setError('Please select at least one seat.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (!bus) throw new Error('Bus data not loaded.');
      if (!effectiveFrom || !effectiveTo) throw new Error('Route information missing. Go back and search again.');
      const departureTime = bus.searchedDepartureTime || bus.busFrom?.departureTime;
      const arrivalTime = bus.searchedArrivalTime || bus.busTo?.arrivalTime;
      const bookingData = {
        id: formData.name || 'guest',
        email: formData.email,
        phone: Number(formData.phone),
        date: searchDate,
        seats: selectedSeats.join(','),
        busId,
        departureTime,
        arrivalTime,
        arrivalDate: searchDate,
        numberPlate: bus.numberPlate,
        routeNumber: bus.routeNumber,
        from: effectiveFrom,
        to: effectiveTo,
        busName: bus.busName,
        duration: 0,
        busFrom: JSON.stringify(bus.busFrom || {}),
        busTo: JSON.stringify(bus.busTo || {}),
        price: bus.thisBusPrice || bus.actualPrice || 0,
        busDepartureTime: bus.busFrom?.departureTime || departureTime,
      };
      const res = await bookingService.createBooking(bookingData);
      const url = res.data?.url;
      if (url) {
        window.location.href = url;
      } else {
        setSuccess('Booking confirmed! Check your email for the ticket.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const allSeats = (bus?.seats || []).sort((a, b) => a.seatNumber - b.seatNumber);
  const isSleeper = bus?.busType?.seatType === 'Sleeper';

  // Seater: rows of 4 (2L + 2R)
  const seaterRows = [];
  if (!isSleeper) {
    for (let i = 0; i < allSeats.length; i += 4) seaterRows.push(allSeats.slice(i, i + 4));
  }

  // Sleeper: 2+1 configuration per deck × 2 decks
  // Group of 6: [LeftLower, RightLower1, RightLower2, LeftUpper, RightUpper1, RightUpper2]
  const sleeperRows = [];
  if (isSleeper) {
    for (let i = 0; i < allSeats.length; i += 6) sleeperRows.push(allSeats.slice(i, i + 6));
  }

  const price = bus?.thisBusPrice || bus?.actualPrice || 0;
  const totalPrice = selectedSeats.length * price;

  return (
    <div className="booking-container">
      <div className="booking-header">
        <button className="back-btn" onClick={() => navigate(-1)}>Back</button>
        {bus?.imagesURLs?.[0] && (
          <img
            src={`${API_URL}/bus/busses/${bus.imagesURLs[0]}`}
            alt={bus.busName}
            className="header-bus-img"
          />
        )}
        <div className="booking-route">
          <h2>{bus?.busName || 'Bus'}</h2>
          <span className="route-info">{effectiveFrom} to {effectiveTo} | {searchDate}</span>
        </div>
        <div className="header-price">
          <span className="price-tag">&#8377;{price} / seat</span>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="booking-body">
        <div className="seat-layout-panel">
          <h3>Select Seats</h3>
          <div className="seat-legend">
            <span><span className="legend-box lb-available"></span>Available</span>
            <span><span className="legend-box lb-booked"></span>Booked</span>
            <span><span className="legend-box lb-processing"></span>Processing</span>
            <span><span className="legend-box lb-selected"></span>Selected</span>
            <span><span className="legend-box lb-na"></span>Reserved</span>
          </div>

          <div className="bus-shape">
            {/* Front row: Door left, Driver right */}
            <div className="bus-front-row">
              <div className="bus-door-box">
                <span>&#x1F6AA;</span>
                <span className="front-label">Door</span>
              </div>
              <div className="driver-box">
                <span>&#x1F9D1;&#x200D;&#x1F692;</span>
                <span className="front-label">Driver</span>
              </div>
            </div>

            {/* ─── SEATER LAYOUT ─── */}
            {!isSleeper && (
              <div className="seats-area">
                {seaterRows.map((row, rowIdx) => (
                  <div key={rowIdx} className="seat-row">
                    <div className="seats-left">
                      {row.slice(0, 2).map((seat) => {
                        const status = getSeatStatus(seat);
                        const isSelected = selectedSeats.includes(seat.seatNumber);
                        return (
                          <div key={seat.seatNumber}
                            className={`seat-cell ${isSelected ? 'sel' : status}`}
                            onClick={() => handleSeatClick(seat.seatNumber, status)}
                            title={seat.isBookable ? `Seat ${seat.seatNumber}` : `Seat ${seat.seatNumber} – Reserved`}>
                            <div className="seat-back"></div>
                            {!seat.isBookable
                              ? <span className="seat-reserved-icon">🔒</span>
                              : <div className="seat-label">{seat.seatNumber}</div>}
                          </div>
                        );
                      })}
                    </div>
                    <div className="aisle-gap"></div>
                    <div className="seats-right">
                      {row.slice(2, 4).map((seat) => {
                        const status = getSeatStatus(seat);
                        const isSelected = selectedSeats.includes(seat.seatNumber);
                        return (
                          <div key={seat.seatNumber}
                            className={`seat-cell ${isSelected ? 'sel' : status}`}
                            onClick={() => handleSeatClick(seat.seatNumber, status)}
                            title={seat.isBookable ? `Seat ${seat.seatNumber}` : `Seat ${seat.seatNumber} – Reserved`}>
                            <div className="seat-back"></div>
                            {!seat.isBookable
                              ? <span className="seat-reserved-icon">🔒</span>
                              : <div className="seat-label">{seat.seatNumber}</div>}
                          </div>
                        );
                      })}
                    </div>
                    <div className="row-num">{rowIdx + 1}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ─── SLEEPER LAYOUT: Lower + Upper deck panels (2+1 per deck) ─── */}
            {isSleeper && (
              <div className="sleeper-bus-wrap">

                {/* ── LOWER DECK ── */}
                <div className="sl-deck-panel">
                  <div className="sl-deck-title sl-lower-title">Lower Berth</div>
                  <div className="sl-deck-rows">
                    {sleeperRows.map((row, rowIdx) => {
                      const ll  = row[0]; // Left Lower
                      const rl1 = row[1]; // Right Lower 1
                      const rl2 = row[2]; // Right Lower 2
                      return (
                        <div key={rowIdx} className="sl-deck-row">
                          <div className="sl-row-label">{rowIdx + 1}</div>
                          {/* Left lower berth */}
                          {ll && (() => {
                            const status = getSeatStatus(ll);
                            const isSel  = selectedSeats.includes(ll.seatNumber);
                            return (
                              <div className={`sl-plank sl-plank-left ${isSel ? 'sel' : status}`}
                                onClick={() => handleSeatClick(ll.seatNumber, status)}
                                title={ll.isBookable ? `Berth ${ll.seatNumber} – Left Lower` : `Berth ${ll.seatNumber} – Reserved`}>
                                <span className="sl-plank-tag">LL</span>
                                {!ll.isBookable ? <span className="sl-lock">🔒</span> : <span className="sl-plank-num">{ll.seatNumber}</span>}
                              </div>
                            );
                          })()}
                          <div className="sl-plank-aisle"></div>
                          {/* Right lower – 2 berths side by side */}
                          <div className="sl-right-pair-h">
                            {[rl1, rl2].map((seat, si) => seat && (() => {
                              const status = getSeatStatus(seat);
                              const isSel  = selectedSeats.includes(seat.seatNumber);
                              return (
                                <div key={si} className={`sl-plank sl-plank-half ${isSel ? 'sel' : status}`}
                                  onClick={() => handleSeatClick(seat.seatNumber, status)}
                                  title={seat.isBookable ? `Berth ${seat.seatNumber} – Right Lower` : `Berth ${seat.seatNumber} – Reserved`}>
                                  <span className="sl-plank-tag">RL</span>
                                  {!seat.isBookable ? <span className="sl-lock">🔒</span> : <span className="sl-plank-num">{seat.seatNumber}</span>}
                                </div>
                              );
                            })())}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── UPPER DECK ── */}
                <div className="sl-deck-panel">
                  <div className="sl-deck-title sl-upper-title">Upper Berth</div>
                  <div className="sl-deck-rows">
                    {sleeperRows.map((row, rowIdx) => {
                      const lu  = row[3]; // Left Upper
                      const ru1 = row[4]; // Right Upper 1
                      const ru2 = row[5]; // Right Upper 2
                      return (
                        <div key={rowIdx} className="sl-deck-row">
                          <div className="sl-row-label">{rowIdx + 1}</div>
                          {/* Left upper berth – bookable */}
                          {lu && (() => {
                            const status = getSeatStatus(lu);
                            const isSel  = selectedSeats.includes(lu.seatNumber);
                            return (
                              <div className={`sl-plank sl-plank-left ${isSel ? 'sel' : status}`}
                                onClick={() => handleSeatClick(lu.seatNumber, status)}
                                title={lu.isBookable ? `Berth ${lu.seatNumber} – Left Upper` : `Berth ${lu.seatNumber} – Reserved`}>
                                <span className="sl-plank-tag">LU</span>
                                {!lu.isBookable ? <span className="sl-lock">🔒</span> : <span className="sl-plank-num">{lu.seatNumber}</span>}
                              </div>
                            );
                          })()}
                          <div className="sl-plank-aisle"></div>
                          {/* Right upper – 2 berths side by side */}
                          <div className="sl-right-pair-h">
                            {[ru1, ru2].map((seat, si) => seat && (() => {
                              const status = getSeatStatus(seat);
                              const isSel  = selectedSeats.includes(seat.seatNumber);
                              return (
                                <div key={si} className={`sl-plank sl-plank-half ${isSel ? 'sel' : status}`}
                                  onClick={() => handleSeatClick(seat.seatNumber, status)}
                                  title={seat.isBookable ? `Berth ${seat.seatNumber} – Right Upper` : `Berth ${seat.seatNumber} – Reserved`}>
                                  <span className="sl-plank-tag">RU</span>
                                  {!seat.isBookable ? <span className="sl-lock">🔒</span> : <span className="sl-plank-num">{seat.seatNumber}</span>}
                                </div>
                              );
                            })())}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}
          </div>

          <div className="selected-summary">
            <strong>Selected Seats:</strong>{' '}
            {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None'}
            {selectedSeats.length > 0 && (
              <span className="total-price"> | Total: &#8377;{totalPrice} ({selectedSeats.length} x &#8377;{price})</span>
            )}
          </div>
        </div>

        <div className="passenger-form-panel">
          <h3>Passenger Details</h3>
          <form onSubmit={handleSubmit} className="passenger-form">
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" name="name" placeholder="Enter your name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" name="email" placeholder="Enter your email" value={formData.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Mobile Number</label>
              <input type="tel" name="phone" placeholder="10-digit mobile number" value={formData.phone} onChange={handleChange} required />
            </div>

            <div className="trip-summary">
              <div className="summary-row"><span>From</span><strong>{effectiveFrom}</strong></div>
              <div className="summary-row"><span>To</span><strong>{effectiveTo}</strong></div>
              <div className="summary-row"><span>Date</span><strong>{searchDate}</strong></div>
              <div className="summary-row"><span>Departure</span><strong>{bus?.searchedDepartureTime || '--'}</strong></div>
              <div className="summary-row"><span>Arrival</span><strong>{bus?.searchedArrivalTime || '--'}</strong></div>
              <div className="summary-row"><span>Seats</span><strong>{selectedSeats.length > 0 ? selectedSeats.join(', ') : '--'}</strong></div>
              <div className="summary-row total-row"><span>Total Fare</span><strong>&#8377;{totalPrice}</strong></div>
            </div>

            <button type="submit" className="pay-btn" disabled={loading || selectedSeats.length === 0}>
              {loading ? 'Processing...' : 'Pay ₹' + totalPrice}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Booking;