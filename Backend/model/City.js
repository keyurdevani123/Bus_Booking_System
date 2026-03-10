const mongoose = require("mongoose");

// Master city collection — seeded via db/seedCities.js
const citySchema = new mongoose.Schema({
  name:     { type: String, required: true, unique: true },
  state:    { type: String, required: true },
  district: { type: String, default: "" },
  region:   { type: String, default: "" }, // e.g. "North Gujarat", "Saurashtra", "Kutch"
});

citySchema.index({ state: 1, region: 1 });

module.exports = mongoose.model("City", citySchema);
