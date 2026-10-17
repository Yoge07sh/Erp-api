const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const facultySchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    collegeId: { type: String, unique: true, required: true, uppercase: true, trim: true },
    thumbId: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, },
    collegeEmail: { type: String, required: true },
    personalEmail: { type: String, required: true },
    mobileNo: { type: Number, required: true },
    emergencyMobileNo: { type: Number, required: true },
    fatherName: { type: String, required: true },
    motherName: { type: String, required: true },
    gender: { type: String, default: 'male', enum: ['male', 'female'] },
    dob: { type: Date, required: true },
    highestQualification: { type: String, required: true },
    designation: { type: String, required: true },
    marriedStatus: { type: String, default: 'not married', enum: ['not married', 'married'] },
    totalExperience: { type: String, required: true },
    teachingExperience: { type: Number, required: true },
    industryExperience: { type: Number, required: true },
    researchExperience: { type: Number, required: true },
    facultyImage: { type: String, required: false },
    status: { type: String, default: 'active', enum: ['active', 'inactive'] },
}, { timestamps: true })

module.exports = mongoose.model('faculty', facultySchema)