const Admin = require("../model/Admin");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");

// Get all admins
const getAdmins = asyncHandler(async (req, res) => {
  const admins = await Admin.find().select("-password").lean();

  if (!admins) {
    return res.sendStatus(404);
  }
  if (!admins.length) {
    return res.sendStatus(204);
  }
  res.json(admins);
});

// Create a new admin with role
const createAdmin = asyncHandler(async (req, res) => {
  const { username, email, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  // Validate role
  const validRoles = ['super_admin', 'admin', 'moderator'];
  const adminRole = role && validRoles.includes(role) ? role : 'admin';

  // Check if admin already exists
  const adminExists = await Admin.findOne({ username });

  if (adminExists) {
    return res.status(409).json({ message: "Admin already exists" });
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const admin = new Admin({
    username,
    email: email || '',
    password: hashedPassword,
    role: adminRole,
  });

  await admin.save();

  res.status(201).json({ 
    message: "Admin created successfully", 
    admin: {
      id: admin._id,
      username: admin.username,
      email: admin.email,
      role: admin.role
    }
  });
});

// Delete an admin
const deleteAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ message: "Admin ID is required" });
  }

  const admin = await Admin.findById(id);
  
  if (!admin) {
    return res.status(404).json({ message: "Admin not found" });
  }

  await Admin.findByIdAndDelete(id);

  res.status(200).json({ message: "Admin deleted successfully" });
});

// Update admin role
const updateAdminRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!id) {
    return res.status(400).json({ message: "Admin ID is required" });
  }

  const validRoles = ['super_admin', 'admin', 'moderator'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid role. Valid roles are: super_admin, admin, moderator" });
  }

  const admin = await Admin.findByIdAndUpdate(
    id,
    { role },
    { new: true }
  ).select("-password");

  if (!admin) {
    return res.status(404).json({ message: "Admin not found" });
  }

  res.json({ message: "Admin role updated successfully", admin });
});

module.exports = { 
  getAdmins, 
  createAdmin, 
  deleteAdmin,
  updateAdminRole 
};
