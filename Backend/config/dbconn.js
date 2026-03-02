const mongoose = require("mongoose");
const dns = require("dns");

// Force Node.js to use Google DNS so Atlas SRV records resolve correctly
// (fixes ECONNREFUSED on querySrv with some ISP DNS servers)
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
};

module.exports = connectDB;