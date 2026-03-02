const express = require("express");
const router = express.Router();
const { handleLogin } = require("../controllers/authUserController");

router.post("/", handleLogin);

module.exports = router;
