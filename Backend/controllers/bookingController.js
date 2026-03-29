const asyncHandler = require("express-async-handler");
const Booking = require("../model/Booking");
const PendingPayment = require("../model/PendingPayment");
const Bus = require("../model/Bus");
const SeatAvailability = require("../model/SeatAvailability");
const generateQRCodeAndPDF = require("../utils/generateQR");
const sendEmailWithAttachment = require("../utils/sendEmail").sendEmailWithAttachment;
const sendCancellationEmail   = require("../utils/sendEmail").sendCancellationEmail;
const { processWaitlist }     = require("./waitlistController");
const { search } = require("./searchController");
const dayjs = require("dayjs");
const convertTimeToFloat = require("../utils/convertTimeToFloat");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const crypto = require("crypto");
const paymentStore = require("../db/store");
//const dayjs = require("dayjs");
//const { Console } = require("console");

/* let globalVars = {
  id: null,
  email: null,
  phone: null,
  date: null,
  seats: null,
  busId: null,
  departureTime: null,
  arrivalTime: null,
  arrivalDate: null,
  numberPlate: null,
  routeNumber: null,
  from: null,
  to: null,
  busName: null,
  duration: null,
  busFrom: null,
  busTo: null,
  price: null,
  busDepartureTime: null,
}; */

// ── Helper: compute the SeatAvailability date for a booking ──────────────────
// For overnight buses (bus departs before the user's segment start):
//   busDepartureTime > departureTime → user boards the *next* calendar day
//   relative to the bus's own start date, so availability is stored under date-1.
const resolveAvailDate = (date, busDepartureTime, departureTime) => {
  if (convertTimeToFloat(busDepartureTime) <= convertTimeToFloat(departureTime)) {
    return date;
  }
  return dayjs(date).subtract(1, "day").format("YYYY-MM-DD");
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizePublicBaseUrl = (rawValue, fallbackValue) => {
  const candidates = [rawValue, fallbackValue].filter(Boolean);

  for (const candidate of candidates) {
    let value = String(candidate).trim();
    if (!value) continue;

    if (!/^https?:\/\//i.test(value)) {
      // Localhost should stay HTTP; public domains default to HTTPS.
      if (/^(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(value)) {
        value = `http://${value}`;
      } else {
        value = `https://${value}`;
      }
    }

    try {
      const u = new URL(value);
      return `${u.protocol}//${u.host}`;
    } catch (_) {
      // Try next candidate.
    }
  }

  return null;
};

const validatePaidCheckoutSession = async (tempBookId, sessionId) => {
  if (!sessionId) {
    const error = new Error("Missing Stripe session reference");
    error.statusCode = 400;
    throw error;
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err) {
    const error = new Error("Unable to verify Stripe checkout session");
    error.statusCode = 400;
    error.cause = err;
    throw error;
  }

  if (!session) {
    const error = new Error("Stripe checkout session not found");
    error.statusCode = 404;
    throw error;
  }

  if (session.metadata?.tempBookId !== tempBookId) {
    const error = new Error("Stripe session does not match this booking reference");
    error.statusCode = 400;
    throw error;
  }

  if (session.payment_status !== "paid") {
    const error = new Error("Payment is not completed yet");
    error.statusCode = 409;
    throw error;
  }

  return session;
};

const generateRandomStringAndStoreDetails = async (data) => {
  const id = crypto.randomBytes(16).toString("hex");
  const currentDateFromLibrary = dayjs().format("YYYY-MM-DD");
  const temp = id + currentDateFromLibrary;
  const dataWithCurrentTime = { ...data, createdAt: dayjs().toISOString() };
  // Store in memory (fast lookup)
  paymentStore[temp] = dataWithCurrentTime;
  // Also persist to MongoDB so backend restarts don't lose data
  try {
    await PendingPayment.findOneAndUpdate(
      { tempBookId: temp },
      { tempBookId: temp, data: dataWithCurrentTime },
      { upsert: true, new: true }
    );
  } catch (e) {
    console.error("Failed to persist pending payment to DB:", e);
  }
  return temp;
};

const sendTicketEmailForBooking = async ({
  bookingId,
  id,
  phone,
  randomNumber,
  email,
  from,
  to,
  departureTime,
  arrivalTime,
  arrivalDate,
  date,
  numberPlate,
  routeNumber,
  price,
  seats,
  tempBookId,
}) => {
  try {
    await generateQRCodeAndPDF(
      id,
      phone,
      randomNumber,
      email,
      from,
      to,
      departureTime,
      arrivalTime,
      arrivalDate,
      date,
      numberPlate,
      routeNumber,
      price,
      seats,
      tempBookId
    );
  } catch (err) {
    console.error("Ticket PDF generation failed. Sending confirmation email without attachment.", err);
  }

  try {
    await sendEmailWithAttachment(email, tempBookId);
    await Booking.updateOne({ _id: bookingId }, { $set: { emailSent: true } });
    console.log("Email sent successfully for", tempBookId);
  } catch (err) {
    console.error("Ticket email failed:", err);
  }
};

const normalizeBookingOwner = (owner = {}) => {
  const userId = owner.userId || owner.id || owner._id || owner.user_id || "";
  const email = owner.email || "";
  const phone = owner.phone || "";

  return {
    userId: userId ? String(userId).trim() : "",
    email: email ? String(email).trim() : "",
    phone: phone ? Number(String(phone).replace(/\D/g, "")) : null,
  };
};

const mergeBookingOwnerIntoData = (data, bookingOwner) => {
  if (!data || !bookingOwner) return data;
  const next = { ...data };

  if (!next.userId && bookingOwner.userId) {
    next.userId = bookingOwner.userId;
  }
  if (!next.email && bookingOwner.email) {
    next.email = bookingOwner.email;
  }
  if ((!next.phone || Number.isNaN(Number(next.phone))) && bookingOwner.phone) {
    next.phone = bookingOwner.phone;
  }

  return next;
};

const makePayment = asyncHandler(async (req, res) => {
  const {
    id,
    email,
    phone,
    date,
    seats,
    busId,
    departureTime,
    arrivalTime,
    arrivalDate,
    numberPlate,
    routeNumber,
    from,
    to,
    busName,
    duration,
    busFrom,
    busTo,
    price,
    busDepartureTime,
  } = req.body;
  if (
    !id ||
    !email ||
    !phone ||
    !date ||
    !seats ||
    !busId ||
    !departureTime ||
    !arrivalTime ||
    !arrivalDate ||
    !numberPlate ||
    !routeNumber ||
    !from ||
    !to ||
    !busName ||
    (duration === undefined || duration === null || duration === '') ||
    !busFrom ||
    !busTo ||
    !price
  ) {
    return res.sendStatus(400);
  }
  const bus = await Bus.findById(busId).select("imagesURLs busName numberPlate route").lean();
  if (!bus) {
    return res.sendStatus(404);
  }

  const tempBookId = await generateRandomStringAndStoreDetails(req.body);

  const seatSplit = seats.split(",");
  const seatNumbers = seatSplit.map(Number);
  const availDate = resolveAvailDate(date, busDepartureTime, departureTime);

  // ── Fetch all seat docs for this bus/date in one query ────────────────────
  let availDocs = await SeatAvailability.find({
    busId,
    date: availDate,
    seatNumber: { $in: seatNumbers },
  });

  // If docs are missing, the seat has never been touched → create them now.
  // (Search already shows missing docs as "available", so this is consistent.)
  if (availDocs.length !== seatNumbers.length) {
    const routeBooked = (bus.route || []).map((r) => ({ city: r.city, take: { in: 0, out: 0 } }));
    if (!routeBooked.length) return res.status(400).json({ message: "Bus route data missing" });
    const foundNums = new Set(availDocs.map((d) => d.seatNumber));
    const missing = seatNumbers.filter((n) => !foundNums.has(n));
    const newDocs = missing.map((seatNumber) => ({ busId, date: availDate, seatNumber, booked: routeBooked }));
    try {
      const created = await SeatAvailability.insertMany(newDocs, { ordered: false });
      availDocs = [...availDocs, ...created];
    } catch (e) {
      // Duplicate key (race condition) — re-fetch
      availDocs = await SeatAvailability.find({ busId, date: availDate, seatNumber: { $in: seatNumbers } });
    }
    if (availDocs.length !== seatNumbers.length) {
      return res.status(409).json({ message: "Could not reserve seat availability — please try again" });
    }
  }

  // ── Pass 1: validate all seats are free before touching anything ──────────
  for (const avail of availDocs) {
    for (let j = 0; j < avail.booked.length; j++) {
      if (avail.booked[j].city !== from) continue;
      if (avail.booked[j].take.out === 2) {
        return res.status(409).json({ message: "Sorry, Someone is booking this seat" });
      }
      if (avail.booked[j].take.out === 1) {
        return res.status(409).json({ message: "Sorry, Someone was booked this seat" });
      }
      for (let k = j + 1; k < avail.booked.length; k++) {
        if (avail.booked[k].city === to) break;
        if (avail.booked[k].take.in === 2) {
          return res.status(409).json({ message: "Sorry, Someone is booking this seat" });
        }
        if (avail.booked[k].take.in === 1) {
          return res.status(409).json({ message: "Sorry, Someone was booked this seat" });
        }
      }
      break;
    }
  }

  // ── Pass 2: lock all seats (mark as processing = 2) ──────────────────────
  for (const avail of availDocs) {
    for (let j = 0; j < avail.booked.length; j++) {
      if (avail.booked[j].city !== from) continue;
      avail.booked[j].take.out = 2;
      for (let k = j + 1; k < avail.booked.length; k++) {
        if (avail.booked[k].city === to) {
          avail.booked[k].take.in = 2;
          break;
        }
        avail.booked[k].take.in = 2;
        avail.booked[k].take.out = 2;
      }
      break;
    }
    await avail.save();
  }

  // ── Release processing seats after 5 minutes if payment not completed ──
  const _busId              = busId;
  const _date               = date;
  const _seatNumbers        = seatNumbers;
  const _from               = from;
  const _to                 = to;
  const _departureTime      = departureTime;
  const _busDepartureTime   = busDepartureTime;

  setTimeout(async () => {
    try {
      if (!paymentStore[tempBookId]) {
        // Also check DB — might only be in DB if server restarted
        const stillPending = await PendingPayment.findOne({ tempBookId }).lean();
        if (!stillPending) return; // already paid
      }
      delete paymentStore[tempBookId];
      try { await PendingPayment.deleteOne({ tempBookId }); } catch (_) {}

      const _availDate = resolveAvailDate(_date, _busDepartureTime, _departureTime);
      const docs = await SeatAvailability.find({
        busId: _busId,
        date: _availDate,
        seatNumber: { $in: _seatNumbers },
      });
      for (const avail of docs) {
        for (let j = 0; j < avail.booked.length; j++) {
          if (avail.booked[j].city !== _from) continue;
          if (avail.booked[j].take.out === 2) avail.booked[j].take.out = 0;
          for (let k = j + 1; k < avail.booked.length; k++) {
            if (avail.booked[k].city === _to) {
              if (avail.booked[k].take.in === 2) avail.booked[k].take.in = 0;
              break;
            }
            if (avail.booked[k].take.in  === 2) avail.booked[k].take.in  = 0;
            if (avail.booked[k].take.out === 2) avail.booked[k].take.out = 0;
          }
          break;
        }
        await avail.save();
      }
      console.log(`Released processing seats for expired session: ${tempBookId}`);
    } catch (e) {
      console.error("Failed to release processing seats:", e);
    }
  }, 5 * 60 * 1000); // 5 minutes
  // ─────────────────────────────────────────────────────────────────────────

  const seatCount = seatSplit.length;
  const perSeatPrice = Number(price);
  if (!Number.isFinite(perSeatPrice) || perSeatPrice <= 0) {
    return res.status(400).json({ message: "Invalid ticket price" });
  }
  const totalPrice = perSeatPrice * seatCount;

  const requestBase = `${req.protocol}://${req.get("host")}`;

  // Frontend root is where Stripe should redirect user after payment.
  const frontendRoot = normalizePublicBaseUrl(process.env.FRONTEND_URL, requestBase);
  if (!frontendRoot) {
    return res.status(500).json({ message: "Invalid FRONTEND_URL configuration" });
  }

  // Backend root must be used for image URLs (bus images are served by backend route).
  const backendRoot = normalizePublicBaseUrl(process.env.BACKEND_URL, requestBase);
  const rawBusImageURL = bus.imagesURLs && bus.imagesURLs.length > 0
    ? new URL(`/bus/busses/${bus.imagesURLs[0]}`, backendRoot).toString()
    : null;
  // Stripe only accepts public HTTPS image URLs for checkout products.
  const busImageURL = rawBusImageURL && /^https:\/\//.test(rawBusImageURL) ? rawBusImageURL : null;

  const successUrl = new URL("/payment-success", frontendRoot);
  successUrl.searchParams.set("from", from);
  successUrl.searchParams.set("to", to);
  successUrl.searchParams.set("date", date);
  successUrl.searchParams.set("departure", departureTime);
  successUrl.searchParams.set("arrival", arrivalTime);
  successUrl.searchParams.set("seats", seats);
  successUrl.searchParams.set("price", String(totalPrice));
  successUrl.searchParams.set("bus", numberPlate);
  successUrl.searchParams.set("name", busName);
  successUrl.searchParams.set("email", email);
  successUrl.searchParams.set("tempBookId", tempBookId);
  successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");

  const cancelUrl = new URL("/", frontendRoot).toString();

  let session;
  try {
    session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: "inr",
          product_data: {
            name: `🚌 Bus Ticket: ${from} → ${to}`,
            description:
              `Date: ${date}  |  Departure: ${departureTime}  |  Arrival: ${arrivalTime}  | \n` +
              `Seats: ${seats}  |  Bus: ${numberPlate} (${busName})`,
            ...(busImageURL ? { images: [busImageURL] } : {}),
          },
          unit_amount: Math.round(perSeatPrice * 100), // per-seat price in paise
        },
        quantity: seatCount,          // number of seats
      },
    ],

    mode: "payment",
    customer_email: email,
    billing_address_collection: "required",
    success_url: successUrl.toString(),
    // tempBookId also passed in URL so frontend can confirm booking without needing webhook
    cancel_url: cancelUrl,
    metadata: {
      tempBookId: tempBookId,
    },
    expires_at: Math.floor(Date.now() / 1000) + 60 * 30, // expires in 30 minutes

    payment_intent_data: {
      metadata: {
        tempBookId: tempBookId,
      },
    },
  });
  } catch (err) {
    console.error("Stripe checkout session create failed:", err?.message || err);
    return res.status(500).json({
      message: err?.raw?.message || err?.message || "Failed to create payment session",
    });
  }

  //console.log("TempBookId: ", tempBookId);

  //console.log("TempBookId: ", temp);
  res.json({ url: session.url, tempBookId: tempBookId });
});

const addBooking = async (data, tempBookId) => {
  // Idempotency: if this payment session was already confirmed, do nothing.
  if (tempBookId) {
    const existing = await Booking.findOne({ tempBookId }).lean();
    if (existing) {
      // Previous booking exists but email may have failed earlier; retry once.
      if (!existing.emailSent && existing.email) {
        sendEmailWithAttachment(existing.email, tempBookId)
          .then(async () => {
            await Booking.updateOne({ _id: existing._id }, { $set: { emailSent: true } });
            console.log("Retried and sent ticket email for existing booking:", tempBookId);
          })
          .catch((err) => {
            console.error("Retry ticket email failed for existing booking:", tempBookId, err);
          });
      }
      return existing;
    }
  }

  const {
    id,
    email,
    phone,
    date,
    seats,
    busId,
    departureTime,
    arrivalTime,
    arrivalDate,
    numberPlate,
    routeNumber,
    from,
    to,
    busDepartureTime,
    price,
    userId,
  } = data;

  const bus = await Bus.findById(busId).select("busName numberPlate").lean();
  const seatSplit = seats.split(",");
  const seatNumbers = seatSplit.map(Number);

  // ── Mark seats as booked (take = 1) ───────────────────────────────────────
  const availDate = resolveAvailDate(date, busDepartureTime, departureTime);
  const availDocs = await SeatAvailability.find({
    busId,
    date: availDate,
    seatNumber: { $in: seatNumbers },
  });
  for (const avail of availDocs) {
    for (let j = 0; j < avail.booked.length; j++) {
      if (avail.booked[j].city !== from) continue;
      avail.booked[j].take.out = 1;
      for (let k = j + 1; k < avail.booked.length; k++) {
        if (avail.booked[k].city === to) {
          avail.booked[k].take.in = 1;
          break;
        }
        avail.booked[k].take.out = 1;
        avail.booked[k].take.in = 1;
      }
      break;
    }
    await avail.save();
  }
  //pdf part start..
  const randomNumber = Math.floor(Math.random() * 100000000); // random number
  console.log(`QR code data: ${randomNumber}`);
  const pdfTotalPrice = price * seats.split(",").length;

  // ── Save booking + remove pending BEFORE attempting PDF/email ─────────────
  // This guarantees the booking is always in the DB even if email delivery fails.
  const booking = new Booking({
    id,
    email,
    phone,
    date,
    seats: seatNumbers,
    busId,
    randomNumber,
    mappedDate:
      busDepartureTime <= departureTime
        ? date
        : dayjs(date).subtract(1, "day").format("YYYY-MM-DD"),
    from,
    to,
    departureTime,
    arrivalTime,
    arrivalDate,
    userId: userId ? String(userId) : "",
    tempBookId: tempBookId || "",
    emailSent: false,
  });
  await booking.save();
  try { await PendingPayment.deleteOne({ tempBookId }); } catch (_) {}

  // ── PDF + email (fire-and-forget — failure never blocks booking) ──────────
  sendTicketEmailForBooking({
    bookingId: booking._id,
    id,
    phone,
    randomNumber,
    email,
    from,
    to,
    departureTime,
    arrivalTime,
    arrivalDate,
    date,
    numberPlate,
    routeNumber,
    price: pdfTotalPrice,
    seats,
    tempBookId,
  });

  return booking;
};

const confirmBooking = asyncHandler(async (req, res) => {
  const { tempBookId } = req.params;
  const sessionId = req.query.session_id || req.body?.sessionId || "";
  const bookingOwner = normalizeBookingOwner(req.body?.bookingOwner || {});
  if (!tempBookId) return res.status(400).json({ message: "Missing tempBookId" });

  let data = paymentStore[tempBookId];

  // Fallback: if not in memory (backend was restarted), try MongoDB
  if (!data) {
    const pending = await PendingPayment.findOne({ tempBookId }).lean();
    if (pending) {
      data = pending.data;
      // Restore to memory for processing
      paymentStore[tempBookId] = data;
    } else {
      // Not in memory or pending DB: check if it was already persisted as booking.
      const alreadyBooked = await Booking.findOne({ tempBookId }).lean();
      if (alreadyBooked) {
        if (!alreadyBooked.userId && bookingOwner.userId) {
          await Booking.updateOne(
            { _id: alreadyBooked._id },
            { $set: { userId: bookingOwner.userId } }
          );
        }
        // If booking exists but email wasn't sent, retry in background.
        if (!alreadyBooked.emailSent && alreadyBooked.email) {
          sendEmailWithAttachment(alreadyBooked.email, tempBookId)
            .then(async () => {
              await Booking.updateOne({ _id: alreadyBooked._id }, { $set: { emailSent: true } });
              console.log("confirmBooking retry email success:", tempBookId);
            })
            .catch((err) => {
              console.error("confirmBooking retry email failed:", tempBookId, err);
            });
        }
        return res.json({ ok: true, message: "Already confirmed" });
      }
      return res.status(404).json({
        ok: false,
        message: "Booking confirmation not found. Payment may be incomplete or expired.",
      });
    }
  }

  try {
    await validatePaidCheckoutSession(tempBookId, sessionId);
    const mergedData = mergeBookingOwnerIntoData(data, bookingOwner);
    await addBooking(mergedData, tempBookId);
    delete paymentStore[tempBookId];
    console.log("Booking confirmed via success-page fallback:", tempBookId);
    res.json({ ok: true });
  } catch (err) {
    console.error("confirmBooking error:", err);
    res.status(err.statusCode || 500).json({ message: err.message || "Failed to confirm booking" });
  }
});

const getUserBookingHistory = asyncHandler(async (req, res) => {
  const { email, userId, phone } = req.query;
  if (!email && !userId && !phone) return res.status(400).json({ message: "At least email, userId, or phone is required" });

  // Build query: match by email (case-insensitive) OR userId OR phone
  const query = [];
  if (email) {
    const safe = escapeRegex(String(email).trim());
    query.push({ email: { $regex: new RegExp(`^${safe}$`, "i") } });
  }
  if (userId) query.push({ userId: String(userId).trim() });
  if (phone) {
    const parsedPhone = Number(String(phone).replace(/\D/g, ""));
    if (!Number.isNaN(parsedPhone)) query.push({ phone: parsedPhone });
  }

  console.log("[history] querying with:", JSON.stringify(query));

  const bookings = await Booking.find(query.length > 1 ? { $or: query } : query[0])
    .select("_id busId id email date seats from to departureTime arrivalTime arrivalDate isChecked mappedDate randomNumber userId")
    .lean()
    .sort({ date: -1 });

  console.log(`[history] found ${bookings.length} bookings for email=${email} userId=${userId} phone=${phone}`);

  if (!bookings || bookings.length === 0) {
    return res.json([]);
  }

  // Enrich each booking with bus name if possible
  const busIds = [...new Set(bookings.map((b) => b.busId))];
  const buses = await Bus.find({ _id: { $in: busIds } })
    .select("_id busName numberPlate")
    .lean();
  const busMap = {};
  buses.forEach((b) => { busMap[String(b._id)] = b; });

  const enriched = bookings.map((b) => ({
    ...b,
    busName: busMap[b.busId]?.busName || "Bus",
    numberPlate: busMap[b.busId]?.numberPlate || "",
  }));

  res.json(enriched);
});

const getAllBookings = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const today = dayjs().format("YYYY-MM-DD");

  const bookings = await Booking.find({ busId: id, mappedDate: today })
    .select(
      "_id id date seats from to departureTime arrivalTime arrivalDate isChecked"
    )
    .lean();

  console.log(bookings);
  if (!bookings) {
    return res.sendStatus(404);
  }
  if (!bookings.length) {
    return res.sendStatus(204);
  }
  console.log(bookings);
  res.json(bookings);
});

const updateBooking = asyncHandler(async (req, res) => {
  const busId = req.params.id;
  //console.log(busId);
  const bookingId = req.body.bookingId;
  //console.log(bookingId);
  const booking = await Booking.findOne({ randomNumber: bookingId, busId });

  //console.log(booking);
  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  if (booking.isChecked) {
    return res.status(400).json({ message: "Already checked" });
  }

  booking.isChecked = true;
  await booking.save();
  console.log(booking._id);
  res.json({ bookingId: booking._id });
});

const getAllBookingsAdmin = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const arrayOfBookings = [];
  for (let i = 0; i < 4; i++) {
    const date = dayjs().add(i, "day").format("YYYY-MM-DD");
    const count = await Booking.countDocuments({ busId: id, mappedDate: date });
    arrayOfBookings.push({ date, count });
  }
  console.log(arrayOfBookings);
  res.json(arrayOfBookings);
});

const freezeBooking = asyncHandler(async (req, res) => {
  const busId = req.params.id;
  const date = req.body.date;
  //hello
  console.log(busId, date);
  const bus = await Bus.findById(busId);
  if (!bus) {
    return res.status(404).json({ message: "Bus not found" });
  }

  const freezeArray = bus.freezedDays;

  if (freezeArray.includes(date)) {
    return res.status(400).json({ message: "Already freezed" });
  }
  bus.freezedDays.push(date);

  await bus.save();

  res.status(200).json({
    message: `${date} is 
    successfully freezed`,
  });
});

const cancelBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const booking = await Booking.findById(id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  // Block cancellation of already-boarded or past bookings
  const today = dayjs().format("YYYY-MM-DD");
  if (booking.isChecked) {
    return res.status(400).json({ message: "Cannot cancel a ticket that has already been boarded." });
  }
  if (booking.date < today) {
    return res.status(400).json({ message: "Cannot cancel past bookings." });
  }

  // Release seat slots in SeatAvailability (mappedDate is the stored availability date)
  const cancelAvailDocs = await SeatAvailability.find({
    busId: booking.busId,
    date: booking.mappedDate,
    seatNumber: { $in: booking.seats },
  });
  for (const avail of cancelAvailDocs) {
    for (let j = 0; j < avail.booked.length; j++) {
      if (avail.booked[j].city !== booking.from) continue;
      if (avail.booked[j].take.out === 1) avail.booked[j].take.out = 0;
      for (let k = j + 1; k < avail.booked.length; k++) {
        if (avail.booked[k].city === booking.to) {
          if (avail.booked[k].take.in === 1) avail.booked[k].take.in = 0;
          break;
        }
        if (avail.booked[k].take.in  === 1) avail.booked[k].take.in  = 0;
        if (avail.booked[k].take.out === 1) avail.booked[k].take.out = 0;
      }
      break;
    }
    await avail.save();
  }

  await Booking.findByIdAndDelete(id);

  // Send cancellation email (fire-and-forget, don't block the response)
  sendCancellationEmail(booking.email, booking).catch((err) =>
    console.error("Failed to send cancellation email:", err)
  );

  // Notify the waitlist once per freed seat (each call handles 1 seat, FIFO)
  const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}`;
  const freedSeats = booking.seats ? booking.seats.length : 1;
  for (let i = 0; i < freedSeats; i++) {
    processWaitlist(booking.busId, booking.from, booking.to, booking.date, frontendUrl);
  }

  return res.json({ message: "Booking cancelled successfully." });
});

const getFreezedDays = asyncHandler(async (req, res) => {
  const busId = req.params.id;
  const froze = [];

  const bus = await Bus.findById(busId);
  if (!bus) {
    return res.status(404).json({ message: "Bus not found" });
  }

  const freezeArray = bus.freezedDays;
  for (let i = 0; i < freezeArray.length; i++) {
    froze.push({
      date: freezeArray[i],
      reason: "Froze",
    });
  }

  console.log(froze);

  /* const tripDaysArray = bus.tripDetails.days;
  for (let i = 0; i < tripDaysArray.length; i++) {
    if (!freezeArray.includes(tripDaysArray[i])) {
      froze.push({
        date: tripDaysArray[i],
        reason: "Trip",
      });
    }
  } */
  res.json(froze);
});

module.exports = {
  addBooking,
  cancelBooking,
  confirmBooking,
  getAllBookings,
  getUserBookingHistory,
  updateBooking,
  getAllBookingsAdmin,
  freezeBooking,
  getFreezedDays,
  makePayment,
};
