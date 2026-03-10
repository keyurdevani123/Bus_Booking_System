const mongoose = require("mongoose");

const pendingPaymentSchema = new mongoose.Schema({
  tempBookId: { type: String, required: true, unique: true, index: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now, expires: 900 }, // auto-delete after 15 minutes
});

module.exports = mongoose.model("PendingPayment", pendingPaymentSchema);
