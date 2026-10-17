const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    facultyMapId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FacultyMap",
      required: true,
    },

    timeSlotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "timeSlots",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    students: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "student",
          required: true,
        },

        status: {
          type: String,
          enum: ["Present", "Absent"],
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Attendance", attendanceSchema);
