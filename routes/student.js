const express = require("express");
const router = express.Router();
const multer = require("multer");
const bodyParser = require("body-parser");
const StudentController = require("../controllers/StudentController");
const authMiddleware = require("../middleware/authMiddleware");
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

// ✅ Use memory storage so req.file.buffer works directly with xlsx
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// ✅ Get dropdown data
router.get("/courses/for/student", (req, res) => {
  StudentController.getCourseForStudent(req, res);
});

router.get("/branches/for/student", (req, res) => {
  StudentController.getBranchForStudent(req, res);
});

// ✅ Add single student with image
router.post("/add/student", upload.single("file"), (req, res) => {
  StudentController.addStudent(req, res);
});

// ✅ Bulk student upload (Excel/CSV)
router.post("/students/upload", upload.single("bulkFile"), (req, res) => {
  StudentController.bulkUploadStudents(req, res);
});

// ✅ CRUD routes
router.get("/students", (req, res) => StudentController.getStudents(req, res));
router.delete("/delete/student/:id", authMiddleware, (req, res) =>
  StudentController.deleteStudent(req, res),
);
router.get("/student/:id", (req, res) =>
  StudentController.getStudent(req, res),
);
router.put("/edit/student/:id", upload.single("studentImage"), (req, res) => {
  StudentController.editStudent(req, res);
});

module.exports = router;
