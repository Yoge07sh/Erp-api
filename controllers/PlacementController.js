const PlacementManager = require("../models/placementManager");
const User = require("../models/User");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const Placement = require('../models/placement')
const bcrypt = require("bcrypt");
const addPlacementManager = async (req, res) => {
  try {
    const admin = await User.findById(req.user._id);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (admin.userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can perform this operation",
      });
    }

    // Check whether the email is already registered
    const existingUser = await User.findOne({
      email: req.body.email,
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Create Placement Coordinator
    const placementManager = await PlacementManager.create(req.body);
    let encryptedPassword = bcrypt.hashSync("123456", 10);

    // Create login account
    const newUser = await User.create({
      firstName: req.body.firstName,
      email: req.body.email,
      userRole: "placementCoordinator",
      password: encryptedPassword,
    });

    return res.status(201).json({
      success: true,
      message: "Placement Manager added successfully",
      data: placementManager,
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const addPlacementInformation = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Job Description file is required",
      });
    }
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });


    // Upload file directly to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "placement-jd",
          resource_type: "auto",
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        },
      );

      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    // Save Cloudinary URL in MongoDB
    const placement = await Placement.create({
      ...req.body,
      jobDescription: uploadResult.secure_url,
    });

    return res.status(201).json({
      success: true,
      message: "Placement added successfully",
      data: placement,
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
module.exports = {
  addPlacementManager,
  addPlacementInformation,
};
