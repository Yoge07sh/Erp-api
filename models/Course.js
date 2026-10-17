const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const courseSchema = new Schema({
    courseCode: { type: String, unique: true, required: true, uppercase: true, trim: true },
    courseFullName: { type: String, required: true, trim: true },
    courseShortName: { type: String, required: true, uppercase: true, trim: true },
    affiliatedUniversity: { type: String, required: true },  // Get from json file
    totalIntake: { type: Number, default: 60 },
    status: { type: String, default: 'Active', enum: ['Active', 'InActive'] },
}, { timestamps: true })

module.exports = mongoose.model('course', courseSchema)