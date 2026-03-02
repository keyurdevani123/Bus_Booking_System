const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'moderator'],
    default: 'admin',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },
});
module.exports = mongoose.model("Admin", adminSchema);
