import React, { useState, useEffect } from 'react';
import { bookingService } from '../services/api';
import '../styles/Dashboard.css';

function CheckerDashboard({ token }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchBookings();
  }, [token]);

  const fetchBookings = async () => {
    try {
      const response = await bookingService.getBookings(token);
      // Ensure bookings is always an array
      if (Array.isArray(response.data)) {
        setBookings(response.data);
      } else if (response.data && typeof response.data === 'object') {
        // If response is an object, try to extract array from it
        const bookingsArray = response.data.bookings || response.data.data || [];
        setBookings(Array.isArray(bookingsArray) ? bookingsArray : []);
      } else {
        setBookings([]);
      }
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (bookingId, status) => {
    try {
      await bookingService.updateBookingStatus(bookingId, status, token);
      fetchBookings();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const filteredBookings = Array.isArray(bookings) 
    ? bookings.filter(booking => {
        if (filter === 'checked') return booking.isChecked;
        if (filter === 'unchecked') return !booking.isChecked;
        return true;
      })
    : [];

  return (
    <div className="dashboard-container">
      <h2>Checker Dashboard</h2>
      
      <div className="filter-buttons">
        <button onClick={() => setFilter('all')} className={filter === 'all' ? 'active' : ''}>
          All Bookings
        </button>
        <button onClick={() => setFilter('checked')} className={filter === 'checked' ? 'active' : ''}>
          Checked
        </button>
        <button onClick={() => setFilter('unchecked')} className={filter === 'unchecked' ? 'active' : ''}>
          Not Checked
        </button>
      </div>

      <div className="bookings-table">
        <h3>Bookings ({filteredBookings.length})</h3>
        {loading ? <p>Loading...</p> : (
          <table>
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Customer</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Seats</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(filteredBookings) && filteredBookings.length > 0 ? (
                filteredBookings.map((booking) => (
                  <tr key={booking._id}>
                    <td>{booking.randomNumber}</td>
                    <td>{booking.id}</td>
                    <td>{booking.email}</td>
                    <td>{booking.phone}</td>
                    <td>{booking.seats.join(', ')}</td>
                    <td>{booking.date}</td>
                    <td className={booking.isChecked ? 'checked' : 'unchecked'}>
                      {booking.isChecked ? '✓ Checked' : 'Pending'}
                    </td>
                    <td>
                      {!booking.isChecked && (
                        <button onClick={() => handleStatusUpdate(booking._id, true)}>
                          Mark as Checked
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center' }}>No bookings found</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default CheckerDashboard;
