const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const subjectSchema = new Schema(
  {
    subjectCode: { type: String, required: true },
    subjectFullName: { type: String, required: true },
    subjectNickName: { type: String, required: true },
    subjectCategory: {
      type: String,
      default: "theory",
      enum: ["theory", "practical"],
    },
    subjectType: {
      type: String,
      default: "regular",
      enum: ["regular", "elective", "combined"],
    },
    creditScore: { type: Number, required: true },
    isActive: { type: String, default: "active", enum: ["active", "inActive"] },
  },
  { timestamps: true },
);
module.exports = mongoose.model("subject", subjectSchema);
