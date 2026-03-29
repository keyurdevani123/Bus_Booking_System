const Bus = require("../model/Bus");
const SeatAvailability = require("../model/SeatAvailability");
const asyncHandler = require("express-async-handler");

const priceByNoOfHalts = require("../utils/priceByNoOfHalts");
const dayjs = require("dayjs");
const convertTimeToFloat = require("../utils/convertTimeToFloat");

const search = asyncHandler(async (req, res) => {
  const { from, to, date, isToday } = req.body;

  if (!from || !to || !date)
    return res.status(400).json({ message: "Missing fields" });

  if (from === to)
    return res.status(400).json({ message: "From and To cannot be the same" });

  if (isToday && dayjs(date).isBefore(dayjs(), "day"))
    return res.status(400).json({ message: "Past dates cannot be booked" });

  // Yesterday's buses have already departed — nothing to show
  if (
    !isToday &&
    dayjs(date).format("YYYY-MM-DD") ===
      dayjs().subtract(1, "day").format("YYYY-MM-DD")
  ) {
    return res.json([]);
  }

  // ── 1. Load only buses whose route covers both cities (indexed lookup) ──────
  // routeCities is a denormalized [String] array kept in sync by Bus pre-save hook.
  // This pushes filtering to MongoDB (index scan) instead of loading all buses.
  const buses = await Bus.find({ routeCities: { $all: [from, to] } }).lean();
  if (!buses) return res.sendStatus(404);

  // ── 2. Keep only buses whose route covers from → to (from before to) ───────
  const busesArray = [];
  buses.forEach((bus) => {
    for (let i = 0; i < bus.route.length; i++) {
      if (bus.route[i].city === from) {
        for (let j = i + 1; j < bus.route.length; j++) {
          if (bus.route[j].city === to) {
            busesArray.push(bus);
            break;
          }
        }
        break;
      }
    }
  });

  if (!busesArray.length) return res.sendStatus(204);

  // ── 3. Sort by departure time from the searched city ──────────────────────
  let sortedArray = busesArray.sort(
    (a, b) =>
      convertTimeToFloat(a.route.find((obj) => obj.city === from).departureTime) -
      convertTimeToFloat(b.route.find((obj) => obj.city === from).departureTime)
  );

  // ── 4. Enrich each bus with price, searched departure/arrival times ────────
  for (let i = 0; i < sortedArray.length; i++) {
    let bus = sortedArray[i];
    bus.route.forEach((obj) => {
      if (obj.city === from) {
        bus = {
          ...bus,
          searchedDepartureTime: obj.departureTime,
          _fromHalts: obj.halts,
        };
      }
      if (obj.city === to) {
        const haltsDiff = Math.max(1, obj.halts - (bus._fromHalts || 0));
        let thisBusPrice;
        if (bus.baseFare && bus.totalRouteKm) {
          const fraction = haltsDiff / bus.totalRouteKm;
          thisBusPrice = Math.max(30, Math.round(bus.baseFare * fraction));
        } else {
          let actualLookup =
            priceByNoOfHalts[haltsDiff] ||
            priceByNoOfHalts[
              Object.keys(priceByNoOfHalts).reduce((a, b) =>
                Math.abs(b - haltsDiff) < Math.abs(a - haltsDiff) ? b : a
              )
            ];
          thisBusPrice =
            haltsDiff > bus.minHalts
              ? actualLookup
              : priceByNoOfHalts[bus.minHalts] || actualLookup;
        }
        bus = {
          ...bus,
          searchedArrivalTime: obj.arrivalTime,
          thisBusPrice,
          actualPrice: thisBusPrice,
          searchedHalts: haltsDiff,
        };
      }
    });
    sortedArray[i] = bus;
  }

  // ── 5. Drop buses that have already departed (today searches only) ─────────
  if (dayjs(date).format("YYYY-MM-DD") === dayjs().format("YYYY-MM-DD")) {
    sortedArray = sortedArray.filter(
      (bus) =>
        convertTimeToFloat(bus.searchedDepartureTime) >
        convertTimeToFloat(dayjs().format("HH:mm"))
    );
  }

  if (!sortedArray.length) return res.sendStatus(204);

  // ── 6. Fetch SeatAvailability for all matched buses on the searched date ───
  // Single targeted query instead of loading all embedded arrays
  const dateStr = dayjs(date).format("YYYY-MM-DD");
  const busIds = sortedArray.map((b) => b._id);
  const availDocs = await SeatAvailability.find({
    busId: { $in: busIds },
    date: dateStr,
  }).lean();

  // Build map: `${busId}_${seatNumber}` → booked[]
  const availMap = {};
  availDocs.forEach((doc) => {
    availMap[`${doc.busId}_${doc.seatNumber}`] = doc.booked;
  });

  // ── 7. Compute availabilityBoolean per seat, count free seats ─────────────
  const result = sortedArray.map((bus) => {
    const busIdStr = String(bus._id);
    let totalAvailableSeats = 0;

    const enrichedSeats = (bus.seats || []).map((seat) => {
      const s = { ...seat };
      s.availabilityBoolean = 0;
      if (!s.isBookable) return s;

      const booked = availMap[`${busIdStr}_${s.seatNumber}`];
      if (!booked) {
        // No availability doc for this date → seat is open (or date not yet unlocked)
        s.availabilityBoolean = 3;
        totalAvailableSeats++;
        return s;
      }

      for (let l = 0; l < booked.length; l++) {
        if (booked[l].city !== from) continue;

        if (booked[l].take.out === 0) {
          // Check intermediate stops for conflicts
          let x = l + 1;
          let isgoneThrough = 0;
          while (x < booked.length && booked[x].city !== to) {
            if (booked[x].take.in == 1 || booked[x].take.out == 1) {
              isgoneThrough = 1;
              break;
            } else if (booked[x].take.in == 2 || booked[x].take.out == 2) {
              isgoneThrough = 2;
              break;
            }
            x++;
          }
          if (!isgoneThrough) {
            s.availabilityBoolean = 3;
            totalAvailableSeats++;
          } else if (isgoneThrough === 1) {
            s.availabilityBoolean = 1;
          } else if (isgoneThrough === 2) {
            s.availabilityBoolean = 2;
          }
        } else if (booked[l].take.out === 1) {
          s.availabilityBoolean = 1;
        } else if (booked[l].take.out === 2) {
          s.availabilityBoolean = 2;
        }
        break;
      }

      // `from` city not in booked array → seat has no bookings for any segment → free
      if (s.availabilityBoolean === 0) {
        s.availabilityBoolean = 3;
        totalAvailableSeats++;
      }

      return s;
    });

    return { ...bus, seats: enrichedSeats, totalAvailableSeats };
  });

  res.json(result);
});

module.exports = { search };
