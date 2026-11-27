const mongoose = require("mongoose");

const studentAcademicReportSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "student",
      required: true,
      unique: true,
    },

    academicHistory: [
      {
        promotionId: {
          type: String,
          required: true,
        },
        session: {
          type: String,
          required: true,
        },
        year: Number,
        semester: Number,

        status: {
          type: String,
          enum: ["Pursuing", "Passed", "Failed", "Left"],
          default: "Pursuing",
        },
      },
    ],

    overallStatus: {
      type: String,
      enum: ["Pursuing", "Passed", "Left", "Failed"],
      default: "Active",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "StudentAcademicReport",
  studentAcademicReportSchema,
);
