const mongoose = require("mongoose");

const placementManagerSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    contactNumber: {
      type: String,
      trim: true,
    },

    employeeId: {
      type: String,
      trim: true,
    },

    designation: {
      type: String,
      default: "placementCordinator",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("PlacementManager", placementManagerSchema);
