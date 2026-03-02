require("dotenv").config();
const { logger } = require("./middleware/logEvents");
const errorHandle = require("./middleware/errorHandle");
const express = require("express");
const path = require("path");
const cors = require("cors");
const corsOptions = require("./config/corsOptions");
const connectDB = require("./config/dbconn");
const mongoose = require("mongoose");
const { task1 } = require("./jobs/DailyJob");
const Admin = require("./model/Admin");
const bcrypt = require("bcrypt");
const sheduler = require("./utils/timeCheck");

const fs = require("fs");

// Start the cron job
task1.start();

const PORT = process.env.PORT || 3200;
const app = express();

connectDB();
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

// Serve React frontend build if it exists
const frontendBuildPath = path.join(__dirname, "..", "E-Ticket-Frontend", "build");
if (require("fs").existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
}



app.use("/", require("./routes/root"));
app.use("/auth/checker", require("./routes/authChecker"));
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
//app.use("/completebooking", require("./routes/bookingcomplete"));
app.use("/companies", require("./routes/api/getAllBusComapnies"));
app.use("/api/getAllBusCompanies", require("./routes/api/getAllBusComapnies"));
app.use("/checkers", require("./routes/checker"));
app.use("/admins", require("./routes/admin"));
app.use("/users", require("./routes/user"));
app.use("/authBuses", require("./routes/api/getAuthBuses"));
app.use("/api/getAuthBuses", require("./routes/api/getAuthBuses"));

app.all("*", (req, res) => {
  const frontendIndex = path.join(__dirname, "..", "E-Ticket-Frontend", "build", "index.html");
  // For any browser GET (Accept: text/html), serve the React SPA so React Router handles routing
  if (req.method === "GET" && req.accepts("html") && require("fs").existsSync(frontendIndex)) {
    return res.sendFile(frontendIndex);
  }
  res.status(404);
  if (req.accepts("html")) {
    res.sendFile(path.join(__dirname, "views", "404.html"));
  } else if (req.accepts("json")) {
    res.json({ error: "Page not found" });
  } else {
    res.type("txt").send("Page not found");
  }
});

app.use(errorHandle);

mongoose.connection.once("open", () => {
  console.log("Database connected");

  // ── Startup: release any seats stuck in "processing" (take=2) ────────────
  // These are seats marked processing before the 5-min timeout was introduced,
  // or from sessions that crashed before the timeout could fire.
  const releaseStuckProcessingSeats = async () => {
    try {
      const Bus = require("./model/Bus");
      const buses = await Bus.find({}).lean(false); // full docs
      let totalReleased = 0;
      for (const bus of buses) {
        let changed = false;
        for (const seat of bus.seats) {
          for (const avail of seat.availability || []) {
            for (const b of avail.booked || []) {
              if (b.take && b.take.in === 2) { b.take.in = 0; changed = true; totalReleased++; }
              if (b.take && b.take.out === 2) { b.take.out = 0; changed = true; }
            }
          }
        }
        if (changed) await bus.save();
      }
      if (totalReleased > 0)
        console.log(`Startup cleanup: released ${totalReleased} stuck processing seat entries.`);
      else
        console.log("Startup cleanup: no stuck processing seats found.");
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

console.log("ENV loaded:", process.env.DATABASE_URI);
