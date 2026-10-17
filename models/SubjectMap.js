const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const subjectmapSchema = new Schema(
  {
    session: {
      type: String,
      required: true,
    },

    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "subject",
      required: true,
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "course",
      required: true,
    },

    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "branch",
      required: true,
    },

    year: {
      type: String,
      required: true,
    },

    semester: {
      type: String,
      required: true,
    },

    isActive: {
      type: String,
      default: "active",
      enum: ["active", "inActive"],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("subjectmap", subjectmapSchema);
