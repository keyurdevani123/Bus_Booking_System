const User = require("../model/User");
const bcrypt = require("bcrypt");

const handleLogin = async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  
  const foundUser = await User.findOne({ email: email }).exec();
  
  if (!foundUser) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  
  // Compare password
  const match = await bcrypt.compare(password, foundUser.password);
  
  if (match) {
    res.json({ 
      message: "Login successful", 
      user: {
        id: foundUser._id,
        name: foundUser.name,
        email: foundUser.email,
        phone: foundUser.phone
      }
    });
  } else {
    res.status(401).json({ message: "Invalid email or password" });
  }
};

module.exports = { handleLogin };
