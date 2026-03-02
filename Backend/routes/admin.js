const express = require("express");
const router = express.Router();
const { 
  getAdmins, 
  createAdmin, 
  deleteAdmin,
  updateAdminRole
} = require("../controllers/adminController");

router.get("/", getAdmins);
router.post("/", createAdmin);
router.put("/:id/role", updateAdminRole);
router.delete("/:id", deleteAdmin);

module.exports = router;
