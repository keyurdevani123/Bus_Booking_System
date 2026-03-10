const express = require("express");
const router = express.Router();

const {
  makePayment,
  cancelBooking,
  confirmBooking,
  getAllBookings,
  getUserBookingHistory,
  updateBooking,
  getAllBookingsAdmin,
  freezeBooking,
  getFreezedDays,
} = require("../controllers/bookingController");

router.post("/", makePayment);

// Confirm booking from success page (fallback when webhook can't reach localhost)
router.post("/confirm/:tempBookId", confirmBooking);

// User booking history — must come BEFORE /:id to avoid route conflict
router.get("/user/history", getUserBookingHistory);

router.get("/:id", getAllBookings);
router.get("/admin/:id", getAllBookingsAdmin);
router.post("/freeze/:id", freezeBooking);
router.get("/freeze/:id", getFreezedDays);
router.patch("/:id", updateBooking);
router.delete("/:id", cancelBooking);

module.exports = router;
