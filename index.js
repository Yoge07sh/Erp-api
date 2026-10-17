require("dotenv").config();
const express = require('express');
const app = express();
const connect = require('./connection');
const createAdmin = require('./createAdmin');
const course = require('./routes/course');
const branch = require('./routes/branch')
const subject = require('./routes/subject')
const subjectmap = require('./routes/subjectMapping')
const faculty = require('./routes/faculty')
const student = require('./routes/student')
const user = require('./routes/user')
const timeSlot = require('./routes/timeSlots')
const facultyMapping = require('./routes/facultyMapping');
const attendance = require('./routes/attendance')
const cors = require('cors');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(cors())
app.use(course)
app.use(branch)
app.use(subject)
app.use(subjectmap)
app.use(faculty)
app.use(student)
app.use(timeSlot)
app.use(facultyMapping)
app.use(user)
app.use(attendance)
connect();
createAdmin()

app.listen(3000, (err) => {
    if (err) {
        console.log(err);
    } else {
        console.log("Server is running on Port: 3000");
    }
})