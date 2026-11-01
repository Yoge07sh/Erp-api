const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const PlacementController = require("../controllers/PlacementController");
const multer = require('multer')
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

router.post("/add-placementcoordinator", authMiddleware, (req, res) => {
  PlacementController.addPlacementManager(req, res);
});

router.post("/add-placement", authMiddleware, upload.single("jobDescription"),(req,res)=>{
 PlacementController.addPlacementInformation(req,res);
});
module.exports = router;
