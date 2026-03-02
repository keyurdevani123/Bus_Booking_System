const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  getCheckers,
  addChecker,
  deleteChecker,
} = require("../controllers/checkerController");

const upload = multer({ storage: multer.memoryStorage() });

router.get("/", getCheckers);
router.post("/", upload.single("image"), addChecker);
router.delete("/:id", deleteChecker);

module.exports = router;
