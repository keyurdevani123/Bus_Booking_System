import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { busService, cityService } from '../services/api';
import CitySearchInput from '../components/CitySearchInput';
import '../styles/BusSearch.css';

// ── helpers ─────────────────────────────────────────────────
const SS_KEY       = 'busSearchState';
const LS_CACHE_KEY = 'busSearchCache';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const readSS = (key, fallback) => {
  try { return JSON.parse(sessionStorage.getItem(SS_KEY) || '{}')[key] ?? fallback; }
  catch { return fallback; }
};
// Read the search cache synchronously (used in lazy useState initializers)
const readSearchCache = () => {
  try {
    const c = JSON.parse(localStorage.getItem(LS_CACHE_KEY) || 'null');
    if (c && Array.isArray(c.buses) && c.buses.length > 0 &&
        Date.now() - c.fetchedAt < CACHE_TTL_MS) return c;
  } catch {}
  return null;
};

function BusSearch() {
  const today = new Date().toISOString().split('T')[0];
  // Restore previous search instantly from localStorage (no API wait needed)
  const [from,  setFrom]  = useState(() => { const c = readSearchCache(); return c?.from || readSS('from', ''); });
  const [to,    setTo]    = useState(() => { const c = readSearchCache(); return c?.to   || readSS('to',   ''); });
  const [date,  setDate]  = useState(() => { const c = readSearchCache(); return c?.date || today; });
  const [buses, setBuses] = useState(() => { const c = readSearchCache(); return c?.buses || []; });
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const navigate = useNavigate();

  // Persist only from/to city selections
  useEffect(() => {
    try { sessionStorage.setItem(SS_KEY, JSON.stringify({ from, to })); } catch {}
  }, [from, to]);

  // Fetch cities on mount; also clear any sessionStorage value that no longer matches
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await cityService.getAllCities();
        const list = Array.isArray(response.data) ? response.data : [];
        setCities(list);

        // Validate current from/to against the city list (they may have been restored
        // from the localStorage cache, so sessionStorage may not have them yet).
        // Use current state values as the source of truth; clear only if the city
        // genuinely doesn't exist in the list.
        const resolvedFrom = from && list.includes(from) ? from : '';
        const resolvedTo   = to   && list.includes(to)   ? to   : '';
        if (resolvedFrom !== from) setFrom(resolvedFrom);
        if (resolvedTo   !== to)   setTo(resolvedTo);
        // Keep sessionStorage in sync so the persist effect doesn't lag
        try { sessionStorage.setItem(SS_KEY, JSON.stringify({ from: resolvedFrom, to: resolvedTo })); } catch {}

        // Auto-search if redirected from Home page
        const triggerRaw = sessionStorage.getItem('busSearchTrigger');
        if (triggerRaw && resolvedFrom && resolvedTo && resolvedFrom !== resolvedTo) {
          sessionStorage.removeItem('busSearchTrigger');
          try {
            const trigger = JSON.parse(triggerRaw);
            const searchDate = trigger.date || new Date().toISOString().split('T')[0];
            setDate(searchDate);
            await performSearch(resolvedFrom, resolvedTo, searchDate);
          } catch {}
        }
        // (cache already restored synchronously in useState initializers)
      } catch (err) {
        console.log('Cities load failed');
        setCities([]);
      }
    };
    fetchCities();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const performSearch = async (f, t, d) => {
    setLoading(true);
    setError('');
    setBuses([]);
    try {
      const isToday = new Date(d).toDateString() === new Date().toDateString();
      const response = await busService.searchBuses(f, t, d, isToday);
      const data = response.data;
      if (response.status === 204 || !data || (Array.isArray(data) && data.length === 0)) {
        setError('No buses found for this route. Try another date or route.');
      } else if (Array.isArray(data)) {
        setBuses(data);
        // Cache results for back/refresh
        try {
          localStorage.setItem(LS_CACHE_KEY, JSON.stringify({
            buses: data,
            from: f,
            to: t,
            date: d,
            fetchedAt: Date.now(),
          }));
        } catch {}
      } else {
        setError('No buses found for this route. Try another date or route.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'No buses found for this route.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!from) { setFormError('Please select a departure city.'); return; }
    if (!to)   { setFormError('Please select a destination city.'); return; }
    if (from === to) { setFormError('Departure and destination cities must be different.'); return; }
    await performSearch(from, to, date);
  };

  // Returns full route slice from origin to destination inclusive (with km via halts)
  const getRouteBetween = (bus, fromCity, toCity) => {
    if (!bus.route || !Array.isArray(bus.route)) return [];
    const fromIdx = bus.route.findIndex(s => s.city === fromCity);
    const toIdx   = bus.route.findIndex(s => s.city === toCity);
    if (fromIdx === -1 || toIdx === -1 || toIdx <= fromIdx) return [];
    return bus.route.slice(fromIdx, toIdx + 1);
  };

  return (
    <div className="search-container">
      <div className="search-form">
        <h2>Search Buses</h2>
        {formError && <div className="form-error-msg">{formError}</div>}
        <form onSubmit={handleSearch}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city-from">From</label>
              <CitySearchInput
                id="city-from"
                value={from}
                onChange={(city) => { setFrom(city); setFormError(''); }}
                cities={cities}
                placeholder="Departure city"
              />
            </div>
            <button
              type="button"
              className="form-swap"
              title="Swap cities"
              onClick={() => { setFrom(to); setTo(from); setFormError(''); }}
            >⇄</button>
            <div className="form-group">
              <label htmlFor="city-to">To</label>
              <CitySearchInput
                id="city-to"
                value={to}
                onChange={(city) => { setTo(city); setFormError(''); }}
                cities={cities}
                placeholder="Destination city"
              />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={today}
                required
              />
            </div>
            <button type="submit" className="search-btn" disabled={loading}>
              {loading ? 'Searching...' : 'Search Buses'}
            </button>
          </div>
        </form>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="buses-list">
        {buses.length > 0 && (
          <div className="results-header">
            <h3>{buses.length} Bus{buses.length > 1 ? 'es' : ''} Found</h3>
            <span className="route-label">{from} → {to} | {date}</span>
          </div>
        )}
        {buses.map((bus) => (
          <div key={bus._id} className="bus-card">
            <div className="bus-card-left">
              <div className="bus-name">{bus.busName}</div>
              <div className="bus-number">Route: {bus.routeNumber} | {bus.numberPlate}</div>
              <div className="bus-type">
                <span className={`type-badge ${bus.busType?.acType === 'Non-AC' ? 'badge-nonac' : 'badge-ac'}`}>{bus.busType?.acType || 'AC'}</span>
                <span className={`type-badge ${bus.busType?.seatType === 'Sleeper' ? 'badge-sleeper' : 'badge-seater'}`}>{bus.busType?.seatType || 'Seater'}</span>
              </div>
            </div>
            <div className="bus-card-mid">
              <div className="timing-block">
                <div className="time">{bus.searchedDepartureTime}</div>
                <div className="city-name">{from}</div>
              </div>
              <div className="route-stops-block">
                {(() => {
                  const routeSlice = getRouteBetween(bus, from, to);
                  if (!routeSlice.length) return <div className="route-meta">Direct</div>;
                  const originKm = Number(routeSlice[0].halts) || 0;
                  const lastKm   = Number(routeSlice[routeSlice.length - 1].halts) || 0;
                  const totalKm  = Math.max(1, lastKm - originKm);
                  const viaStops = routeSlice.slice(1, -1);
                  return (
                    <>
                      <div className="route-line">
                        <span className="route-dot origin"></span>
                        {routeSlice.slice(1).map((stop, idx) => {
                          const prevKm  = Number(routeSlice[idx].halts) || 0;
                          const curKm   = Number(stop.halts) || prevKm;
                          const diff    = curKm - prevKm;
                          const segFlex = isFinite(diff / totalKm) ? Math.max(0.3, diff / totalKm) : 1;
                          const isLast  = idx === routeSlice.length - 2;
                          return (
                            <React.Fragment key={idx}>
                              <span className="route-segment" style={{ flex: segFlex }}></span>
                              {isLast ? (
                                <span className="route-dot dest"></span>
                              ) : (
                                <span className="route-dot via">
                                  <span className="via-tooltip">
                                    <span className="via-tooltip-city">{stop.city}</span>
                                    {stop.departureTime && (
                                      <span className="via-tooltip-time">{stop.departureTime}</span>
                                    )}
                                  </span>
                                </span>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                      {viaStops.length > 0 && viaStops.length <= 4 && (
                        <div className="route-stops-labels">
                          <span className="stop-city-label edge">{from}</span>
                          {viaStops.map((stop, idx) => (
                            <span key={idx} className="stop-city-label">{stop.city}</span>
                          ))}
                          <span className="stop-city-label edge dest">{to}</span>
                        </div>
                      )}
                      <div className="route-meta">
                        {viaStops.length === 0 ? 'Direct' : `${viaStops.length} Stop${viaStops.length > 1 ? 's' : ''}`}
                      </div>
                      {bus.haltStops && bus.haltStops.length > 0 && (
                        <div className="halt-badge">
                          🏨 {bus.haltStops.length} Halt{bus.haltStops.length > 1 ? 's' : ''}
                          <div className="halt-badge-tooltip">
                            <div className="halt-badge-title">Halt Stops</div>
                            {bus.haltStops.map((h, i) => (
                              <div key={i} className="halt-badge-row">
                                <span className="halt-badge-name">{h.name}</span>
                                <span className="halt-badge-dur">{h.durationMinutes} min</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="timing-block">
                <div className="time">{bus.searchedArrivalTime}</div>
                <div className="city-name">{to}</div>
              </div>
            </div>
            <div className="bus-card-right">
              <div className="price">₹{bus.thisBusPrice || bus.actualPrice || '—'}</div>
              <div className="seats-available">
                {bus.totalAvailableSeats > 0
                  ? <span className="available">{bus.totalAvailableSeats} Seats Available</span>
                  : <span className="full">Fully Booked</span>}
              </div>
              <button
                className={`book-btn${bus.totalAvailableSeats === 0 ? ' book-btn-waitlist' : ''}`}
                onClick={() => {
                  try { sessionStorage.setItem('bookingBus', JSON.stringify({ bus, date, from, to })); } catch {}
                  navigate(
                    `/booking/${bus._id}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}`,
                    { state: { bus, date, from, to } }
                  );
                }}
              >
                {bus.totalAvailableSeats === 0 ? '🔔 Join Waitlist' : 'View Seats'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BusSearch;
