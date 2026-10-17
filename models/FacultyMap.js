const mongoose = require('mongoose');
const facultyMapSchema = new mongoose.Schema({
    session: {
        type: String,
        required: true
    },
    facultyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'faculty',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'course',
        required: true
    },
    branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'branch',
        required: true
    },
    year: {
        type: String,
        required: true
    },
    semester: {
        type: String,
        required: true
    },
    section: {
        type: String,
        required: true
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'subject',
        required: true
    },
    loadPerWeek: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('FacultyMap', facultyMapSchema)