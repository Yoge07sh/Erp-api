const express =require('express')
const bodyParser=require('body-parser')
const router=express.Router()
const SubjectMappingController =require('../controllers/subjectMappingController')
const authMiddleware = require('../middleware/authMiddleware')
router.use(bodyParser.json())
router.use(bodyParser.urlencoded({
    extended:false
}))


router.get('/courses/for/mapping',(req,res)=>{
SubjectMappingController.getCoursesForMapping(req,res) 
})

router.get('/subjects/for/mapping',(req,res)=>{
SubjectMappingController.getSubjectsForMapping(req,res) 
})
router.get('/branchs/for/mapping',(req,res)=>{
SubjectMappingController.getBranchsForMapping(req,res) 
})
router.post('/add/subjectMapping',authMiddleware,(req,res)=>{
    SubjectMappingController.addSubjectMapping(req,res)
})
router.get('/subjectsMapped', (req, res) => {
    SubjectMappingController.getSubjectsMapped(req, res)
})

router.get('/subjectMapping/:id', (req, res) => {
    SubjectMappingController.getSubjectMappingById(req, res)
});
router.put('/edit/subjectMapping/:id', authMiddleware, (req, res)=> {
    SubjectMappingController.editSubjectMapping(req, res)
});
router.delete('/delete/subjectMapping/:id', authMiddleware,(req, res) => {
    SubjectMappingController.deleteSubjectMapping(req, res)
});
module.exports=router