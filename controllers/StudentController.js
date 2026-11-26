const mongoose = require("mongoose");
const Branch = require("../models/Branch");
const Course = require("../models/Course");
const Student = require("../models/Student");
const User = require("../models/User");
const cloudinary = require("cloudinary").v2;
const { randomUUID } = require("crypto");
const { format } = require("@fast-csv/format");
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

function buildStudentFilter(query) {
  const {
    courseId,
    branchId,
    year,
    semester,
    section,
    currentSession,
    rollNumber,
    gender,
    category,
  } = query;

  const filter = {};

  if (courseId) filter.course = courseId;
  if (branchId) filter.branch = branchId;

  if (year) filter.year = { $in: [String(year), Number(year)] };
  if (semester) filter.semester = { $in: [String(semester), Number(semester)] };

  if (currentSession) {
    filter.currentSession = String(currentSession).trim();
  }

  if (section) {
    const cleanSection = String(section).trim().toUpperCase();

    if (!["A", "B", "C", "D"].includes(cleanSection)) {
      const err = new Error("Invalid section.");
      err.statusCode = 400;
      throw err;
    }

    filter.section = cleanSection;
  }

  // Roll Number
  if (rollNumber && String(rollNumber).trim()) {
    filter.rollNumber = String(rollNumber).trim();
  }

  // Gender
  if (gender) {
    filter.gender = String(gender).trim();
  }

  // Category
  if (category) {
    filter.category = String(category).trim();
  }

  return filter;
}

async function getStudents(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
    const skip = (page - 1) * limit;

    let query;
    try {
      query = buildStudentFilter(req.query);
    } catch (e) {
      return res
        .status(e.statusCode || 400)
        .send({ success: false, message: e.message });
    }

    const [totalRecords, students] = await Promise.all([
      Student.countDocuments(query),
      Student.find(query)
        .sort({ firstName: 1, lastName: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).send({
      success: true,
      data: students,
      pagination: {
        currentPage: page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (error) {
    // Invalid ObjectId in courseId / branchId
    if (error.name === "CastError") {
      return res.status(400).send({
        success: false,
        message: "Invalid course or branch id.",
      });
    }

    console.error("Error fetching students:", error);

    return res.status(500).send({
      success: false,
      message: "Something went wrong!",
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

const getStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findOne({ _id: id })
      .populate("course", "courseShortName")
      .populate("branch", "branchShortName")
      .lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    console.error("Get Student Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
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
    // 1. Check uploaded file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const { course, branch, section, year, semester, admissionYear } = req.body;

    // 2. Validate course ID
    if (!course || !mongoose.Types.ObjectId.isValid(course)) {
      return res.status(400).json({
        success: false,
        message: "Valid course ID is required",
      });
    }

    // 3. Validate branch ID
    if (branch && !mongoose.Types.ObjectId.isValid(branch)) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID",
      });
    }

    // 4. Check course exists
    const courseExists = await Course.exists({
      _id: course,
    });

    if (!courseExists) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // 5. Check branch exists
    if (branch) {
      const branchExists = await Branch.exists({
        _id: branch,
      });

      if (!branchExists) {
        return res.status(404).json({
          success: false,
          message: "Branch not found",
        });
      }
    }

    // 6. Validate form values
    const validSections = ["A", "B", "C", "D"];
    const validYears = ["1", "2", "3", "4"];
    const validSemesters = ["1", "2", "3", "4", "5", "6", "7", "8"];

    const selectedSection = String(section || "A")
      .trim()
      .toUpperCase();

    const selectedYear = year ? String(year).trim() : undefined;

    const selectedSemester = String(semester || "1").trim();

    const selectedAdmissionYear =
      admissionYear !== undefined &&
      admissionYear !== null &&
      String(admissionYear).trim() !== ""
        ? Number(admissionYear)
        : undefined;

    if (!validSections.includes(selectedSection)) {
      return res.status(400).json({
        success: false,
        message: "Invalid section",
      });
    }

    if (selectedYear && !validYears.includes(selectedYear)) {
      return res.status(400).json({
        success: false,
        message: "Invalid year",
      });
    }

    if (!validSemesters.includes(selectedSemester)) {
      return res.status(400).json({
        success: false,
        message: "Invalid semester",
      });
    }

    if (
      selectedAdmissionYear !== undefined &&
      (!Number.isInteger(selectedAdmissionYear) || selectedAdmissionYear < 1900)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid admission year",
      });
    }

    // 7. Read Excel / CSV file
    const workbook = xlsx.read(req.file.buffer, {
      type: "buffer",
      raw: true,
    });

    if (!workbook.SheetNames.length) {
      return res.status(400).json({
        success: false,
        message: "No worksheet found",
      });
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows = xlsx.utils.sheet_to_json(sheet, {
      defval: "",
      raw: false,
    });

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: "Uploaded file is empty",
      });
    }

    // 8. Allowed values
    const validCategories = ["sc", "st", "obc", "ews", "general"];

    const validGenders = ["male", "female", "other"];

    // 9. Helper functions
    const clean = (value) => String(value ?? "").trim();

    const normalizeEmail = (value) => clean(value).toLowerCase();

    const errors = [];
    const validStudents = [];

    const seenRollNumbers = new Set();
    const seenEmails = new Set();

    // 10. Validate Excel rows
    rows.forEach((row, index) => {
      const excelRow = index + 2;

      const rollNumber = clean(row.rollNumber).toUpperCase();
      const firstName = clean(row.firstName);
      const lastName = clean(row.lastName);

      // Required fields
      if (!rollNumber || !firstName) {
        errors.push({
          row: excelRow,
          rollNumber: rollNumber || null,
          reason: "Roll number and first name are required",
        });

        return;
      }

      // College email validation
      const collegeEmailId = normalizeEmail(row.collegeEmailId);

      if (!collegeEmailId) {
        errors.push({
          row: excelRow,
          rollNumber,
          reason: "College email is required",
        });

        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(collegeEmailId)) {
        errors.push({
          row: excelRow,
          rollNumber,
          reason: "Invalid college email",
        });

        return;
      }

      // Gender validation
      const genderInput = clean(row.gender).toLowerCase();
      const gender = genderInput || "male";

      if (!validGenders.includes(gender)) {
        errors.push({
          row: excelRow,
          rollNumber,
          reason: "Invalid gender. Allowed: Male, Female, Other",
        });

        return;
      }

      // Category validation
      const categoryInput = clean(row.category).toLowerCase();
      const category = categoryInput || "general";

      if (!validCategories.includes(category)) {
        errors.push({
          row: excelRow,
          rollNumber,
          reason: "Invalid category",
        });

        return;
      }

      // Current session validation
      const currentSession = clean(row.currentSession);

      if (!currentSession) {
        errors.push({
          row: excelRow,
          rollNumber,
          reason: "Current session is required",
        });

        return;
      }

      // Mobile number validation
      const mobileNumber = clean(row.mobileNumber);

      const emergencyMobNumber = clean(row.emergencyMobNumber);

      if (mobileNumber && !/^\+?[0-9]{10,15}$/.test(mobileNumber)) {
        errors.push({
          row: excelRow,
          rollNumber,
          reason: "Invalid mobile number",
        });

        return;
      }

      if (emergencyMobNumber && !/^\+?[0-9]{10,15}$/.test(emergencyMobNumber)) {
        errors.push({
          row: excelRow,
          rollNumber,
          reason: "Invalid emergency mobile number",
        });

        return;
      }

      // Duplicate roll number inside uploaded file
      const duplicateRollKey = [
        rollNumber,
        course,
        branch || "NO_BRANCH",
        currentSession,
        selectedSection,
      ].join("_");

      if (seenRollNumbers.has(duplicateRollKey)) {
        errors.push({
          row: excelRow,
          rollNumber,
          reason: "Duplicate roll number in uploaded file",
        });

        return;
      }

      // Duplicate email inside uploaded file
      if (seenEmails.has(collegeEmailId)) {
        errors.push({
          row: excelRow,
          rollNumber,
          reason: "Duplicate college email in uploaded file",
        });

        return;
      }

      seenRollNumbers.add(duplicateRollKey);
      seenEmails.add(collegeEmailId);

      // 11. Prepare student data
      validStudents.push({
        _excelRow: excelRow,

        rollNumber,

        enrollmentNumber: `ENR${randomUUID().replace(/-/g, "").toUpperCase()}`,

        fileNumber: clean(row.fileNumber) || undefined,

        firstName,
        lastName,

        collegeEmailId,

        mobileNumber: mobileNumber || undefined,

        emergencyMobNumber: emergencyMobNumber || undefined,

        fatherName: clean(row.fatherName) || undefined,

        motherName: clean(row.motherName) || undefined,

        currentSession,

        course,

        branch: branch || null,

        section: selectedSection,

        year: selectedYear,

        semester: selectedSemester,

        admissionYear: selectedAdmissionYear,

        gender: gender.charAt(0).toUpperCase() + gender.slice(1),

        category,

        image: "",

        status: "Active",
      });
    });

    // 12. Check valid records
    if (!validStudents.length) {
      return res.status(400).json({
        success: false,
        message: "No valid student records found",

        summary: {
          totalRows: rows.length,
          insertedStudents: 0,
          createdUserAccounts: 0,
          skipped: errors.length,
        },

        errors,
      });
    }

    // 13. Find existing students
    const rollNumbers = [
      ...new Set(validStudents.map((student) => student.rollNumber)),
    ];

    const sessions = [
      ...new Set(validStudents.map((student) => student.currentSession)),
    ];

    const existingStudents = await Student.find({
      course,
      branch: branch || null,
      currentSession: { $in: sessions },
      section: selectedSection,
      rollNumber: { $in: rollNumbers },
    })
      .select("rollNumber currentSession")
      .lean();

    const existingStudentKeys = new Set(
      existingStudents.map((student) =>
        [student.rollNumber, student.currentSession].join("_"),
      ),
    );

    // 14. Remove existing students
    const studentsToCheck = [];

    validStudents.forEach((student) => {
      const key = [student.rollNumber, student.currentSession].join("_");

      if (existingStudentKeys.has(key)) {
        errors.push({
          row: student._excelRow,
          rollNumber: student.rollNumber,
          reason: "Student already exists in database",
        });
      } else {
        studentsToCheck.push(student);
      }
    });

    // 15. Find existing user accounts
    const emails = [
      ...new Set(studentsToCheck.map((student) => student.collegeEmailId)),
    ];

    const existingUsers = await User.find({
      email: { $in: emails },
    })
      .select("email")
      .lean();

    const existingEmails = new Set(
      existingUsers.map((user) => normalizeEmail(user.email)),
    );

    // 16. Remove students whose email is already registered
    const finalStudents = [];

    studentsToCheck.forEach((student) => {
      if (existingEmails.has(student.collegeEmailId)) {
        errors.push({
          row: student._excelRow,
          rollNumber: student.rollNumber,
          reason: "User account already exists with this email",
        });
      } else {
        finalStudents.push(student);
      }
    });

    // 17. Prepare Student and User documents
    let insertedStudentCount = 0;
    let createdUserCount = 0;

    if (finalStudents.length > 0) {
      // Hash default password once for the entire batch
      const encryptedPassword = await bcrypt.hash("123456", 10);

      const studentDocuments = [];
      const userDocuments = [];
      const preparedRows = [];

      // Validate documents before starting transaction
      for (const student of finalStudents) {
        const { _excelRow, ...studentData } = student;

        const studentDocument = new Student(studentData);

        const userDocument = new User({
          firstName: studentData.firstName,

          lastName: studentData.lastName || "",

          email: studentData.collegeEmailId,

          password: encryptedPassword,

          mobNo: studentData.mobileNumber || "",

          userRole: "student",

          userImage: studentData.image || "",
        });

        try {
          await studentDocument.validate();
          await userDocument.validate();

          studentDocuments.push(studentDocument);
          userDocuments.push(userDocument);
          preparedRows.push(_excelRow);
        } catch (validationError) {
          errors.push({
            row: _excelRow,
            rollNumber: studentData.rollNumber,
            reason: validationError.message,
          });
        }
      }

      // 18. Insert both collections in a transaction
      if (studentDocuments.length > 0) {
        const session = await mongoose.startSession();

        try {
          await session.withTransaction(async () => {
            const insertedStudents = await Student.insertMany(
              studentDocuments,
              {
                session,
                ordered: true,
              },
            );

            const insertedUsers = await User.insertMany(userDocuments, {
              session,
              ordered: true,
            });

            insertedStudentCount = insertedStudents.length;
            createdUserCount = insertedUsers.length;
          });
        } catch (transactionError) {
          console.error(
            "Student registration transaction failed:",
            transactionError,
          );

          // Both collections are rolled back if the transaction fails
          throw transactionError;
        } finally {
          await session.endSession();
        }
      }
    }

    // 19. Final response
    return res.status(200).json({
      success: true,

      message: "Bulk student registration completed successfully",

      summary: {
        totalRows: rows.length,

        validRows: validStudents.length,

        insertedStudents: insertedStudentCount,

        createdUserAccounts: createdUserCount,

        skipped: errors.length,
      },

      errors,
    });
  } catch (error) {
    console.error("Bulk upload error:", error);

    return res.status(500).json({
      success: false,
      message: "Error uploading students",
      error: error.message,
    });
  }
};

const exportFieldLabels = {
  firstName: "First Name",
  lastName: "Last Name",
  dob: "Date of Birth",
  gender: "Gender",
  category: "Category",
  fatherName: "Father's Name",
  motherName: "Mother's Name",

  personalEmailId: "Personal Email",
  collegeEmailId: "College Email",
  mobileNumber: "Mobile Number",
  emergencyMobNumber: "Emergency Number",

  enrollmentNumber: "Enrollment Number",
  fileNumber: "File Number",
  rollNumber: "Roll Number",

  "course.courseShortName": "Course",
  "branch.branchShortName": "Branch",

  section: "Section",
  admissionYear: "Admission Year",
  currentSession: "Current Session",
  year: "Year",
  semester: "Semester",
  status: "Status",

  localAddressLine1: "Local Address Line 1",
  localAddressLine2: "Local Address Line 2",
  localCity: "Local City",
  localState: "Local State",
  localPincode: "Local Pincode",

  permanentAddressLine1: "Permanent Address Line 1",
  permanentAddressLine2: "Permanent Address Line 2",
  permanentcity: "Permanent City",
  permanentState: "Permanent State",
  permanentPincode: "Permanent Pincode",
};

async function exportStudents(req, res) {
  let cursor;

  try {
    // Separate selected fields from filter parameters
    const { fields, ...filterQuery } = req.query;

    // Validate filters using your existing function
    const filter = buildStudentFilter(filterQuery);

    // Get selected fields
    const selectedFields =
      typeof fields === "string" ? fields.split(",").filter(Boolean) : [];

    if (!selectedFields.length) {
      return res.status(400).send("Select at least one field.");
    }

    // Validate against allowed fields
    const invalidFields = selectedFields.filter(
      (field) => !Object.hasOwn(exportFieldLabels, field),
    );

    if (invalidFields.length) {
      return res.status(400).send("Invalid export fields.");
    }

    const date = new Date().toISOString().slice(0, 10);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="students_${date}.csv"`,
    );

    // UTF-8 BOM for Excel compatibility
    res.write("\uFEFF");

    // Create CSV with dynamically selected headers
    const csv = format({
      headers: selectedFields.map((field) => exportFieldLabels[field]),
    });

    csv.pipe(res);

    // MongoDB cursor with populated course and branch
    cursor = Student.find(filter)
      .populate("course", "courseShortName")
      .populate("branch", "branchShortName")
      .sort({ firstName: 1, lastName: 1 })
      .lean()
      .cursor();

    // Helper to get nested properties
    const getValue = (obj, path) => {
      return path.split(".").reduce((current, key) => current?.[key], obj);
    };

    // Stream students one by one
    for await (const student of cursor) {
      const row = selectedFields.map((field) => {
        let value = getValue(student, field);

        if (value instanceof Date) {
          value = value.toLocaleDateString("en-IN");
        }

        // Protect spreadsheet users from formula injection
        if (typeof value === "string" && /^[\t\r ]*[=+\-@]/.test(value)) {
          value = "'" + value;
        }

        return value ?? "";
      });

      csv.write(row);
    }

    csv.end();
  } catch (error) {
    console.error("Student CSV Export Error:", error);

    if (cursor) {
      await cursor.close().catch(() => {});
    }

    if (!res.headersSent) {
      return res.status(500).send("Export failed");
    }

    res.destroy(error);
  }
}

module.exports = {
  getCourseForStudent,
  getBranchForStudent,
  addStudent,
  getStudents,
  deleteStudent,
  getStudent,
  editStudent,
  bulkUploadStudents,
  exportStudents,
};
