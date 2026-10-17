const express = require('express')
const router = express.Router()
const TimeSlotController = require('../controllers/TimeSlotController')
const bodyParser = require('body-parser')
const authMiddleware = require('../middleware/authMiddleware')
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }))


router.post('/add/timeslots',authMiddleware, (req, res) => {
    TimeSlotController.AddTimeSlots(req, res);
})

router.get('/timeslots', (req, res) => {
    TimeSlotController.getTimeSlots(req, res);
})

router.delete('/delete/timeslot/:id', authMiddleware, (req, res) => {
    TimeSlotController.deleteTimeSlots(req, res)
})

router.get('/timeslot/:id', (req, res) => {
    TimeSlotController.getTimeSlotById(req, res);

})

router.put('/edit/timeslot/:id', authMiddleware, (req, res) => {
    TimeSlotController.editTimeSlot(req, res);
})

module.exports = router