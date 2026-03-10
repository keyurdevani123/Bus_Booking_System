/**
 * migrate-availability.js
 * ─────────────────────────────────────────────────────────────────────────────
 * ONE-TIME migration: pulls the embedded seats[].availability[] data out of
 * every Bus document and writes it into the new SeatAvailability collection.
 *
 * Run BEFORE deploying the updated server code:
 *   node Backend/migrate-availability.js
 *
 * Safe to run multiple times — uses upsert so it won't duplicate documents.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require("dotenv").config({ path: __dirname + "/Backend/.env" });
const mongoose = require("mongoose");

// ── Inline old Bus schema so migration works even after seats.availability ──
// is removed from the live Bus.js schema.
const oldBusSchema = new mongoose.Schema(
  {
    seats: [
      {
        seatNumber: Number,
        isBookable: Boolean,
        availability: [
          {
            date: String,
            booked: [
              {
                city: String,
                take: { in: { type: Number, default: 0 }, out: { type: Number, default: 0 } },
              },
            ],
          },
        ],
      },
    ],
  },
  { strict: false }
);
const OldBus = mongoose.model("BusMigration", oldBusSchema, "buses");

const SeatAvailability = require(__dirname + "/Backend/model/SeatAvailability");

async function migrate() {
  await mongoose.connect(process.env.DATABASE_URI);
  console.log("Connected to MongoDB");

  const buses = await OldBus.find().lean();
  console.log(`Found ${buses.length} buses to migrate`);

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const bus of buses) {
    const ops = [];

    for (const seat of bus.seats || []) {
      if (!seat.isBookable) continue;

      for (const avail of seat.availability || []) {
        if (!avail.date || !avail.booked) continue;

        ops.push({
          updateOne: {
            filter: { busId: bus._id, date: avail.date, seatNumber: seat.seatNumber },
            update: {
              $setOnInsert: {
                busId: bus._id,
                date: avail.date,
                seatNumber: seat.seatNumber,
                booked: avail.booked,
              },
            },
            upsert: true,
          },
        });
      }
    }

    if (!ops.length) {
      console.log(`  Bus ${bus._id}: no availability to migrate`);
      continue;
    }

    const result = await SeatAvailability.bulkWrite(ops, { ordered: false });
    totalCreated += result.upsertedCount;
    totalSkipped += result.matchedCount;
    console.log(
      `  Bus ${bus._id}: ${result.upsertedCount} created, ${result.matchedCount} already existed`
    );
  }

  console.log(`\nMigration complete: ${totalCreated} SeatAvailability docs created, ${totalSkipped} skipped`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
