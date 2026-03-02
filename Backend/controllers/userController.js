const User = require("../model/User");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");

// Get all users
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password").lean();

  if (!users) {
    return res.sendStatus(404);
  }
  if (!users.length) {
    return res.sendStatus(204);
  }
  res.json(users);
});

// Register a new user
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password || !phone) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Check if user already exists
  const userExists = await User.findOne({ email });

  if (userExists) {
    return res.status(409).json({ message: "User already exists with this email" });
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = new User({
    name,
    email,
    password: hashedPassword,
    phone,
  });

  await user.save();

  res.status(201).json({ 
    message: "User registered successfully", 
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone
    }
  });
});

// Get user by ID
const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  const user = await User.findById(id).select("-password");
  
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(user);
});

// Update user
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, password } = req.body;
  
  if (!id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  const user = await User.findById(id);
  
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (name) user.name = name;
  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (password) {
    user.password = await bcrypt.hash(password, 10);
  }

  await user.save();

  res.json({ 
    message: "User updated successfully",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone
    }
  });
});

// Delete user
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  const user = await User.findById(id);
  
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  await User.findByIdAndDelete(id);

  res.status(200).json({ message: "User deleted successfully" });
});

module.exports = { 
  getUsers, 
  registerUser, 
  getUserById, 
  updateUser, 
  deleteUser 
};
