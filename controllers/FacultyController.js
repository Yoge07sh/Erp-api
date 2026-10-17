const Faculty = require("../models/Faculty");
const cloudinary = require("cloudinary").v2;
const csv = require("csvtojson");
const User = require("../models/User");
const bcrypt = require("bcrypt");

async function addFaculty(req, res) {
  try {
    let upload;

    console.log(req.body);
    console.log(req.file);

    // Upload faculty image
    if (req.file) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      upload = await cloudinary.uploader.upload(req.file.path);
    }

    // Create encrypted password
    let encryptedPassword = bcrypt.hashSync("123456", 10);

    // Create User first
    let user = new User({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.collegeEmail,
      password: encryptedPassword,
      mobNo: req.body.mobileNo,
      userRole: "faculty",
      userImage: upload
        ? upload.secure_url
        : "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_640.png",
    });

    await user.save();

    // Create Faculty
    let faculty = new Faculty(req.body);

    // Connect Faculty with User
    faculty.userId = user._id;

    if (req.file && upload) {
      faculty.facultyImage = upload.secure_url;
    }

    await faculty.save();

    console.log("Faculty and User saved successfully.");

    return res.status(200).send({
      success: true,
      message: "Faculty added successfully",
    });
  } catch (error) {
    console.log(error);

    return res.status(500).send({
      success: false,
      message: "Something went wrong",
    });
  }
}
async function addFaculties(req, res) {
  try {
    if (!req.file) {
      return res
        .status(400)
        .send({ success: false, message: "No CSV file uploaded" });
    }

    // ✅ Parse CSV into JSON array
    const jsonArray = await csv().fromFile(req.file.path);

    // ✅ Process and clean up data
    const FacultyList = jsonArray.map((item) => {
      // Fix DOB format (DD-MM-YYYY → Date)
      let formattedDob = null;
      if (item.dob) {
        const [day, month, year] = item.dob.split("-");
        formattedDob = new Date(`${year}-${month}-${day}`);
      }

      return {
        collegeId: item.collegeId,
        thumbId: item.thumbId,
        firstName: item.firstName,
        lastName: item.lastName,
        collegeEmail: item.collegeEmail,
        personalEmail: item.personalEmail,
        mobileNo: item.mobileNo,
        emergencyMobileNo: item.emergencyMobileNo,
        fatherName: item.fatherName,
        motherName: item.motherName,
        gender: item.gender,
        dob: formattedDob,
        highestQualification: item.highestQualification,
        designation: item.designation,
        marriedStatus: item.marriedStatus,
        totalExperience: parseFloat(item.totalExperience) || 0,
        teachingExperience: parseFloat(item.teachingExperience) || 0,
        industryExperience: parseFloat(item.industryExperience) || 0,
        researchExperience: parseFloat(item.researchExperience) || 0,
        facultyImage:
          item.facultyImage ||
          "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_640.png",
        status: item.status || "active",
      };
    });

    // ✅ Insert into MongoDB
    await Faculty.insertMany(FacultyList);
    const userList = jsonArray.map((item) => {
      let encryptedPassword = bcrypt.hashSync("123456", 10);
      return {
        firstName: item.firstName,
        lastName: item.lastName,
        email: item.collegeEmail,
        password: encryptedPassword,
        mobNo: item.mobileNo,
        userRole: "faculty",
        userImage:
          item.facultyImage ||
          "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_640.png",
      };
    });
    await User.insertMany(userList);
    // Optional: remove uploaded file after processing
    // fs.unlinkSync(req.file.path);

    res.status(200).send({ success: true, message: "Data added successfully" });
  } catch (error) {
    console.error("Error in addFaculties:", error);
    res.status(500).send({ success: false, message: "Something went wrong" });
  }
}

async function getFaculties(req, res) {
  try {
    const page = parseInt(req.query.pageNo) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const searchTerm = req.query.firstName || "";

    const filter = {
      firstName: {
        $regex: new RegExp(searchTerm, "i"),
      },
    };

    const totalFaculty = await Faculty.countDocuments(filter);

    const faculties = await Faculty.find(filter).skip(skip).limit(limit);

    const totalPages = Math.ceil(totalFaculty / limit);

    res.status(200).send({
      success: true,
      data: faculties,
      pagination: {
        currentPage: page,
        limit: limit,
        totalRecords: totalFaculty,
        totalPages: totalPages,
      },
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Something went wrong..!",
    });
  }
}

async function getFaculty(req, res) {
  try {
    let facultyId = req.params.id;
    let faculty = await Faculty.findOne({ _id: facultyId });
    res.status(200).send({ success: true, data: faculty });
  } catch (error) {
    res
      .status(500)
      .send({ success: false, message: "Something went wrong..." });
  }
}

async function deleteFaculty(req, res) {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(401).send({
        success: false,
        message: "User not found",
      });
    }

    if (user.userRole !== "admin") {
      return res.status(403).send({
        success: false,
        message: "Only admin can perform this operation",
      });
    }
    let facultyId = req.params.id;
    const result = await Faculty.deleteOne({ _id: facultyId });

    if (result) {
      res
        .status(200)
        .send({ success: true, message: "Faculty Deleted Successfull..." });
    } else {
      res
        .status(500)
        .send({ success: false, message: "Can not Delete Faculty" });
    }
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .send({
        success: false,
        message: "Can not Delete, Something went wrong..!",
      });
  }
}
async function editFaculty(req, res) {
  try {
    let facultyId = req.params.id;
    console.log(facultyId);
    console.log(req.body);

    let faculty = await Faculty.findOne({ _id: facultyId });
    Object.assign(faculty, req.body);
    await faculty.save();
    console.log("Faculty has been updated Successfully.....");

    res
      .status(200)
      .send({ success: true, message: "Faculty has been updated" });
  } catch (error) {
    res
      .status(500)
      .send({
        success: false,
        message: "Something went wrong in updating Faculty.",
      });
  }
}

async function getFacultyProfile(req, res) {
  try {
    const faculty = await Faculty.findById(req.params.id);

    if (!faculty) {
      return res.status(404).send({
        success: false,
        message: "Faculty not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Faculty profile fetched successfully",
      data: faculty,
    });
  } catch (error) {
    console.error("Get Faculty Profile Error:", error);

    res.status(500).send({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
}

module.exports = {
  addFaculty,
  addFaculties,
  getFaculties,
  getFaculty,
  deleteFaculty,
  editFaculty,
  getFacultyProfile,
};
