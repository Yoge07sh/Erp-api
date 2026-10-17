const express = require('express')
const router = express.Router()
const BranchController = require('../controllers/BranchController')
const authMiddleware = require('../middleware/authMiddleware')
const bodyParser = require('body-parser')
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }))

router.get('/courses/for/branch', (req, res) => {
    BranchController.getCoursesForBranch(req, res)
})
router.post('/add/branch', authMiddleware, (req, res) => {
    BranchController.addBranch(req, res);
})

router.get('/branches', (req, res) => {
    BranchController.getBranches(req, res);
})

router.delete('/delete/branch/:id', authMiddleware, (req, res) => {
    BranchController.deleteBranch(req, res);
})

router.get('/branch/:id', (req, res) => {
    BranchController.getBranch(req, res);
})

router.put('/edit/branch/:id', authMiddleware, (req, res) => {
    BranchController.editBranch(req, res);
})

module.exports = router