const Branch = require("../models/Branch");
const Course = require("../models/Course");
const Student = require("../models/Student");
const User = require("../models/User");
const cloudinary = require("cloudinary").v2;

const bcrypt = require("bcrypt");

const xlsx = require("xlsx");

async function getCourseForStudent(req, res) {
  try {
    let courses = await Course.find(
      { courseFullName: { $regex: new RegExp(req.query.courseFullName, "i") } },
      {
        _id: 1,
        courseFullName: 1,
      },
    );
    let sendCourses = [];
    for (let i = 0; i < courses.length; i++) {
      sendCourses.push({
        value: courses[i]._id,
        label: courses[i].courseFullName,
      });
    }
    res.status(200).send({ success: true, data: sendCourses });
  } catch (error) {
    res.status(500).send({ success: false, message: "something went wrong" });
    console.log(error);
  }
}

async function getBranchForStudent(req, res) {
  try {
    const { courseId } = req.query;

    if (!courseId) {
      return res.status(200).send({
        success: true,
        data: [],
      });
    }

    const branches = await Branch.find(
      {
        course: courseId,
        status: "Active",
      },
      {
        _id: 1,
        branchFullName: 1,
      },
    ).sort({ branchFullName: 1 });

    const sendBranches = branches.map((branch) => ({
      value: branch._id,
      label: branch.branchFullName,
    }));

    res.status(200).send({
      success: true,
      data: sendBranches,
    });
  } catch (error) {
    console.error("Error fetching branches:", error);

    res.status(500).send({
      success: false,
      message: "Something went wrong",
    });
  }
}

async function addStudent(req, res) {
  try {
    let upload;

    if (req.file) {
      cloudinary.config({
        // cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        // api_key: process.env.CLOUDINARY_API_KEY,
        // api_secret: process.env.CLOUDINARY_API_SECRET,
        cloud_name: "dezwajyx9",
        api_key: "115759516773756",
        api_secret: "PKUY4ZGUKyon30Joriq4hDqrWls",
      });

      upload = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "students",
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          },
        );

        stream.end(req.file.buffer);
      });
    }

    const studentData = {
      ...req.body,
      branch: req.body.branch || null,
    };

    let student = new Student(studentData);

    if (req.file && upload) {
      student.image = upload.secure_url;
    }

    await student.save();

    let encryptedPassword = bcrypt.hashSync("123456", 10);

    let user = new User({
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.collegeEmailId,
      password: encryptedPassword,
      mobNo: student.mobileNumber,
      userRole: "student",
      userImage:
        student.image ||
        "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_640.png",
    });

    await user.save();

    res.status(200).send({
      success: true,
      message: "Student Add Successfully",
    });
  } catch (error) {
    console.error("ERROR IN ADD STUDENT:", error);

    res.status(500).send({
      success: false,
      message: error.message || "Something went wrong!",
    });
  }
}

async function getStudents(req, res) {
  try {
    const searchTerm = req.query.courseFullName || "";

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const skip = (page - 1) * limit;

    const filter = {
      $or: [
        { firstName: { $regex: new RegExp(searchTerm, "i") } },
        { lastName: { $regex: new RegExp(searchTerm, "i") } },
        { enrollmentNumber: { $regex: new RegExp(searchTerm, "i") } },
        { fileNumber: { $regex: new RegExp(searchTerm, "i") } },
        { rollNumber: { $regex: new RegExp(searchTerm, "i") } },
      ],
    };

    // Total matching students
    const totalRecords = await Student.countDocuments(filter);

    // Students for current page
    const student = await Student.find(filter).skip(skip).limit(limit);

    // Total number of pages
    const totalPages = Math.ceil(totalRecords / limit);

    res.status(200).send({
      success: true,
      data: student,
      pagination: {
        currentPage: page,
        limit: limit,
        totalRecords: totalRecords,
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

async function deleteStudent(req, res) {
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

    let studentId = req.params.id;
    const result = await Student.deleteOne({ _id: studentId });

    if (result) {
      res
        .status(200)
        .send({ success: true, message: "Student Deleted Successfully...!" });
    } else {
      res
        .status(500)
        .send({ success: false, message: "Can not Delete Student!" });
    }
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .send({ success: false, message: "Something went wrong..!" });
  }
}

async function getStudent(req, res) {
  try {
    let studentId = req.params.id;
    let student = await Student.findOne({ _id: studentId });
    res.status(200).send({ success: true, data: student });
  } catch (error) {
    res
      .status(500)
      .send({ success: false, message: "Something went wrong..." });
  }
}

async function editStudent(req, res) {
  try {
    let studentId = req.params.id;

    let student = await Student.findOne({ _id: studentId });

    if (!student) {
      return res.status(404).send({
        success: false,
        message: "Student not found",
      });
    }

    const studentData = {
      ...req.body,
      branch: req.body.branch || null,
    };

    Object.assign(student, studentData);

    if (req.file) {
      cloudinary.config({
        cloud_name: "dezwajyx9",
        api_key: "115759516773756",
        api_secret: "PKUY4ZGUKyon30Joriq4hDqrWls",
      });

      const upload = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "students",
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          },
        );

        stream.end(req.file.buffer);
      });

      student.image = upload.secure_url;
    }

    await student.save();

    res.status(200).send({
      success: true,
      message: "Student Updated Successfully...",
    });
  } catch (error) {
    console.error("ERROR IN EDIT STUDENT:", error);

    res.status(500).send({
      success: false,
      message: error.message || "Something went wrong!",
    });
  }
}

const bulkUploadStudents = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const { course, branch, section, year, semester, admissionYear } = req.body;

    // Course is required
    if (!course) {
      return res.status(400).json({
        success: false,
        message: "Course is required",
      });
    }

    // Read CSV / Excel file
    const workbook = xlsx.read(req.file.buffer, {
      type: "buffer",
    });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows = xlsx.utils.sheet_to_json(sheet, {
      defval: "",
    });

    console.log("Total rows:", rows.length);
    console.log("First row:", rows[0]);

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: "Uploaded file is empty",
      });
    }

    // Convert CSV rows into Student documents
    const validStudents = rows
      .filter((row) => row.firstName)
      .map((row, index) => {
        return {
          // CSV fields
          rollNumber: String(row.rollNumber).trim(),

          fileNumber: row.fileNumber
            ? String(row.fileNumber).trim()
            : undefined,

          firstName: String(row.firstName).trim(),

          lastName: row.lastName ? String(row.lastName).trim() : "",

          mobileNumber: row.mobileNumber
            ? String(row.mobileNumber).trim()
            : undefined,

          emergencyMobNumber: row.emergencyMobNumber
            ? String(row.emergencyMobNumber).trim()
            : undefined,

          fatherName: row.fatherName
            ? String(row.fatherName).trim()
            : undefined,

          motherName: row.motherName
            ? String(row.motherName).trim()
            : undefined,
          currentSession: String(row.currentSession).trim(),

          // Automatically generated
          enrollmentNumber: `ENR${Date.now()}${index}`,

          // Values coming from the form
          course: course,

          branch: branch || null,

          section: section || "A",

          year: year || undefined,

          semester: semester || "1",

          admissionYear: admissionYear ? Number(admissionYear) : undefined,

          // Schema defaults
          gender: "Male",

          group: "All",

          image: "",

          status: "Active",
        };
      });

    console.log("Valid students:", validStudents.length);

    if (!validStudents.length) {
      return res.status(400).json({
        success: false,
        message: "No valid student records found",
      });
    }

    // Insert into MongoDB
    const insertedStudents = await Student.insertMany(validStudents);

    console.log("Students inserted:", insertedStudents.length);

    return res.status(200).json({
      success: true,
      message: `${insertedStudents.length} students uploaded successfully!`,
      count: insertedStudents.length,
    });
  } catch (error) {
    console.error("Bulk upload error:", error);

    return res.status(500).json({
      success: false,
      message: "Error uploading file",
      error: error.message,
    });
  }
};

module.exports = {
  getCourseForStudent,
  getBranchForStudent,
  addStudent,
  getStudents,
  deleteStudent,
  getStudent,
  editStudent,
  bulkUploadStudents,
};
