const express = require("express");
const router = express.Router();
const {
  joinWaitlist,
  getUserWaitlist,
  leaveWaitlist,
} = require("../controllers/waitlistController");

router.post("/",          joinWaitlist);
router.get("/user",       getUserWaitlist);
router.delete("/:id",     leaveWaitlist);

module.exports = router;
