const Bus = require("../model/Bus");
const SeatAvailability = require("../model/SeatAvailability");
const Booking = require("../model/Booking");
const asyncHandler = require("express-async-handler");
const dayjs = require("dayjs");

const getAllAuthBusesController = asyncHandler(async (req, res) => {
  const company = req.body.company;
  const buses = await Bus.find({ busName: company })
    .select("routeNumber busFrom busTo numberPlate seats _id")
    .lean();

  if (!buses) {
    return res.sendStatus(404);
  }
  if (!buses.length) {
    return res.sendStatus(204);
  }

  const today = dayjs().format("YYYY-MM-DD");

  // A bus runs today if it has at least one SeatAvailability doc for today
  const busIds = buses.map((b) => b._id);
  const todayDocs = await SeatAvailability.find({ busId: { $in: busIds }, date: today })
    .distinct("busId");

  const todayBusIdSet = new Set(todayDocs.map(String));
  const busesWithTodayBookings = buses.filter((b) => todayBusIdSet.has(String(b._id)));

  if (!busesWithTodayBookings.length) {
    return res.sendStatus(204);
  }

  const busesWithTodayBookingsAndDetails = [];
  for (const bus of busesWithTodayBookings) {
    const bookings = await Booking.find({ busId: bus._id, mappedDate: today });
    bus.noOfBookings = bookings.length;
    bus.haveToCheck = bookings.reduce((acc, b) => acc + (b.isChecked ? 0 : 1), 0);
    busesWithTodayBookingsAndDetails.push(bus);
  }

  console.log(busesWithTodayBookingsAndDetails);
  res.json(busesWithTodayBookingsAndDetails);
});

module.exports = getAllAuthBusesController;
