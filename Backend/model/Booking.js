const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  busId: {
    type: String,
    required: true,
  },
  id: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: Number,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  randomNumber: {
    type: String,
    required: true,
  },
  seats: [Number],
  isChecked: {
    type: Boolean,
    default: false,
  },
  mappedDate: {
    type: String,
    required: true,
  },
  from: {
    type: String,
    required: true,
  },
  to: {
    type: String,
    required: true,
  },
  departureTime: {
    type: String,
    required: true,
  },
  arrivalTime: {
    type: String,
    required: true,
  },
  arrivalDate: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    default: "",
  },
  tempBookId: {
    type: String,
    default: "",
  },
  emailSent: {
    type: Boolean,
    default: false,
  },
  // 'forward' = normal direction, 'return' = return trip (bidirectional bus)
  direction: {
    type: String,
    enum: ["forward", "return"],
    default: "forward",
  },
});

// ── Indexes for getUserBookingHistory query performance ─────────────────────
bookingSchema.index({ email: 1, date: -1 });
bookingSchema.index({ userId: 1, date: -1 });
bookingSchema.index({ phone: 1,  date: -1 });
bookingSchema.index({ tempBookId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Booking", bookingSchema);
