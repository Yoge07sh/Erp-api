const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const facultySchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    collegeId: { type: String, uppercase: true, trim: true },
    thumbId: { type: String },
    firstName: { type: String, required: true },
    lastName: { type: String },
    collegeEmail: { type: String, required: true },
    personalEmail: { type: String },
    mobileNo: { type: Number },
    emergencyMobileNo: { type: Number },
    fatherName: { type: String },
    motherName: { type: String },
    gender: { type: String, default: "male", enum: ["male", "female"] },
    dob: { type: Date },
    highestQualification: { type: String },
    designation: { type: String },
    marriedStatus: {
      type: String,
      default: "not married",
      enum: ["not married", "married"],
    },
    totalExperience: { type: String },
    teachingExperience: { type: Number },
    industryExperience: { type: Number },
    researchExperience: { type: Number },
    facultyImage: { type: String, required: false },
    status: { type: String, default: "active", enum: ["active", "inactive"] },
  },
  { timestamps: true },
);

module.exports = mongoose.model("faculty", facultySchema);
