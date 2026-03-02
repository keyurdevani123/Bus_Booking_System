const asyncHandler = require("express-async-handler");
const Bus = require("../model/Bus");
const CITY_ROUTE = require("../utils/cityRoute");
const getAllCities = asyncHandler(async (req, res) => {
  const buses = await Bus.find().select("route busFrom busTo").lean();
  const citySet = new Set();
  // Always include all predefined cities — works even when no buses are in DB yet
  CITY_ROUTE.forEach(c => citySet.add(c.city));
  // Also include any cities from manually-added buses not in the master list
  if (buses && buses.length) {
    buses.forEach((bus) => {
      if (bus.busFrom?.city) citySet.add(bus.busFrom.city);
      if (bus.busTo?.city) citySet.add(bus.busTo.city);
      (bus.route || []).forEach((stop) => {
        if (stop.city) citySet.add(stop.city);
      });
    });
  }
  const cities = Array.from(citySet).sort();
  res.json(cities);
});

module.exports = getAllCities;
