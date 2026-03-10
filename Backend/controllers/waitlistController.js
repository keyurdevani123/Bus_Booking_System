const asyncHandler = require("express-async-handler");
const Waitlist = require("../model/Waitlist");
const { sendWaitlistNotificationEmail } = require("../utils/sendEmail");

// ── POST /waitlist ─────────────────────────────────────────────────────────
// Join the waitlist for a specific bus / route / date
const joinWaitlist = asyncHandler(async (req, res) => {
  const { busId, from, to, date, name, email, phone, userId, seatsWanted } = req.body;

  if (!busId || !from || !to || !date || !name || !email || !phone) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  // Prevent duplicate active entries for the same person/route/date
  const existing = await Waitlist.findOne({
    busId, from, to, date,
    email: { $regex: new RegExp(`^${email}$`, "i") },
    status: "waiting",
  }).lean();

  if (existing) {
    return res.status(409).json({
      message: "You are already on the waitlist for this trip.",
    });
  }

  const entry = await Waitlist.create({
    busId, from, to, date,
    name, email,
    phone: Number(phone),
    userId: userId || "",
    seatsWanted: Math.min(6, Math.max(1, Number(seatsWanted) || 1)),
  });

  // Count position in queue (how many ahead of this entry)
  const position = await Waitlist.countDocuments({
    busId, from, to, date,
    status: "waiting",
    createdAt: { $lt: entry.createdAt },
  });

  return res.status(201).json({
    message: "You have been added to the waitlist.",
    position: position + 1,
    seatsWanted: entry.seatsWanted,
    entry,
  });
});

// ── GET /waitlist/user?email=&userId= ──────────────────────────────────────
// Return all waitlist entries for a user (by email or userId)
const getUserWaitlist = asyncHandler(async (req, res) => {
  const { email, userId } = req.query;
  if (!email && !userId) {
    return res.status(400).json({ message: "Provide email or userId." });
  }

  const orClauses = [];
  if (email)  orClauses.push({ email:  { $regex: new RegExp(`^${email}$`, "i") } });
  if (userId) orClauses.push({ userId: userId });

  // Use lean() for read-only response — avoids hydrating full Mongoose documents (faster + less memory)
  const entries = await Waitlist.find({ $or: orClauses })
    .sort({ createdAt: -1 })
    .lean();

  return res.json(entries);
});

// ── DELETE /waitlist/:id ───────────────────────────────────────────────────
// Leave / cancel a waitlist entry
const leaveWaitlist = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const entry = await Waitlist.findById(id);
  if (!entry) return res.status(404).json({ message: "Waitlist entry not found." });

  await Waitlist.findByIdAndDelete(id);
  return res.json({ message: "Removed from waitlist." });
});

// ── Internal helper (NOT a route handler) ─────────────────────────────────
// Called by cancelBooking once per freed seat (FIFO: finds oldest waiting entry).
const processWaitlist = async (busId, from, to, date, frontendUrl) => {
  try {
    const busIdStr = busId.toString();

    // Find the oldest waiting entry (FIFO) — uses queue_lookup compound index
    const entry = await Waitlist.findOne({
      busId: busIdStr, from, to, date, status: "waiting",
    })
      .sort({ createdAt: 1 })
      .select("_id name email seatsWanted seatsNotified")
      .lean();

    if (!entry) {
      console.log(`[Waitlist] No waiting entry — nobody to notify (${from}→${to} ${date}).`);
      return;
    }

    const newSeatsNotified = entry.seatsNotified + 1;
    const allNotified = newSeatsNotified >= entry.seatsWanted;

    // Atomic optimistic-concurrency update — safe under simultaneous cancellations
    const updated = await Waitlist.findOneAndUpdate(
      { _id: entry._id, seatsNotified: entry.seatsNotified },
      {
        $inc: { seatsNotified: 1 },
        $set: {
          notifiedAt: new Date(),
          ...(allNotified ? { status: "notified" } : {}),
        },
      },
      { new: true }
    );

    // If concurrency check failed (another process updated first), skip — they'll notify
    if (!updated) {
      console.log(`[Waitlist] Concurrency skip for entry ${entry._id} — another process already notified.`);
      return;
    }

    // Direct link to the booking page for this specific bus
    const frontendBase = frontendUrl || process.env.FRONTEND_URL || "http://localhost:3000";
    const bookingLink = `${frontendBase}/booking/${busIdStr}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}`;

    console.log(`[Waitlist] Emailed ${entry.email} — seat ${newSeatsNotified}/${entry.seatsWanted} for ${from}→${to} ${date}.`);

    // Send notification (fire-and-forget)
    sendWaitlistNotificationEmail(entry.email, entry.name, {
      from, to, date, busId: busIdStr, bookingLink,
      seatsNotified: newSeatsNotified,
      seatsWanted: entry.seatsWanted,
    }).catch((err) => console.error("Waitlist email error:", err));
  } catch (err) {
    console.error("processWaitlist error:", err);
  }
};

// ── 30-minute timeout re-queue ─────────────────────────────────────────────
// Run every 2 minutes. If a notified person hasn't booked within 30 min,
// expire their slot and notify the next person in queue for each seat.
const checkNotificationTimeouts = async () => {
  try {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
    const frontendBase = process.env.FRONTEND_URL || "http://localhost:3000";

    const timedOut = await Waitlist.find({
      status: "notified",
      notifiedAt: { $lt: cutoff },
    }).lean();

    if (!timedOut.length) return;

    console.log(`[Waitlist] Timeout: expiring ${timedOut.length} notified entry(ies) past 30-min window.`);

    for (const entry of timedOut) {
      // Mark expired
      await Waitlist.findByIdAndUpdate(entry._id, { $set: { status: "expired" } });
      // Re-queue: one processWaitlist call per seat they had claimed
      for (let i = 0; i < entry.seatsWanted; i++) {
        await processWaitlist(entry.busId, entry.from, entry.to, entry.date, frontendBase);
      }
    }
  } catch (err) {
    console.error("checkNotificationTimeouts error:", err);
  }
};

module.exports = { joinWaitlist, getUserWaitlist, leaveWaitlist, processWaitlist, checkNotificationTimeouts };
