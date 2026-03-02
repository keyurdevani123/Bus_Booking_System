const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  addBus,
  getBuses,
  getBus,
  deleteBus,
} = require("../controllers/busController");

const upload = multer({ storage: multer.memoryStorage() });

router
  .post("/", upload.array("images", 4), (req, res, next) => {
    const totalSize = req.files.reduce((total, file) => total + file.size, 0);
    if (totalSize > 5 * 1024 * 1024) {
      return res.status(413).json({ message: "payload too large" });
    }
    addBus(req, res, next);
  })
  .put('/:id', upload.array('images', 4), (req, res, next) => {
    const { updateBus } = require('../controllers/busController');
    updateBus(req, res, next);
  })
  .get("/", getBuses)
  .get("/:id", getBus)
  .delete("/:id", deleteBus);

module.exports = router;
