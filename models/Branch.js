const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const branchSchema = new Schema({
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'course', required: true },
    branchCode: { type: String, unique: true,  uppercase: true, trim: true },
    branchShortName: { type: String, unique: true,  uppercase: true, trim: true },
    branchFullName: { type: String, },
    branchIntake: { type: Number, default: 60 },
    status: { type: String, default: 'Active', enum: ['Active', 'InActive'] },
    
},{timestamps: true})

module.exports = mongoose.model('branch', branchSchema)