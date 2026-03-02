const express = require("express");
const router = express.Router();

const {
  makePayment,
  getAllBookings,
  updateBooking,
  getAllBookingsAdmin,
  freezeBooking,
  getFreezedDays,
} = require("../controllers/bookingController");

router.post("/", makePayment);

// If a browser navigates directly to /booking/:id, serve the React SPA
// (API callers use Accept: application/json, browser uses Accept: text/html)
router.get("/:id", (req, res, next) => {
  if (req.accepts("html") && !req.headers["x-requested-with"]) {
    const path = require("path");
    const frontendIndex = path.join(__dirname, "..", "..", "E-Ticket-Frontend", "build", "index.html");
    if (require("fs").existsSync(frontendIndex)) return res.sendFile(frontendIndex);
  }
  next();
}, getAllBookings);
router.get("/admin/:id", getAllBookingsAdmin);
router.post("/freeze/:id", freezeBooking);
router.get("/freeze/:id", getFreezedDays);
router.patch("/:id", updateBooking);

module.exports = router;
