import axios from 'axios';

// When served from the same server (any IP/domain), use the current origin automatically
const API_URL = process.env.REACT_APP_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3200');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth Services
export const authService = {
  adminLogin: (username, password) => 
    api.post('/auth/admin', { username, password }),
  adminSignup: (username, email, password, role) =>
    api.post('/admins', { username, email, password, role }),
  userSignup: (name, email, password, phone) =>
    api.post('/users', { name, email, password, phone }),
  userLogin: (email, password) =>
    api.post('/auth/user', { email, password }),
  forgotPassword: (email, type) =>
    api.post('/auth/forgot-password', { email, type }),
  resetPassword: (token, type, password) =>
    api.post('/auth/reset-password', { token, type, password }),
};

// Bus Services
export const busService = {
  getAllBuses: () => api.get('/bus'),
  searchBuses: (from, to, date, isToday = false) =>
    api.post('/search', { from, to, date, isToday }),
  getBusById: (id) => api.get(`/bus/${id}`),
  createBus: (formData, token) =>
    api.post('/bus', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }),
  updateBus: (id, formData, token) =>
    api.put(`/bus/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }),
  deleteBus: (id, token) =>
    api.delete(`/bus/${id}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    }),
};

// Booking Services
export const bookingService = {
  confirmBooking: (tempBookId) =>
    api.post(`/booking/confirm/${tempBookId}`),
  getUserBookingHistory: (email, userId, phone) => {
    const params = new URLSearchParams();
    if (email)  params.append('email',  email);
    if (userId) params.append('userId', userId);
    if (phone)  params.append('phone',  phone);
    return api.get(`/booking/user/history?${params.toString()}`);
  },

  cancelBooking: (bookingId) =>
    api.delete(`/booking/${bookingId}`),
  createBooking: (bookingData, token) =>
    api.post('/booking', bookingData, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getBookings: (token) =>
    api.get('/booking', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  updateBookingStatus: (bookingId, status, token) =>
    api.put(`/booking/${bookingId}`, { isChecked: status }, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// City Services
export const cityService = {
  getAllCities: () => api.get('/api/getAllCities'),
};

// City Route (ordered master list with km values)
export const cityRouteService = {
  getCityRoute: () => api.get('/api/cityRoute'),
};

// Bus Company Services
export const companyService = {
  getAllCompanies: () => api.get('/api/getAllBusCompanies'),
};

// Waitlist Services
export const waitlistService = {
  join: (data) => api.post('/waitlist', data),
  getUserWaitlist: (email, userId) => {
    const params = new URLSearchParams();
    if (email)  params.append('email',  email);
    if (userId) params.append('userId', userId);
    return api.get(`/waitlist/user?${params.toString()}`);
  },
  leave: (id) => api.delete(`/waitlist/${id}`),
};

export default api;
