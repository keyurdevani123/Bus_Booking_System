const paymentStore = require("../db/store");
const dayjs = require("dayjs");
const SeatAvailability = require("../model/SeatAvailability");
const convertTimeToFloat = require("./convertTimeToFloat");

const resolveAvailDate = (date, busDepartureTime, departureTime) => {
  if (convertTimeToFloat(busDepartureTime) <= convertTimeToFloat(departureTime)) {
    return date;
  }
  return dayjs(date).subtract(1, "day").format("YYYY-MM-DD");
};

async function checkTimeOut() {
  console.log("checking for timeout at", new Date());
  const currentTime = dayjs();

  for (const key in paymentStore) {
    const { createdAt } = paymentStore[key];
    const createdAtTime = dayjs(createdAt);

    if (currentTime.diff(createdAtTime, "minute") > 5) {
      const { busId, seats, date, from, to, busDepartureTime, departureTime } =
        paymentStore[key];

      const seatNumbers = seats.split(",").map(Number);
      const availDate = resolveAvailDate(date, busDepartureTime, departureTime);

      const availDocs = await SeatAvailability.find({
        busId,
        date: availDate,
        seatNumber: { $in: seatNumbers },
      });

      for (const avail of availDocs) {
        for (let j = 0; j < avail.booked.length; j++) {
          if (avail.booked[j].city !== from) continue;

          avail.booked[j].take.out = 0;

          for (let k = j + 1; k < avail.booked.length; k++) {
            if (avail.booked[k].city === to) {
              avail.booked[k].take.in = 0;
              break;
            }
            avail.booked[k].take.in = 0;
            avail.booked[k].take.out = 0;
          }
          break;
        }
        if (!avail.isModified()) continue; // skip save if nothing changed
        await avail.save();
      }

      console.log("Timeout", key);
      delete paymentStore[key];
    }
  }
}

function sheduler() {
  console.log("sheduler running");
  setInterval(checkTimeOut, 1 * 30 * 1000);
}

module.exports = sheduler;
