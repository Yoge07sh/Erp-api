const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const FacultyMappingController = require('../controllers/facultyMappingController');
const authMiddleware = require('../middleware/authMiddleware')

router.use(bodyParser.json());

router.use(bodyParser.urlencoded({
    extended: false
}));

router.get('/faculties/for/mapping', (req, res) => {
    FacultyMappingController.getFacultyForMapping(req, res);
});

router.get('/courses/for/mapping', (req, res) => {
    FacultyMappingController.getCoursesForMapping(req, res);
});

router.get('/subjects/for/mapping', (req, res) => {
    FacultyMappingController.getSubjectsForMapping(req, res);
});

router.get('/branchs/for/mapping', (req, res) => {
    FacultyMappingController.getBranchsForMapping(req, res);
});

router.post('/add/facultymapping',authMiddleware, (req, res) => {
    FacultyMappingController.addFacultyMapping(req, res);
});
router.get('/get/facultymapping', (req, res) => {
    FacultyMappingController.getFacultyList(req, res)
})
router.get('/facultyMapping/:id', (req, res) => {
    FacultyMappingController.getFacultyMappingById(req, res);
});
router.put('/edit/facultyMapping/:id', authMiddleware, (req, res) => {
    FacultyMappingController.editFacultyMapping(req, res);
});
router.delete('/delete/facultyMapping/:id', authMiddleware, (req, res) => {
    FacultyMappingController.deleteFacultyMapping(req, res);
});
router.get('/faculty/for/attendance', (req, res) => {
    FacultyMappingController.getFacultyMapForAttendance(req, res);
}
);



module.exports = router;