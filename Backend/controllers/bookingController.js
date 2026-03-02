const asyncHandler = require("express-async-handler");
const Booking = require("../model/Booking");
const Bus = require("../model/Bus");
const generateQRCodeAndPDF = require("../utils/generateQR");
const sendEmailWithAttachment = require("../utils/sendEmail");
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

const generateRandomStringAndStoreDetails = (data) => {
  const id = crypto.randomBytes(16).toString("hex");
  const currentDateFromLibrary = dayjs().format("YYYY-MM-DD");
  const temp = id + currentDateFromLibrary;
  const dataWithCurrentTime = { ...data, createdAt: dayjs().toISOString() };
  paymentStore[temp] = dataWithCurrentTime;
  return temp;
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
  const bus = await Bus.findById(busId);
  if (!bus) {
    return res.sendStatus(404);
  }

  const tempBookId = generateRandomStringAndStoreDetails(req.body);

  //make that seats as processing
  const seatSplit = seats.split(",");
  const seatNumbers = seatSplit.map(Number);
  const seatsObjectArray = bus.seats.filter((seat) =>
    seatNumbers.includes(seat.seatNumber)
  );
  //for all seats
  for (let i = 0; i < seatsObjectArray.length; i++) {
    const seatObj = seatsObjectArray[i]; //take one seat
    //object inside availability where date is equal to date

    let availability = {};
    if (
      convertTimeToFloat(busDepartureTime) <= convertTimeToFloat(departureTime)
    ) {
      availability = seatObj.availability.find((obj) => obj.date === date);
    } else {
      availability = seatObj.availability.find(
        (obj) =>
          obj.date === dayjs(date).subtract(1, "day").format("YYYY-MM-DD")
      );
    }

    console.log(availability); //availability is a object
    if (!availability) {
      return res.sendStatus(404);
    }
    //object inside booked where city is equal to from
    for (let j = 0; j < availability.booked.length; j++) {
      if (availability.booked[j].city !== from) {
        continue;
      }

      if (availability.booked[j].take.out === 2) {
        return res
          .status(409)
          .json({ message: "Sorry, Someone is booking this seat" });
      }
      if (availability.booked[j].take.out === 1) {
        return res
          .status(409)
          .json({ message: "Sorry, Someone was booked this seat" });
      }
      availability.booked[j].take.out = 2;
      for (let k = j + 1; k < availability.booked.length; k++) {
        if (availability.booked[k].city === to) {
          availability.booked[k].take.in = 2;
          break;
        }

        if (availability.booked[k].take.in === 2) {
          return res
            .status(409)
            .json({ message: "Sorry, Someone is booking this seat" });
        }
        if (availability.booked[k].take.in === 1) {
          return res
            .status(409)
            .json({ message: "Sorry, Someone was booked this seat" });
        }

        availability.booked[k].take.in = 2;
        availability.booked[k].take.out = 2;
      }
      break;
    }
  }

  await bus.save();

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
      if (!paymentStore[tempBookId]) return; // already paid — do nothing
      delete paymentStore[tempBookId];
      const b = await Bus.findById(_busId);
      if (!b) return;
      const toRelease = b.seats.filter((s) => _seatNumbers.includes(s.seatNumber));
      for (const seatObj of toRelease) {
        let avail;
        if (convertTimeToFloat(_busDepartureTime) <= convertTimeToFloat(_departureTime)) {
          avail = seatObj.availability.find((a) => a.date === _date);
        } else {
          avail = seatObj.availability.find(
            (a) => a.date === dayjs(_date).subtract(1, "day").format("YYYY-MM-DD")
          );
        }
        if (!avail) continue;
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
      }
      await b.save();
      console.log(`Released processing seats for expired session: ${tempBookId}`);
    } catch (e) {
      console.error("Failed to release processing seats:", e);
    }
  }, 5 * 60 * 1000); // 5 minutes
  // ─────────────────────────────────────────────────────────────────────────

  const seatCount  = seatSplit.length;
  const totalPrice = price * seatCount;

  // Derive the frontend/backend root URL from the incoming request (works on any host/IP/domain)
  const siteRoot = process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}`;
  const backendRoot = siteRoot; // same origin (React build is served from Express)
  const busImageURL = bus.imagesURLs && bus.imagesURLs.length > 0
    ? `${backendRoot}/bus/busses/${bus.imagesURLs[0]}`
    : null;

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: "inr",
          product_data: {
            name: `🚌 Bus Ticket: ${from} → ${to}`,
            description:
              `Date: ${date}  |  Departure: ${departureTime}  |  Arrival: ${arrivalTime} \n` +
              `Seats: ${seats}  |  Bus: ${numberPlate} (${busName})`,
            ...(busImageURL ? { images: [busImageURL] } : {}),
          },
          unit_amount: price * 100,   // per-seat price in paise
        },
        quantity: seatCount,          // number of seats
      },
    ],

    mode: "payment",
    customer_email: email,
    billing_address_collection: "required",
    success_url:
      siteRoot +
      `/payment-success?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}&departure=${encodeURIComponent(departureTime)}&arrival=${encodeURIComponent(arrivalTime)}&seats=${encodeURIComponent(seats)}&price=${encodeURIComponent(totalPrice)}&bus=${encodeURIComponent(numberPlate)}&name=${encodeURIComponent(busName)}&email=${encodeURIComponent(email)}`,
    cancel_url: siteRoot + "/",
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

  //console.log("TempBookId: ", tempBookId);

  //console.log("TempBookId: ", temp);
  res.json({ url: session.url, tempBookId: tempBookId });
});

const addBooking = async (data, tempBookId) => {
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
  } = data;

  const bus = await Bus.findById(busId);
  const seatSplit = seats.split(",");
  const seatNumbers = seatSplit.map(Number);
  const seatsObjectArray = bus.seats.filter((seat) =>
    seatNumbers.includes(seat.seatNumber)
  );
  //for all seats
  for (let i = 0; i < seatsObjectArray.length; i++) {
    const seatObj = seatsObjectArray[i]; //take one seat
    //object inside availability where date is equal to date

    let availability = {};
    if (
      convertTimeToFloat(busDepartureTime) <= convertTimeToFloat(departureTime)
    ) {
      availability = seatObj.availability.find((obj) => obj.date === date);
    } else {
      availability = seatObj.availability.find(
        (obj) =>
          obj.date === dayjs(date).subtract(1, "day").format("YYYY-MM-DD")
      );
    }

    console.log(availability); //availability is a object
    if (!availability) {
      return;
    }
    //object inside booked where city is equal to from
    for (let j = 0; j < availability.booked.length; j++) {
      if (availability.booked[j].city !== from) {
        continue;
      }
      availability.booked[j].take.out = 1;
      for (let k = j + 1; k < availability.booked.length; k++) {
        if (availability.booked[k].city === to) {
          availability.booked[k].take.in = 1;
          break;
        }
        availability.booked[k].take.out = 1;
        availability.booked[k].take.in = 1;
      }
      break;
    }
  }
  //pdf part start..
  const randomNumber = Math.floor(Math.random() * 100000000); // random number
  console.log(`QR code data: ${randomNumber}`);
  const pdfTotalPrice = price * seats.split(",").length;

  generateQRCodeAndPDF(
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
    pdfTotalPrice,
    seats,
    tempBookId
  )
    .then(() => {
      return sendEmailWithAttachment(email, tempBookId);
    })
    .then(() => {
      console.log("Process completed successfully.");
    })
    .catch((err) => {
      console.error("An error occurred:", err);
    });

  //pdf part end...

  //bus should be updated
  await bus.save();

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
  });
  await booking.save();
  //res.sendStatus(201);
};

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
  getAllBookings,
  updateBooking,
  getAllBookingsAdmin,
  freezeBooking,
  getFreezedDays,
  makePayment,
};
