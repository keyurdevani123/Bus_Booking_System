import React, { useState, useEffect } from 'react';
import { busService, cityRouteService } from '../services/api';
import '../styles/Dashboard.css';

//  helpers 
function timeToMin(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minToTime(totalMin) {
  const m = ((totalMin % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
function interpolateTimes(stops, depTime, arrTime) {
  if (!depTime || !arrTime || stops.length < 2) return stops;
  const startMin = timeToMin(depTime);
  let endMin = timeToMin(arrTime);
  if (endMin <= startMin) endMin += 1440;
  const startKm = stops[0].km;
  const endKm = stops[stops.length - 1].km;
  return stops.map((s) => {
    const frac = endKm === startKm ? 0 : (s.km - startKm) / (endKm - startKm);
    const t = minToTime(Math.round(startMin + frac * (endMin - startMin)));
    return { ...s, arrivalTime: t, departureTime: t };
  });
}
// 

function AdminDashboard({ token }) {
  const [buses, setBuses]           = useState([]);
  const [cityRoute, setCityRoute]   = useState([]); // [{city, km}]
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [submitError, setSubmitError] = useState('');

  // Bus details
  const [fields, setFields] = useState({
    busName: '', routeNumber: '', numberPlate: '',
    capacity: '44', noOfAlocatedSeats: '4',
    selectedDays: { weekDays: true, saturday: true, sunday: true },
    images: [],
  });

  // Halt stops between origin and destination
  const [haltStops, setHaltStops] = useState([]); // [{name, durationMinutes}]

  const addHalt    = () => setHaltStops(h => [...h, { name: '', durationMinutes: 0 }]);
  const removeHalt = (i) => setHaltStops(h => h.filter((_, idx) => idx !== i));
  const updateHalt = (i, field, val) =>
    setHaltStops(h => h.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  const totalHaltMin = haltStops.reduce((sum, h) => sum + (Number(h.durationMinutes) || 0), 0);

  // Route selection
  const [fromCity, setFromCity] = useState('');
  const [toCity,   setToCity]   = useState('');
  const [depTime,  setDepTime]  = useState('06:00');
  const [arrTime,  setArrTime]  = useState('');
  const [baseFare, setBaseFare] = useState('');
  const [busType, setBusType]   = useState({ acType: 'AC', seatType: 'Seater' });

  // Computed stops (editable times)
  const [stops, setStops] = useState([]); // [{city, km, departureTime, arrivalTime}]

  //  Load data 
  useEffect(() => {
    fetchBuses();
    cityRouteService.getCityRoute()
      .then(r => setCityRoute(Array.isArray(r.data) ? r.data : []))
      .catch(() => setCityRoute([]));
  }, []);

  const fetchBuses = async () => {
    try {
      const r = await busService.getAllBuses();
      const d = r.data;
      setBuses(Array.isArray(d) ? d : (d.buses || d.data || []));
    } catch { setBuses([]); } finally { setLoading(false); }
  };

  //  Auto-fill stops when from/to change 
  useEffect(() => {
    if (!fromCity || !toCity || !cityRoute.length) return;
    const fromIdx = cityRoute.findIndex(c => c.city === fromCity);
    const toIdx   = cityRoute.findIndex(c => c.city === toCity);
    if (fromIdx === -1 || toIdx === -1 || toIdx <= fromIdx) { setStops([]); return; }
    const slice = cityRoute.slice(fromIdx, toIdx + 1);
    setStops(interpolateTimes(slice, depTime, arrTime));
  }, [fromCity, toCity, cityRoute]);

  //  Re-interpolate when dep/arr time changes 
  useEffect(() => {
    if (stops.length < 2) return;
    setStops(prev => interpolateTimes(prev, depTime, arrTime));
  }, [depTime, arrTime]);

  const handleField = e => setFields(f => ({ ...f, [e.target.name]: e.target.value }));
  const handleDay   = day => setFields(f => ({ ...f, selectedDays: { ...f.selectedDays, [day]: !f.selectedDays[day] }}));

  const updateStopTime = (idx, field, val) => {
    setStops(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));
  };

  const fromOptions = cityRoute;
  const toOptions   = fromCity
    ? cityRoute.filter((c, i) => i > cityRoute.findIndex(x => x.city === fromCity))
    : cityRoute;

  const totalKm   = stops.length >= 2 ? stops[stops.length - 1].km - stops[0].km : 0;
  const farePreview = (stopKm) => {
    if (!baseFare || !totalKm) return '--';
    const diff = stopKm - (stops[0]?.km || 0);
    return 'Rs. ' + Math.max(30, Math.round(Number(baseFare) * diff / totalKm));
  };

  const resetForm = () => {
    setEditingId(null); setShowForm(false); setSubmitError('');
    setFromCity(''); setToCity(''); setDepTime('06:00'); setArrTime(''); setBaseFare('');
    setStops([]); setHaltStops([]); setBusType({ acType: 'AC', seatType: 'Seater' });
    setFields({ busName:'', routeNumber:'', numberPlate:'', numRows:'11', noOfAlocatedSeats:'4',
      selectedDays:{ weekDays:true, saturday:true, sunday:true }, images:[] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (stops.length < 2) { setSubmitError('Select a valid From and To city.'); return; }
    if (!baseFare || Number(baseFare) <= 0) { setSubmitError('Enter a base fare > 0.'); return; }
    try {
      const seatsPerRow = busType.seatType === 'Sleeper' ? 6 : 4;
      const computedCapacity = Number(fields.numRows || 11) * seatsPerRow;
      const payload = new FormData();
      payload.append('busName',          fields.busName);
      payload.append('routeNumber',      fields.routeNumber);
      payload.append('numberPlate',      fields.numberPlate);
      payload.append('capacity',         String(computedCapacity));
      payload.append('noOfAlocatedSeats',fields.noOfAlocatedSeats);
      payload.append('minHalts',         '1');
      payload.append('baseFare',         baseFare);
      payload.append('totalRouteKm',     String(totalKm));
      payload.append('selectedDays',     JSON.stringify(fields.selectedDays));

      payload.append('haltStops', JSON.stringify(
        haltStops.map(h => ({ name: h.name.trim() || 'Halt', durationMinutes: Number(h.durationMinutes) || 0 }))
      ));
      payload.append('busType', JSON.stringify(busType));

      const busFrom = { city: stops[0].city, departureTime: stops[0].departureTime };
      const busTo   = { city: stops[stops.length-1].city, arrivalTime: stops[stops.length-1].arrivalTime };
      payload.append('BusFrom', JSON.stringify(busFrom));
      payload.append('BusTo',   JSON.stringify(busTo));

      const table = stops.map(s => ({
        city: s.city,
        halts: s.km,
        arrivalTime:   s.arrivalTime   || s.departureTime || '00:00',
        departureTime: s.departureTime || s.arrivalTime   || '00:00',
      }));
      payload.append('table', JSON.stringify(table));

      fields.images.forEach(f => payload.append('images', f));

      const authToken = localStorage.getItem('adminToken') || token;
      if (editingId) {
        await busService.updateBus(editingId, payload, authToken);
      } else {
        await busService.createBus(payload, authToken);
      }
      resetForm();
      fetchBuses();
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to save bus.');
      console.error(err);
    }
  };

  const handleEditClick = (bus) => {
    setShowForm(true); setEditingId(bus._id);
    setFields({
      busName: bus.busName || '', routeNumber: bus.routeNumber || '',
      numberPlate: bus.numberPlate || '',
      numRows: String(Math.round((bus.capacity || 44) / ((bus.busType?.seatType === 'Sleeper') ? 6 : 4)) || 11),
      noOfAlocatedSeats: String(bus.noOfAlocatedSeats || 4),
      selectedDays: bus.selectedDays || { weekDays:true, saturday:true, sunday:true },
      images: [],
    });
    setBaseFare(String(bus.baseFare || ''));
    setBusType(bus.busType || { acType: 'AC', seatType: 'Seater' });
    setHaltStops(Array.isArray(bus.haltStops) && bus.haltStops.length
      ? bus.haltStops.map(h => ({ name: h.name || '', durationMinutes: h.durationMinutes || 0 }))
      : []);
    if (bus.route && bus.route.length >= 2) {
      setFromCity(bus.route[0].city);
      setToCity(bus.route[bus.route.length - 1].city);
      setDepTime(bus.route[0].departureTime || '06:00');
      setArrTime(bus.route[bus.route.length - 1].arrivalTime || '');
      setStops(bus.route.map(r => ({
        city: r.city, km: r.halts,
        arrivalTime: r.arrivalTime, departureTime: r.departureTime,
      })));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this bus?')) return;
    try {
      const authToken = localStorage.getItem('adminToken') || token;
      await busService.deleteBus(id, authToken);
      fetchBuses();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="dashboard-container">
      <h2>Admin Dashboard</h2>
      <button className="add-btn" onClick={() => showForm ? resetForm() : setShowForm(true)}>
        {showForm ? 'Cancel' : '+ Add New Bus'}
      </button>

      {showForm && (
        <form className="add-bus-form" onSubmit={handleSubmit} encType="multipart/form-data">
          <h3 style={{ color: '#667eea', marginBottom: 16 }}>{editingId ? 'Edit Bus' : 'Add New Bus'}</h3>
          {submitError && <div className="form-error">{submitError}</div>}

          {/*  Bus Details  */}
          <div className="section-header">Bus Details</div>
          <div className="form-row-grid">
            <div className="fg"><label>Bus Name *</label>
              <input name="busName" value={fields.busName} onChange={handleField} required placeholder="e.g. Gujarat Express" /></div>
            <div className="fg"><label>Route Number *</label>
              <input name="routeNumber" value={fields.routeNumber} onChange={handleField} required placeholder="e.g. GJ-401" /></div>
            <div className="fg"><label>Number Plate *</label>
              <input name="numberPlate" value={fields.numberPlate} onChange={handleField} required placeholder="e.g. GJ-01-AB-1234" /></div>
          </div>
          <div className="form-row-grid">
            <div className="fg">
              <label>Number of Rows *</label>
              <input type="number" name="numRows" value={fields.numRows} onChange={handleField} min="1" max="20" required />
              <span style={{ fontSize: 11, color: '#888', marginTop: 3 }}>
                = {Number(fields.numRows || 0) * (busType.seatType === 'Sleeper' ? 6 : 4)} total {busType.seatType === 'Sleeper' ? 'berths' : 'seats'}
                &nbsp;({busType.seatType === 'Sleeper' ? '1L+2R per side × 2 decks' : '4 seats per row'})
              </span>
            </div>
            <div className="fg"><label>Driver/Reserved (non-bookable)</label>
              <input type="number" name="noOfAlocatedSeats" value={fields.noOfAlocatedSeats} onChange={handleField} min="0" required /></div>
          </div>
          <div className="form-row-grid">
            <div className="fg"><label>AC Type</label>
              <select value={busType.acType} onChange={e => setBusType(b => ({ ...b, acType: e.target.value }))}>
                <option value="AC">AC</option>
                <option value="Non-AC">Non-AC</option>
              </select></div>
            <div className="fg">
              <label>
                Seat Type
                {editingId && <span style={{ fontSize: 11, color: '#e67e22', fontWeight: 400, marginLeft: 6 }}>🔒 locked after creation</span>}
              </label>
              <select
                value={busType.seatType}
                onChange={e => setBusType(b => ({ ...b, seatType: e.target.value }))}
                disabled={!!editingId}
                style={editingId ? { background: '#f0f0f0', color: '#999', cursor: 'not-allowed' } : {}}
              >
                <option value="Seater">Seater</option>
                <option value="Sleeper">Sleeper</option>
              </select>
            </div>
          </div>

          <div className="section-header">Operating Days</div>
          <div className="days-row">
            <label><input type="checkbox" checked={fields.selectedDays.weekDays} onChange={() => handleDay('weekDays')} /> Mon-Fri</label>
            <label><input type="checkbox" checked={fields.selectedDays.saturday} onChange={() => handleDay('saturday')} /> Saturday</label>
            <label><input type="checkbox" checked={fields.selectedDays.sunday} onChange={() => handleDay('sunday')} /> Sunday</label>
          </div>

          {/*  Route & Fare  */}
          <div className="section-header">Route & Fare</div>
          <div className="form-row-grid">
            <div className="fg"><label>From City *</label>
              <select value={fromCity} onChange={e => { setFromCity(e.target.value); setToCity(''); }} required>
                <option value="">-- Origin --</option>
                {fromOptions.map(c => <option key={c.city} value={c.city}>{c.city}</option>)}
              </select></div>
            <div className="fg"><label>To City *</label>
              <select value={toCity} onChange={e => setToCity(e.target.value)} required>
                <option value="">-- Destination --</option>
                {toOptions.map(c => <option key={c.city} value={c.city}>{c.city}</option>)}
              </select></div>
          </div>
          <div className="form-row-grid">
            <div className="fg"><label>Departure Time (from origin) *</label>
              <input type="time" value={depTime} onChange={e => setDepTime(e.target.value)} required /></div>
            <div className="fg"><label>Arrival Time (at destination) *</label>
              <input type="time" value={arrTime} onChange={e => setArrTime(e.target.value)} required /></div>
            <div className="fg"><label>Base Fare for full route (Rs.) *</label>
              <input type="number" min="1" value={baseFare} onChange={e => setBaseFare(e.target.value)} required placeholder="e.g. 650" /></div>
          </div>

          {stops.length >= 2 && (
            <>
              <div className="fare-preview">
                {stops[0].city} to {stops[stops.length-1].city} &nbsp;|&nbsp;
                {stops.length - 2} intermediate stop{stops.length - 2 !== 1 ? 's' : ''} &nbsp;|&nbsp;
                Distance: {totalKm} km &nbsp;|&nbsp;
                Full fare: <strong>Rs. {baseFare || '--'}</strong>
              </div>
              <div className="stops-preview-table">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>City</th>
                      <th>Km from origin</th>
                      <th>Arrival</th>
                      <th>Departure</th>
                      <th>Fare from origin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stops.map((s, i) => (
                      <tr key={s.city} style={{ background: i === 0 || i === stops.length-1 ? '#f0f4ff' : 'white' }}>
                        <td>{i + 1}</td>
                        <td><strong>{s.city}</strong></td>
                        <td>{s.km - stops[0].km} km</td>
                        <td>
                          {i === 0 ? '--' : (
                            <input type="time" value={s.arrivalTime}
                              onChange={e => updateStopTime(i, 'arrivalTime', e.target.value)}
                              style={{ border:'1px solid #dde', borderRadius:4, padding:'2px 6px', fontSize:13 }} />
                          )}
                        </td>
                        <td>
                          {i === stops.length - 1 ? '--' : (
                            <input type="time" value={s.departureTime}
                              onChange={e => updateStopTime(i, 'departureTime', e.target.value)}
                              style={{ border:'1px solid #dde', borderRadius:4, padding:'2px 6px', fontSize:13 }} />
                          )}
                        </td>
                        <td style={{ color: '#27ae60', fontWeight: 600 }}>
                          {i === 0 ? 'Rs. 0' : farePreview(s.km)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/*  Halt Stops  */}
          <div className="section-header" style={{ marginTop: 18 }}>
            Intermediate Halt Stops&nbsp;
            <span style={{ fontSize: 12, fontWeight: 400, color: '#888' }}>
              (rest stops, hotels etc. — not boarding points)
            </span>
          </div>
          {haltStops.length > 0 && (
            <div className="halt-stops-list">
              {haltStops.map((h, i) => (
                <div key={i} className="halt-stop-row">
                  <span className="halt-num">{i + 1}</span>
                  <input
                    className="halt-name-input"
                    placeholder="Stop name (e.g. Hotel Surya, Rest Area)"
                    value={h.name}
                    onChange={e => updateHalt(i, 'name', e.target.value)}
                  />
                  <label className="halt-dur-label">Duration</label>
                  <input
                    type="number"
                    className="halt-dur-input"
                    min="0"
                    max="240"
                    value={h.durationMinutes}
                    onChange={e => updateHalt(i, 'durationMinutes', e.target.value)}
                  />
                  <span className="halt-min-label">min</span>
                  <button type="button" className="halt-remove-btn" onClick={() => removeHalt(i)}>✕</button>
                </div>
              ))}
              {totalHaltMin > 0 && (
                <div className="halt-total">
                  Total halt time: <strong>{totalHaltMin} min</strong>
                  {totalHaltMin >= 60 && <span> ({Math.floor(totalHaltMin/60)}h {totalHaltMin%60}m)</span>}
                </div>
              )}
            </div>
          )}
          <button type="button" className="halt-add-btn" onClick={addHalt}>
            + Add Halt Stop
          </button>

          <div className="fg" style={{ marginTop: 14 }}>
            <label>Bus Image (optional)</label>
            <input type="file" multiple accept="image/*" onChange={e => setFields(f => ({ ...f, images: Array.from(e.target.files) }))} />
          </div>

          <button type="submit" className="submit-bus-btn">{editingId ? 'Update Bus' : 'Add Bus'}</button>
        </form>
      )}

      <div className="buses-table">
        <h3>All Buses ({buses.length})</h3>
        {loading ? <p>Loading...</p> : (
          <table>
            <thead>
              <tr><th>Bus Name</th><th>Route</th><th>From - To</th><th>Seats</th><th>Fare</th><th>Plate</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {buses.length > 0 ? buses.map(bus => (
                <tr key={bus._id}>
                  <td>{bus.busName}</td>
                  <td>{bus.routeNumber}</td>
                  <td>{bus.busFrom?.city} - {bus.busTo?.city}</td>
                  <td>{bus.capacity}</td>
                  <td>{bus.baseFare ? `Rs. ${bus.baseFare}` : '--'}</td>
                  <td>{bus.numberPlate}</td>
                  <td>
                    <button className="edit-btn" onClick={() => handleEditClick(bus)}>Edit</button>
                    <button className="del-btn" onClick={() => handleDelete(bus._id)}>Delete</button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="7" style={{ textAlign:'center', color:'#888' }}>No buses found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;