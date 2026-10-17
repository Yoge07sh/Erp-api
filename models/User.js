const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: true,
            trim: true,
        },

        lastName: {
            type: String,
            default: "",
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        password: {
            type: String,
            required: true,
        },

        mobNo: {
            type: String,
            default: "",
            trim: true,
        },

        userRole: {
            type: String,
            enum: ["student", "faculty", "admin"],
            default: "student",
        },

        lastLogin: {
            type: Date,
            default: null,
        },

        userImage: {
            type: String,
            default: "",
        },

        status: {
            type: String,
            enum: ["Active", "InActive"],
            default: "Active",
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("User", userSchema);