const Bus = require("../model/Bus");
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

  //if the date is yesterday then return empty array because buses are started its journey
  if (
    !isToday &&
    dayjs(date).format("YYYY-MM-DD") ===
      dayjs().subtract(1, "day").format("YYYY-MM-DD")
  ) {
    return res.json([]);
  }

  const buses = await Bus.find();
  if (!buses) return res.sendStatus(404);

  const busesArray = [];

  buses.forEach((bus) => {
    for (let i = 0; i < bus.route.length; i++) {
      if (bus.route[i].city === from) {
        for (let j = i + 1; j < bus.route.length; j++) {
          if (bus.route[j].city === to) {
            // Bus has this route segment — include it (availability checked per-seat below)
            busesArray.push(bus);
            break;
          }
        }
        break;
      }
    }
  });

  if (!busesArray.length) return res.sendStatus(204);

  //sorting the busesArray by departureTime at the searched city
  let sortedArray = busesArray.sort(
    (a, b) =>
      convertTimeToFloat(a.route.find((obj) => obj.city === from).departureTime) -
      convertTimeToFloat(b.route.find((obj) => obj.city === from).departureTime)
  );

  //setting the searchedDepartureTime, searchedArrivalTime, thisBusPrice, actualPrice
  for (let i = 0; i < sortedArray.length; i++) {
    let bus = sortedArray[i].toObject();
    bus.route.forEach((obj) => {
      if (obj.city === from) {
        bus = {
          ...bus,
          searchedDepartureTime: obj.departureTime,
          _fromHalts: obj.halts, // store so we can compute sub-route distance
        };
      }
      if (obj.city === to) {
        const haltsDiff = Math.max(1, obj.halts - (bus._fromHalts || 0));
        let thisBusPrice;
        if (bus.baseFare && bus.totalRouteKm) {
          // Proportional pricing: price = baseFare * (sub-route km / total route km)
          const fraction = haltsDiff / bus.totalRouteKm;
          thisBusPrice = Math.max(30, Math.round(bus.baseFare * fraction));
        } else {
          // Fallback to halts lookup table
          let actualLookup = priceByNoOfHalts[haltsDiff] ||
            priceByNoOfHalts[Object.keys(priceByNoOfHalts).reduce((a,b) =>
              Math.abs(b - haltsDiff) < Math.abs(a - haltsDiff) ? b : a)];
          thisBusPrice = haltsDiff > bus.minHalts ? actualLookup :
            (priceByNoOfHalts[bus.minHalts] || actualLookup);
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

  //remove buses when user searches for today and the bus has already departed from the searched city
  if (
    dayjs(date).format("YYYY-MM-DD") === dayjs().format("YYYY-MM-DD") &&
    isToday
  ) {
    sortedArray = sortedArray.filter((bus) => {
      return (
        convertTimeToFloat(bus.searchedDepartureTime) >=
        convertTimeToFloat(dayjs().format("HH:mm"))
      );
    });
  }

  if (!sortedArray.length) return res.sendStatus(204);

  let arrayOfBussesAfterAvailableSeatsChecking = [];
  //finding no of seats available and give property to each seat as availabilityBoolean

  for (let i = 0; i < sortedArray.length; i++) {
    let bus = sortedArray[i];
    let totalAvailableSeats = 0;

    for (let j = 0; j < bus.seats.length; j++) {
      let seat = bus.seats[j];
      seat.availabilityBoolean = 0;
      if (!seat.isBookable) {
        continue;
      }

      // all the seats are bookable. j+1 is a bookable seat
      //find the available date for the seat
      let dateEntryFound = false;
      for (let k = 0; k < seat.availability.length; k++) {
        if (seat.availability[k].date !== dayjs(date).format("YYYY-MM-DD")) {
          continue;
        }
        dateEntryFound = true;
        //this point availability date object is found. that object will be seat.availability[k]
        let booked = seat.availability[k].booked; // this is a array of objects
        //iterate through the booked array
        for (let l = 0; l < booked.length; l++) {
          //continue untill booked object.city === from
          if (booked[l].city !== from) {
            continue;
          }

          //when booked object.city === from
          if (booked[l].take.out === 0) {
            let x = l + 1;
            let isgoneThrough = 0;
            while (x < booked.length && booked[x].city !== to) {
              if (booked[x].take.in == 1 || booked[x].take.out == 1) {
                isgoneThrough = 1; //1 means taken
                break;
              } else if (booked[x].take.in == 2 || booked[x].take.out == 2) {
                isgoneThrough = 2; //2 means processing
                break;
              }
              x++;
            }
            if (!isgoneThrough) {
              seat.availabilityBoolean = 3;
              totalAvailableSeats++;
            } else if (isgoneThrough == 1) {
              seat.availabilityBoolean = 1;
            } else if (isgoneThrough == 2) {
              seat.availabilityBoolean = 2;
            }
            break;
          } else if (booked[l].take.out === 1) {
            seat.availabilityBoolean = 1; //availabilityBoolean 1 means booked
            break;
          } else if (booked[l].take.out === 2) {
            seat.availabilityBoolean = 2; //availabilityBoolean 2 means processing
            break;
          }
        }
        // No matching city in booked array = seat is free for this segment
        if (seat.availabilityBoolean === 0) {
          seat.availabilityBoolean = 3;
          totalAvailableSeats++;
        }
      }
      // No availability entry for this date at all = seat never booked = available
      if (!dateEntryFound) {
        seat.availabilityBoolean = 3;
        totalAvailableSeats++;
      }
    }
    bus = {
      ...bus,
      totalAvailableSeats,
    };
    arrayOfBussesAfterAvailableSeatsChecking.push(bus);
  }

  res.json(arrayOfBussesAfterAvailableSeatsChecking);
});

module.exports = { search };
