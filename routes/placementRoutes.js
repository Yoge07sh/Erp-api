const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const PlacementController = require("../controllers/PlacementController");
const multer = require("multer");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

router.post("/add-placementcoordinator", authMiddleware, (req, res) => {
  PlacementController.addPlacementManager(req, res);
});

router.get("/placement-manager/list", authMiddleware, (req, res) => {
  PlacementController.getPlacementManagerList(req, res);
});

router.post(
  "/add-placement",
  authMiddleware,
  upload.single("jobDescription"),
  (req, res) => {
    PlacementController.addPlacementInformation(req, res);
  },
);

router.get("/company-info", authMiddleware, (req, res) => {
  PlacementController.getCompanyDetails(req, res);
});

module.exports = router;
