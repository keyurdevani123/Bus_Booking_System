const cron = require("node-cron");
const Bus = require("../model/Bus");
const SeatAvailability = require("../model/SeatAvailability");
const asyncHandler = require("express-async-handler");
const dayjs = require("dayjs");
const weekdayOrWeekendFinder = require("../utils/weekdayOrWeekendFinder");
const Booking = require("../model/Booking");
const Waitlist = require("../model/Waitlist");
const fsPromises = require("fs").promises;
const os = require("os");

const bookingOpen = asyncHandler(async () => {
  // Load buses — tiny now that seats carry no availability
  const buses = await Bus.find()
    .select("_id route selectedDays freezedDays seats")
    .lean();
  if (!buses || !buses.length) return;

  const saOps = [];

  for (const bus of buses) {
    const bookableSeats = bus.seats.filter((s) => s.isBookable);
    if (!bookableSeats.length) continue;

    const routeBooked = bus.route.map((r) => ({
      city: r.city,
      take: { in: 0, out: 0 },
    }));

    for (let i = 0; i < 4; i++) {
      const d = dayjs().add(i, "day");
      const dateStr = d.format("YYYY-MM-DD");

      if (!bus.selectedDays[weekdayOrWeekendFinder(d)]) continue;
      if (bus.freezedDays && bus.freezedDays.includes(dateStr)) continue;

      for (const seat of bookableSeats) {
        saOps.push({
          updateOne: {
            filter: { busId: bus._id, date: dateStr, seatNumber: seat.seatNumber },
            update: {
              // $setOnInsert: only sets fields when the doc is NEW — existing bookings are untouched
              $setOnInsert: { booked: routeBooked },
            },
            upsert: true,
          },
        });
      }
    }
  }

  // Remove stale availability docs (older than 2 days before today)
  const cutoff = dayjs().subtract(2, "day").format("YYYY-MM-DD");
  await SeatAvailability.deleteMany({ date: { $lt: cutoff } });

  if (saOps.length) {
    await SeatAvailability.bulkWrite(saOps, { ordered: false });
    console.log(`bookingOpen: ${saOps.length} seat-date slots ensured`);
  }
});

//delete the booking after 3 days
const deleteBooking = asyncHandler(async () => {
  const threeDaysAgo = dayjs().subtract(3, "day").format("YYYY-MM-DD");
  await Booking.deleteMany({ mappedDate: threeDaysAgo });
  console.log(`Deleted all bookings before ${threeDaysAgo}`);
});

//delete freeze days after 3 days — runs entirely on MongoDB, no docs loaded into Node
const deleteFreezeDays = asyncHandler(async () => {
  // Keep only dates that are >= 3 days ago (YYYY-MM-DD strings compare correctly lexicographically)
  const cutoff = dayjs().subtract(3, "day").format("YYYY-MM-DD");
  await Bus.updateMany(
    { freezedDays: { $exists: true, $ne: [] } },
    [
      {
        $set: {
          freezedDays: {
            $filter: {
              input: "$freezedDays",
              as: "d",
              cond: { $gt: ["$$d", cutoff] },
            },
          },
        },
      },
    ]
  );
});

//delete pdfs after 3 days
const deletePDFs = async () => {
  const threeDaysAgo = dayjs().subtract(3, "day").format("YYYY-MM-DD");
  const tmpDir = os.tmpdir();
  const files = await fsPromises.readdir(tmpDir);
  const pdfFiles = files.filter((f) => f.endsWith(".pdf"));
  pdfFiles.forEach(async (file) => {
    if (file.includes(threeDaysAgo)) {
      console.log(`Deleted ${file}`);
      await fsPromises.unlink(require("path").join(tmpDir, file));
    }
  });
};

// Expire waitlist entries whose travel date has already passed
// (handles both 'waiting' and 'notified' — if the date passed they'll never book)
const expireWaitlist = asyncHandler(async () => {
  const today = dayjs().format("YYYY-MM-DD");
  const result = await Waitlist.updateMany(
    { date: { $lt: today }, status: { $in: ["waiting", "notified"] } },
    { $set: { status: "expired" } }
  );
  if (result.modifiedCount > 0) {
    console.log(`Expired ${result.modifiedCount} waitlist entries for past dates.`);
  }
});

const task1 = cron.schedule(
  "48 08 * * *",
  () => {
    bookingOpen();
    deleteBooking();
    deleteFreezeDays();
    deletePDFs();
    expireWaitlist();
    console.log(
      `Booking open until ${dayjs().add(3, "day").format("YYYY-MM-DD")}`
    );
  },
  {
    scheduled: false,
    timezone: "Asia/Kolkata",
  }
);

module.exports = {
  task1,
  bookingOpen,
};
