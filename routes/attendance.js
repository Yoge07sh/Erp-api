const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const AttendanceController = require("../controllers/AttendanceController");
const authMiddleware = require("../middleware/authMiddleware");
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

router.get("/getfacultymappings", authMiddleware, (req, res) => {
  AttendanceController.getFacultyMappings(req, res);
});

router.get("/getstudentsdata", authMiddleware, (req, res) => {
  AttendanceController.getStudentsData(req, res);
});
router.post("/attendance", authMiddleware, (req, res) => {
  AttendanceController.submitAttendance(req, res);
});
router.get("/viewattendance", authMiddleware, (req, res) => {
  AttendanceController.viewAttendance(req, res);
});
router.put("/edit/attendance", authMiddleware, (req, res) => {
  AttendanceController.updateAttendance(req, res);
});

router.get("/eregister", authMiddleware, (req, res) => {
  AttendanceController.getEregister(req, res);
});

router.get("/attendance/dashboard", authMiddleware, AttendanceController.getAttendanceDashboard);

router.get("/my/attendance", authMiddleware, (req, res) => {
  AttendanceController.getMyAttendance(req, res);
});


module.exports = router;
