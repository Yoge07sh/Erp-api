const mongoose = require("mongoose");

const placementSchema = new mongoose.Schema(
  {
    session: {
      type: String,
      required: true,
    },

    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      required: true,
    },

    hrName: {
      type: String,
      required: true,
      trim: true,
    },

    hrEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    noOfRequirement: {
      type: Number,
      required: true,
      min: 1,
    },

    jobRole: {
      type: String,
      required: true,
    },

    eligibility: {
      type: String,
      required: true,
    },

    jobType: {
      type: String,
      required: true,
    },

    package: {
      type: String,
      required: true,
    },

    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "branch",
      required: true,
    },

    jobDescription: {
      type: String,
      required: true,
    },

    lastDateToApply: {
      type: Date,
      required: true,
    },

    driveDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["Upcoming", "Open", "Closed", "Completed"],
      default: "Upcoming",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Placement", placementSchema);
