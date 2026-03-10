const mongoose = require("mongoose");

const waitlistSchema = new mongoose.Schema(
  {
    // Which bus / route / date they're waiting for
    busId:  { type: String, required: true },
    from:   { type: String, required: true },
    to:     { type: String, required: true },
    date:   { type: String, required: true }, // YYYY-MM-DD

    // Passenger details
    name:   { type: String, required: true },
    email:  { type: String, required: true },
    phone:  { type: Number, required: true },
    userId: { type: String, default: "" },

    // How many seats this person wants (each freed seat = 1 email notification)
    seatsWanted:   { type: Number, required: true, min: 1, max: 6, default: 1 },
    // Increments each time we send a "seat available" email
    seatsNotified: { type: Number, default: 0 },

    status: {
      type: String,
      // waiting   = in queue
      // notified  = all seat notifications sent, 30-min window to book
      // expired   = window elapsed without booking, or travel date passed
      enum: ["waiting", "notified", "expired"],
      default: "waiting",
    },

    // Time of the most recent seat-available notification sent
    notifiedAt: { type: Date },
  },
  { timestamps: true } // createdAt used for FIFO queue ordering
);

// ── Indexes ────────────────────────────────────────────────────────────────
// Primary: fastest possible query for "who is next in queue for this seat?"
// Used every time a booking is cancelled.
waitlistSchema.index(
  { busId: 1, from: 1, to: 1, date: 1, status: 1, createdAt: 1 },
  { name: "queue_lookup" }
);

// Secondary: user-facing queries ("show me my waitlist entries")
waitlistSchema.index({ email: 1, status: 1 }, { name: "user_email" });
waitlistSchema.index({ userId: 1, status: 1 }, { name: "user_id" });

// Cleanup index: DailyJob expires old entries by date
waitlistSchema.index({ date: 1, status: 1 }, { name: "cleanup" });
// Timeout checker: find notified entries whose 30-min window has passed
waitlistSchema.index({ status: 1, notifiedAt: 1 }, { name: "timeout_check" });

module.exports = mongoose.model("Waitlist", waitlistSchema);
