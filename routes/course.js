const express = require('express')
const router = express.Router()
const CourseController = require('../controllers/CourseController')
const authMiddleware = require('../middleware/authMiddleware')
const bodyParser = require('body-parser')
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }))


router.post('/add/course', authMiddleware,(req, res) => {
    CourseController.addCourse(req, res);
})

router.get('/courses', (req, res) => {
    CourseController.getCourses(req, res);
})

router.delete('/delete/course/:id', authMiddleware, (req, res) => {
    CourseController.deleteCourse(req, res);
})

router.get('/course/:id', (req, res) => {
    CourseController.getCourse(req, res);
})

router.put('/edit/course/:id', authMiddleware, (req, res) => {
    CourseController.editCourse(req, res);
})



module.exports = router