require("dotenv").config();
const { logger } = require("./middleware/logEvents");
const errorHandle = require("./middleware/errorHandle");
const express = require("express");
const path = require("path");
const cors = require("cors");
const corsOptions = require("./config/corsOptions");
const connectDB = require("./config/dbconn");
const mongoose = require("mongoose");
const { task1, bookingOpen } = require("./jobs/DailyJob");
const { checkNotificationTimeouts } = require("./controllers/waitlistController");
const Admin = require("./model/Admin");
const bcrypt = require("bcrypt");
const sheduler = require("./utils/timeCheck");

const fs = require("fs");

// Start the cron job
task1.start();

// On startup: ensure SeatAvailability docs exist for the next 4 days
// (covers the gap when server restarts between daily cron runs)
mongoose.connection.once("open", () => {
  bookingOpen().catch((e) => console.error("bookingOpen startup error:", e));
});

// Check every 2 minutes: expire 30-min waitlist windows and notify next person
setInterval(checkNotificationTimeouts, 2 * 60 * 1000);

const PORT = process.env.PORT || 3200;
const app = express();

connectDB();

// Keep Atlas free-tier from auto-pausing (pings every 4 minutes)
mongoose.connection.once("open", () => {
  setInterval(async () => {
    try { await mongoose.connection.db.admin().ping(); } catch (_) {}
  }, 4 * 60 * 1000);
});

app.use(logger);
app.use(cors(corsOptions));

// Start the sheduler
sheduler();
// Middleware to capture raw body
const rawBodyMiddleware = (req, res, next) => {
  req.rawBody = "";
  req.on("data", (chunk) => {
    req.rawBody += chunk;
  });
  req.on("end", () => {
    next();
  });
};

// Apply the raw body middleware to the /webhook route
app.use("/webhook", rawBodyMiddleware, require("./routes/webhook"));

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, service: "backend", uptime: process.uptime() });
});

// Serve React frontend build if it exists (run `npm run build` in Frontend/ first)
const frontendBuildPath = path.join(__dirname, "..", "Frontend", "build");
if (require("fs").existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
}



app.use("/", require("./routes/root"));
app.use("/auth/admin", require("./routes/authAdmin"));
app.use("/auth/user", require("./routes/authUser"));
app.use("/auth", require("./routes/passwordReset"));
app.use("/bus", require("./routes/bus"));
app.use("/cities", require("./routes/api/getAllCities"));
// Backwards-compatible API paths used by frontend
app.use("/api/getAllCities", require("./routes/api/getAllCities"));
app.use("/api/cityRoute", require("./routes/api/getCityRoute"));
app.use("/search", require("./routes/search"));
app.use("/booking", require("./routes/booking"));
app.use("/waitlist", require("./routes/waitlist"));
//app.use("/completebooking", require("./routes/bookingcomplete"));
app.use("/companies", require("./routes/api/getAllBusComapnies"));
app.use("/api/getAllBusCompanies", require("./routes/api/getAllBusComapnies"));
app.use("/admins", require("./routes/admin"));
app.use("/users", require("./routes/user"));
app.use("/authBuses", require("./routes/api/getAuthBuses"));
app.use("/api/getAuthBuses", require("./routes/api/getAuthBuses"));

app.all("*", (req, res) => {
  // For any browser GET, serve React SPA so React Router handles all client-side routes
  const frontendIndex = path.join(__dirname, "public", "index.html");
  if (req.method === "GET" && req.accepts("html") && require("fs").existsSync(frontendIndex)) {
    return res.sendFile(frontendIndex);
  }
  res.status(404);
  if (req.accepts("json")) {
    res.json({ error: "Not found" });
  } else {
    res.type("txt").send("Not found");
  }
});

app.use(errorHandle);

mongoose.connection.once("open", () => {
  console.log("Database connected");

  // ── Startup: release any seats stuck in "processing" (take=2) ────────────
  // Runs entirely in MongoDB via SeatAvailability collection.
  const releaseStuckProcessingSeats = async () => {
    try {
      const SeatAvailability = require("./model/SeatAvailability");
      const r1 = await SeatAvailability.updateMany(
        { "booked.take.in": 2 },
        { $set: { "booked.$[b].take.in": 0 } },
        { arrayFilters: [{ "b.take.in": 2 }] }
      );
      const r2 = await SeatAvailability.updateMany(
        { "booked.take.out": 2 },
        { $set: { "booked.$[b].take.out": 0 } },
        { arrayFilters: [{ "b.take.out": 2 }] }
      );
      const total = (r1.modifiedCount || 0) + (r2.modifiedCount || 0);
      console.log(`Startup cleanup: released stuck processing seats in ${total} SeatAvailability doc(s).`);
    } catch (err) {
      console.error("Startup cleanup error:", err);
    }
  };
  releaseStuckProcessingSeats();
  // ─────────────────────────────────────────────────────────────────────────

  //it should create admin if not exists
  const createAdmin = async () => {
    try {
      const admin = await Admin.findOne({ username: "admin" }).exec();
      if (!admin) {
        const hash = bcrypt.hashSync("00000", 10);
        const newAdmin = new Admin({
          username: "admin",
          email: "admin@eticket.com",
          password: hash,
          role: 'super_admin',
        });
        await newAdmin.save();
        console.log("Default admin created successfully with role: super_admin");
      } else {
        console.log("Admin already exists");
      }
    } catch (error) {
      console.error("Error creating admin:", error);
    }
  };
  createAdmin();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

console.log("Environment variables loaded");
