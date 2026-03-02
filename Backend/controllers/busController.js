const Bus = require("../model/Bus");
const Booking = require("../model/Booking");
const asyncHandler = require("express-async-handler");
const fsPromises = require("fs").promises;
const dayjs = require("dayjs");
const weekdayOrWeekendFinder = require("../utils/weekdayOrWeekendFinder");

//get all busses name,numberplate,route
const getBuses = asyncHandler(async (req, res) => {
  const buses = await Bus.find()
    .select("-seats -selectedDays -minHalts")
    .lean();

  if (!buses) {
    return res.sendStatus(404);
  }
  if (!buses.length) {
    return res.sendStatus(204);
  }
  res.json(buses);
});
//add a bus
const addBus = asyncHandler(async (req, res) => {
  // Accept both multipart/form-data (with files) and simple JSON bodies.
  const body = req.body || {};
  const routeNumber = body.routeNumber || body.route;
  const busName = body.busName;
  const capacity = body.capacity ? Number(body.capacity) : undefined;
  const noOfAlocatedSeats = body.noOfAlocatedSeats ? Number(body.noOfAlocatedSeats) : 0;
  const BusFrom = body.BusFrom || body.busFrom || null;
  const BusTo = body.BusTo || body.busTo || null;
  const numberPlate = body.numberPlate;
  const table = body.table || body.routeTable || null;
  const selectedDays = body.selectedDays || null;
  const minHalts = body.minHalts ? Number(body.minHalts) : 0;
  const baseFare = body.baseFare ? Number(body.baseFare) : 0;
  const totalRouteKm = body.totalRouteKm ? Number(body.totalRouteKm) : 0;
  let haltStops = [];
  try {
    haltStops = body.haltStops
      ? (typeof body.haltStops === 'string' ? JSON.parse(body.haltStops) : body.haltStops)
      : [];
  } catch (e) { haltStops = []; }
  let busType = { acType: 'AC', seatType: 'Seater' };
  try {
    if (body.busType) {
      const bt = typeof body.busType === 'string' ? JSON.parse(body.busType) : body.busType;
      busType = { acType: bt.acType || 'AC', seatType: bt.seatType || 'Seater' };
    }
  } catch (e) {}

  console.log('addBus payload:', body);

  const files = req.files || [];
  const imageExists = files.length > 0;

  // Parse/normalize incoming values. If table or selectedDays are not provided,
  // build reasonable defaults so the admin can add simple buses from the UI.
  let busFrom;
  let busTo;
  let routeVariable;
  let selectedDaysVar;

  try {
    busFrom = typeof BusFrom === 'string' ? JSON.parse(BusFrom) : BusFrom;
  } catch (e) {
    busFrom = BusFrom;
  }
  try {
    busTo = typeof BusTo === 'string' ? JSON.parse(BusTo) : BusTo;
  } catch (e) {
    busTo = BusTo;
  }
  try {
    routeVariable = table ? (typeof table === 'string' ? JSON.parse(table) : table) : [];
  } catch (e) {
    routeVariable = [];
  }
  try {
    selectedDaysVar = selectedDays ? (typeof selectedDays === 'string' ? JSON.parse(selectedDays) : selectedDays) : { weekDays: true, saturday: true, sunday: true };
  } catch (e) {
    selectedDaysVar = { weekDays: true, saturday: true, sunday: true };
  }

  // If minimal busFrom/busTo provided as simple strings, accept them.
  if (typeof busFrom === 'string') {
    busFrom = { city: busFrom, departureTime: body.departureTime || '00:00' };
  }
  if (typeof busTo === 'string') {
    busTo = { city: busTo, arrivalTime: body.arrivalTime || '00:00' };
  }

  if (!routeVariable.length && busFrom && busTo) {
    routeVariable = [
      { city: busFrom.city, halts: 0, arrivalTime: busFrom.departureTime || '00:00', departureTime: busFrom.departureTime || '00:00' },
      { city: busTo.city, halts: 0, arrivalTime: busTo.arrivalTime || '00:00', departureTime: busTo.arrivalTime || '00:00' },
    ];
  }

  if (
    !routeVariable.length ||
    !busFrom ||
    !busTo ||
    !busFrom.city ||
    !busTo.city ||
    !busFrom.departureTime ||
    !busTo.arrivalTime
  ) {
    return res.status(400).json({ message: 'Missing required bus fields' });
  }

  // Ensure other required top-level fields exist
  if (!routeNumber || !busName || !capacity || !numberPlate) {
    return res.status(400).json({ message: 'Missing required top-level bus fields (routeNumber, busName, capacity, numberPlate)' });
  }

  // capacity must be a positive integer
  const numericCapacity = Number(capacity);
  if (!numericCapacity || numericCapacity <= 0) {
    return res.status(400).json({ message: 'Invalid capacity value' });
  }

  const bus = new Bus({
    routeNumber,
    busName,
    capacity,
    noOfAlocatedSeats,
    busFrom,
    busTo,
    numberPlate,
    route: routeVariable,
    selectedDays: selectedDaysVar,
    minHalts,
    baseFare,
    totalRouteKm,
    haltStops,
    busType,
  });

  // noOfAlocatedSeats = reserved/driver seats (non-bookable), rest are bookable
  const bookedArray = routeVariable.map((obj) => ({
    city: obj.city,
    taken: false,
  }));

  for (let i = 1; i <= capacity; i++) {
    if (i <= noOfAlocatedSeats) {
      bus.seats.push({
        seatNumber: i,
        isBookable: false,
        availability: [],
      });
    } else {
        bus.seats.push({
          seatNumber: i,
          isBookable: true,
          availability: Array.from({ length: 30 }, (_, d) => {
            // create availability entries for the next 30 days according to selectedDays
            if (
              selectedDaysVar[weekdayOrWeekendFinder(dayjs().add(d, "day"))] ===
              true
            ) {
              // deep-copy bookedArray for each availability
              const bookedCopy = bookedArray.map((b) => ({ city: b.city, taken: b.taken }));
              return {
                date: dayjs().add(d, "day").format("YYYY-MM-DD"),
                booked: bookedCopy,
              };
            }
          }).filter(Boolean),
        });
    }
  }

  req.files.map((file) => {
    bus.imagesURLs.push(file.filename);
  });

  // Populate availability for bookable seats for next 30 days if missing
  if (bus.seats && bus.seats.length) {
    const anyMissing = bus.seats.some(s => s.isBookable && (!s.availability || !s.availability.length));
    if (anyMissing) {
      const bookedArrayLocal = bus.route.map((obj) => ({ city: obj.city, taken: false }));
      bus.seats.forEach((s) => {
        if (s.isBookable && (!s.availability || !s.availability.length)) {
          s.availability = Array.from({ length: 30 }, (_, d) => ({
            date: dayjs().add(d, 'day').format('YYYY-MM-DD'),
            booked: bookedArrayLocal.map(b => ({ city: b.city, taken: b.taken })),
          }));
        }
      });
    }
  }

  const savedBus = await bus.save();

  if (savedBus) {
    res.status(201).json({ message: "Bus added successfully" });
  } else {
    res.sendStatus(500);
  }
});

//get bus by id
const getBus = asyncHandler(async (req, res) => {
  console.log(req.params.id);
  const bus = await Bus.findById(req.params.id).lean();
  if (!bus) {
    return res.sendStatus(404);
  }
  res.json(bus);
});
//delete bus by id

const deleteBus = asyncHandler(async (req, res) => {
  const imageURLS = await Bus.findById(req.params.id).select("imagesURLs");
  const bus = await Bus.findByIdAndDelete(req.params.id);
  if (!bus) {
    return res.sendStatus(404);
  }

  //delete bookings for the bus
  await Booking.deleteMany({ busId: req.params.id });

  //delete images
  imageURLS.imagesURLs.map(async (url) => {
    await fsPromises.unlink(`./uploads/busses/${url}`);
  });
  res.json({ message: "Bus deleted successfully" });
});

//get bus by route

//add a bus

//update bus by id

// Update bus by id
const updateBus = asyncHandler(async (req, res) => {
  const busId = req.params.id;
  const body = req.body || {};
  const files = req.files || [];

  const bus = await Bus.findById(busId);
  if (!bus) return res.status(404).json({ message: 'Bus not found' });

  // Update simple fields when provided
  if (body.routeNumber) bus.routeNumber = body.routeNumber;
  if (body.busName) bus.busName = body.busName;
  if (body.numberPlate) bus.numberPlate = body.numberPlate;
  if (body.minHalts) bus.minHalts = Number(body.minHalts);
  if (body.baseFare) bus.baseFare = Number(body.baseFare);
  if (body.totalRouteKm) bus.totalRouteKm = Number(body.totalRouteKm);
  if (body.haltStops !== undefined) {
    try {
      bus.haltStops = typeof body.haltStops === 'string'
        ? JSON.parse(body.haltStops)
        : body.haltStops;
    } catch (e) { /* ignore */ }
  }
  if (body.busType !== undefined) {
    try {
      const bt = typeof body.busType === 'string' ? JSON.parse(body.busType) : body.busType;
      bus.busType = { acType: bt.acType || 'AC', seatType: bt.seatType || 'Seater' };
      bus.markModified('busType');
    } catch (e) {}
  }

  const newCapacity = body.capacity          ? Number(body.capacity)          : bus.capacity;
  const newReserved = body.noOfAlocatedSeats !== undefined && body.noOfAlocatedSeats !== ''
                        ? Number(body.noOfAlocatedSeats)
                        : bus.noOfAlocatedSeats;

  bus.capacity          = newCapacity;
  bus.noOfAlocatedSeats = newReserved;

  try {
    if (body.BusFrom) {
      bus.busFrom = typeof body.BusFrom === 'string' ? JSON.parse(body.BusFrom) : body.BusFrom;
    }
    if (body.BusTo) {
      bus.busTo = typeof body.BusTo === 'string' ? JSON.parse(body.BusTo) : body.BusTo;
    }
    if (body.table) {
      const routeVariable = typeof body.table === 'string' ? JSON.parse(body.table) : body.table;
      if (Array.isArray(routeVariable) && routeVariable.length) bus.route = routeVariable;
    }
    if (body.selectedDays) {
      const selectedDaysVar = typeof body.selectedDays === 'string' ? JSON.parse(body.selectedDays) : body.selectedDays;
      bus.selectedDays = selectedDaysVar;
    }
  } catch (e) {
    // ignore parse errors
  }

  // ── Always sync seats with current capacity / reserved count ─────────────
  {
    const existingMap = {};
    bus.seats.forEach((s) => { existingMap[s.seatNumber] = s; });

    const freshAvail = () =>
      Array.from({ length: 30 }, (_, d) => ({
        date: dayjs().add(d, 'day').format('YYYY-MM-DD'),
        booked: bus.route.map((r) => ({ city: r.city, take: { in: 0, out: 0 } })),
      }));

    const newSeats = [];
    for (let i = 1; i <= newCapacity; i++) {
      const isReserved = i <= newReserved;
      const prev = existingMap[i];
      if (isReserved) {
        newSeats.push({ seatNumber: i, isBookable: false, availability: [] });
      } else {
        // Preserve existing availability if the seat was already bookable
        const availability =
          prev && prev.isBookable && prev.availability && prev.availability.length
            ? prev.availability
            : freshAvail();
        newSeats.push({ seatNumber: i, isBookable: true, availability });
      }
    }
    bus.seats = newSeats;
    console.log(`Seats synced: ${newCapacity} total, ${newReserved} reserved, ${newCapacity - newReserved} bookable`);
  }
  // ─────────────────────────────────────────────────────────────────────────

  // append any new images
  files.forEach((file) => {
    bus.imagesURLs.push(file.filename);
  });

  await bus.save();
  res.json({ message: 'Bus updated successfully' });
});

module.exports = { getBuses, addBus, getBus, deleteBus, updateBus };
