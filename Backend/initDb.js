require("dotenv").config();
const mongoose = require("mongoose");
const Admin = require("./model/Admin");
const Booking = require("./model/Booking");
const Bus = require("./model/Bus");
const Checker = require("./model/Checker");

const initializeDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DATABASE_URI);
    console.log("Connected to MongoDB");

    // Create collections by accessing model schema
    // This will create empty collections if they don't exist
    await Admin.collection.insertOne({
      _id: new mongoose.Types.ObjectId(),
      username: "admin",
      password: "placeholder",
      __v: 0
    }).catch(err => {
      if (err.code === 11000) console.log("Admin collection already exists");
      else throw err;
    }).then(result => {
      if (result) {
        console.log("✓ Admin collection created");
        return Admin.collection.deleteOne({ username: "admin" });
      }
    });

    await Booking.collection.insertOne({
      _id: new mongoose.Types.ObjectId(),
      busId: "placeholder",
      id: "placeholder",
      email: "placeholder",
      phone: 0,
      date: "placeholder",
      randomNumber: "placeholder",
      seats: [],
      isChecked: false,
      mappedDate: "placeholder",
      from: "placeholder",
      to: "placeholder",
      departureTime: "placeholder",
      arrivalTime: "placeholder",
      __v: 0
    }).catch(err => {
      if (err.code === 11000) console.log("Booking collection already exists");
      else throw err;
    }).then(result => {
      if (result) {
        console.log("✓ Booking collection created");
        return Booking.collection.deleteOne({ busId: "placeholder" });
      }
    });

    await Bus.collection.insertOne({
      _id: new mongoose.Types.ObjectId(),
      routeNumber: "placeholder",
      busName: "placeholder",
      capacity: 0,
      noOfAlocatedSeats: 0,
      busFrom: {
        city: "placeholder",
        departureTime: "placeholder"
      },
      busTo: {
        city: "placeholder",
        arrivalTime: "placeholder"
      },
      numberPlate: "placeholder",
      route: [],
      __v: 0
    }).catch(err => {
      if (err.code === 11000) console.log("Bus collection already exists");
      else throw err;
    }).then(result => {
      if (result) {
        console.log("✓ Bus collection created");
        return Bus.collection.deleteOne({ routeNumber: "placeholder" });
      }
    });

    await Checker.collection.insertOne({
      _id: new mongoose.Types.ObjectId(),
      name: "placeholder",
      password: "placeholder",
      email: "placeholder",
      companyName: "placeholder",
      telephone: "placeholder",
      url: "placeholder",
      __v: 0
    }).catch(err => {
      if (err.code === 11000) console.log("Checker collection already exists");
      else throw err;
    }).then(result => {
      if (result) {
        console.log("✓ Checker collection created");
        return Checker.collection.deleteOne({ name: "placeholder" });
      }
    });

    console.log("\n✅ All collections initialized successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Error initializing database:", err);
    process.exit(1);
  }
};

initializeDatabase();
