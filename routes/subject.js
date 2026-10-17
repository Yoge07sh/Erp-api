const express =require('express')
const bodyParser=require('body-parser')
const router=express.Router()
const SubjectController =require('../controllers/subjectController')
const authMiddleware = require('../middleware/authMiddleware')
router.use(bodyParser.json())
router.use(bodyParser.urlencoded({
    extended:false
}))

router.post('/add/subject', authMiddleware,(req,res)=>{
    SubjectController.addSubject(req,res)
})
router.get('/subjects', (req, res) => {
    console.log('d')
    SubjectController.getSubjects(req, res);
})

router.get('/subject/:id', (req, res) => {
    SubjectController.getSubject(req,res);
})
router.put('/edit/subject/:id', authMiddleware,(req, res) => {
    SubjectController.editSubject(req, res);
})
router.delete('/delete/subject/:id', authMiddleware, (req, res) => {
    SubjectController.deleteSubject(req, res);
})

module.exports=router