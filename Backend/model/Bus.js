const { ar } = require("date-fns/locale");
const mongoose = require("mongoose");

const busSchema = new mongoose.Schema({
  routeNumber: {
    type: String,
    required: true,
  },
  busName: {
    type: String,
    required: true,
  },
  capacity: {
    type: Number,
    required: true,
  },
  noOfAlocatedSeats: {
    type: Number,
    required: true,
  },
  busFrom: {
    city: {
      type: String,
      required: true,
    },
    departureTime: {
      type: String,
      required: true,
    },
  },

  busTo: {
    city: {
      type: String,
      required: true,
    },
    arrivalTime: {
      type: String,
      required: true,
    },
  },
  numberPlate: {
    type: String,
    required: true,
  },
  route: [
    {
      city: {
        type: String,
        required: true,
      },
      halts: {
        type: Number,
        required: true,
      },
      arrivalTime: {
        type: String,
        required: true,
      },
      departureTime: {
        type: String,
        required: true,
      },
    },
  ],
  seats: [
    {
      seatNumber: Number,
      isBookable: Boolean,
    },
  ],

  imagesURLs: [
    {
      type: String,
    },
  ],
  selectedDays: {
    weekDays: Boolean,
    sunday: Boolean,
    saturday: Boolean,
  },
  minHalts: {
    type: Number,
    required: true,
  },
  baseFare: {
    type: Number,
    default: 0,
  },
  totalRouteKm: {
    type: Number,
    default: 0,
  },
  haltStops: [
    {
      name:            { type: String, default: '' },
      durationMinutes: { type: Number, default: 0  },
    },
  ],
  busType: {
    acType:   { type: String, enum: ['AC', 'Non-AC'], default: 'AC' },
    seatType: { type: String, enum: ['Seater', 'Sleeper'], default: 'Seater' },
  },
  freezedDays: [String],
  /* tripDetails: {
    enabled: Boolean,
    days: [String],
    price: Number,
    description: String,
  }, */

  // ── Bidirectional support ──────────────────────────────────────────────────
  // When true, the bus runs both A→B (route[]) and B→A (returnRoute[]) on the same day.
  isBidirectional: { type: Boolean, default: false },
  returnRoute: [
    {
      city:          { type: String, required: true },
      halts:         { type: Number, required: true },
      arrivalTime:   { type: String, required: true },
      departureTime: { type: String, required: true },
    },
  ],

  // ── Denormalized city list for fast indexed search ─────────────────────────
  // Auto-maintained by pre-save hook. Enables Bus.find({ routeCities: { $all: [from, to] } })
  // instead of loading every bus and filtering in JS.
  routeCities: [{ type: String }],
});

// Keep routeCities in sync whenever route[] changes
busSchema.pre("save", function (next) {
  if (this.isModified("route") || this.isNew) {
    this.routeCities = this.route.map((r) => r.city);
  }
  next();
});

// Index for the search query: find buses covering both cities
busSchema.index({ routeCities: 1 });

module.exports = mongoose.model("Bus", busSchema);
