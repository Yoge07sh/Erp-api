const PlacementManager = require("../models/placementManager");
const User = require("../models/User");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const Placement = require("../models/placement");
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

const getPlacementManagerList = async (req, res) => {
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
    const data = await PlacementManager.find({}).select(
      "firstName lastName email contactNumber designation isActive",
    );
    res.status(200).json({ data: data });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const addPlacementInformation = async (req, res) => {
  try {
    const {
      session,
      companyName,
      addressLine1,
      addressLine2,
      City,
      State,
      Pincode,
      hrName,
      hrEmail,
      noOfRequirement,
      jobRole,
      eligibility,
      jobType,
      package: salaryPackage,
      branch,
      lastDateToApply,
      driveDate,
    } = req.body;

    // Check required fields
    if (
      !session ||
      !companyName ||
      !hrName ||
      !hrEmail ||
      !noOfRequirement ||
      !jobRole ||
      !eligibility ||
      !jobType ||
      !salaryPackage ||
      !branch ||
      !lastDateToApply ||
      !driveDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Check Job Description file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Job Description file is required",
      });
    }

    // Validate dates
    if (new Date(lastDateToApply) > new Date(driveDate)) {
      return res.status(400).json({
        success: false,
        message: "Last date to apply cannot be after drive date",
      });
    }

    // Configure Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    // Upload Job Description to Cloudinary
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

    // Create placement document
    const placement = await Placement.create({
      session,
      companyName,
      addressLine1,
      addressLine2,
      City,
      State,
      Pincode,
      hrName,
      hrEmail: hrEmail.trim().toLowerCase(),
      noOfRequirement: Number(noOfRequirement),
      jobRole,
      eligibility,
      jobType,
      package: salaryPackage,
      branch,
      jobDescription: uploadResult.secure_url,
      lastDateToApply,
      driveDate,
    });

    return res.status(201).json({
      success: true,
      message: "Placement added successfully",
      data: placement,
    });
  } catch (err) {
    console.error("Add Placement Error:", err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getCompanyDetails = async (req, res) => {
  try {
    const data = await Placement.find({}).select(
      "session companyName eligibility jobType package status",
    );
    res.status(200).json({ data: data });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  addPlacementManager,
  getPlacementManagerList,
  addPlacementInformation,
  getCompanyDetails,
};
