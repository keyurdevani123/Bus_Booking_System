const Checker = require("../model/Checker");
const bcrypt = require("bcrypt");

const handleLogin = async (req, res) => {
  const { user, pwd } = req.body;
  
  if (!user || !pwd) {
    return res.status(400).json({ message: "Username and password are required" });
  }
  
  const foundUser = await Checker.findOne({ name: user }).exec();
  
  if (!foundUser) {
    return res.status(401).json({ message: "Invalid username or password" });
  }
  
  // Compare password
  const match = await bcrypt.compare(pwd, foundUser.password);
  
  if (match) {
    res.json({
      message: "Login successful",
      token: foundUser._id.toString(), // Generate token from user ID
      checker: {
        id: foundUser._id,
        name: foundUser.name,
        email: foundUser.email,
        companyName: foundUser.companyName,
        telephone: foundUser.telephone
      }
    });
  } else {
    res.status(401).json({ message: "Invalid username or password" });
  }
};

module.exports = { handleLogin };
