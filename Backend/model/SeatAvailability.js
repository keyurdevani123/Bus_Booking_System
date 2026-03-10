const mongoose = require("mongoose");

// One document per seat per date per bus.
// Replaces the embedded seats[].availability[] array in the Bus document.
// For a 40-seat bus running 365 days = 14,600 small docs instead of 1 giant doc.
const seatAvailabilitySchema = new mongoose.Schema({
  busId:      { type: mongoose.Schema.Types.ObjectId, ref: "Bus", required: true },
  date:       { type: String, required: true }, // "YYYY-MM-DD"
  seatNumber: { type: Number, required: true },
  // 'forward' = normal route[], 'return' = returnRoute[]
  direction:  { type: String, enum: ["forward", "return"], default: "forward" },
  booked: [
    {
      city: String,
      take: {
        in:  { type: Number, default: 0 }, // 0=free, 1=booked, 2=processing
        out: { type: Number, default: 0 },
      },
    },
  ],
});

// ── Indexes ───────────────────────────────────────────────────────────────
// Primary: unique constraint — one doc per bus+date+seat+direction
seatAvailabilitySchema.index(
  { busId: 1, date: 1, seatNumber: 1, direction: 1 },
  { unique: true, name: "bus_date_seat_dir_unique" }
);

// Search query: fetch all seats for a bus on a date (by direction)
seatAvailabilitySchema.index(
  { busId: 1, date: 1, direction: 1 },
  { name: "bus_date_dir_lookup" }
);

// DailyJob cleanup: delete old date entries
seatAvailabilitySchema.index(
  { date: 1 },
  { name: "date_cleanup" }
);

module.exports = mongoose.model("SeatAvailability", seatAvailabilitySchema);
