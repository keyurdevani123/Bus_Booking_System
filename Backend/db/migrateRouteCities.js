/**
 * One-time migration: populate routeCities[] on all existing Bus documents.
 * Safe to run multiple times — uses bulkWrite with no-op if already set.
 * Usage: node Backend/db/migrateRouteCities.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]); // fix Atlas SRV on ISP DNS
const mongoose = require("mongoose");
const Bus = require("../model/Bus");

async function migrate() {
  try {
    await mongoose.connect(process.env.DATABASE_URI);
    console.log("Connected to MongoDB");

    const buses = await Bus.find().select("route routeCities").lean();
    if (!buses.length) {
      console.log("No buses found.");
      return;
    }

    const ops = buses.map((bus) => ({
      updateOne: {
        filter: { _id: bus._id },
        update: { $set: { routeCities: bus.route.map((r) => r.city) } },
      },
    }));

    const result = await Bus.bulkWrite(ops);
    console.log(`Updated ${result.modifiedCount} / ${buses.length} buses with routeCities.`);
  } catch (err) {
    console.error("Migration error:", err.message);
  } finally {
    await mongoose.disconnect();
  }
}

migrate();
