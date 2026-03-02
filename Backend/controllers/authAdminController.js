const Admin = require("../model/Admin");
const bcrypt = require("bcrypt");

const handleLogin = async (req, res) => {
  const { username, password } = req.body;
  
  console.log("Admin login attempt:", { username });
  
  if (!username || !password) {
    console.log("Missing credentials");
    return res.status(400).json({ message: "Username and password are required" });
  }
  
  const foundUser = await Admin.findOne({ username: username }).exec();
  
  if (!foundUser) {
    console.log("Admin not found:", username);
    return res.status(401).json({ message: "Invalid username or password" });
  }
  
  console.log("Admin found, verifying password");
  
  // Compare password
  const match = await bcrypt.compare(password, foundUser.password);
  
  console.log("Password match result:", match);
  
  if (match) {
    console.log("Admin login successful:", username);
    res.json({ 
      message: "Login successful", 
      token: foundUser._id.toString(),
      admin: {
        id: foundUser._id,
        username: foundUser.username,
        email: foundUser.email,
        role: foundUser.role
      }
    });
  } else {
    console.log("Invalid password for admin:", username);
    res.status(401).json({ message: "Invalid username or password" });
  }
};

module.exports = { handleLogin };
