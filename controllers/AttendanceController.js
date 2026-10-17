const Student = require("../models/Student");
const Faculty = require("../models/Faculty");
const FacultyMap = require("../models/FacultyMap");
const TimeSlot = require("../models/TimeSlot");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const mongoose = require("mongoose");

// ---------- Helpers ----------
const MAX_BACKDATE_DAYS = 30; // how many days back faculty can mark

const getISTDateString = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d); // YYYY-MM-DD

const isValidDateString = (s) =>
  typeof s === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  getISTDateString(new Date(`${s}T12:00:00+05:30`)) === s;

const daysBetween = (fromStr, toStr) =>
  Math.round(
    (new Date(`${toStr}T00:00:00Z`) - new Date(`${fromStr}T00:00:00Z`)) /
      86400000,
  );

// Get Faculty Mappings for logged-in Faculty
const getFacultyMappings = async (req, res) => {
  try {
    // User ID comes from JWT
    const userId = req.user._id;

    // Find Faculty connected with this User
    const faculty = await Faculty.findOne({
      userId: userId,
    });
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found",
      });
    }

    // Get mappings of this faculty
    const mappings = await FacultyMap.find({
      facultyId: faculty._id,
    })
      .populate("course", "courseShortName")
      .populate("branch", "branchShortName")
      .populate("subjectId", "subjectFullName");

    return res.status(200).json({
      success: true,
      data: mappings,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch faculty mappings",
    });
  }
};

// Get Students according to selected Faculty Mapping
const getStudentsData = async (req, res) => {
  try {
    const { mappingId } = req.query;

    if (!mappingId) {
      return res.status(400).json({
        success: false,
        message: "Mapping ID is required",
      });
    }

    // Get logged-in User ID from JWT
    const userId = req.user._id;

    // Find connected Faculty
    const faculty = await Faculty.findOne({
      userId: userId,
    });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found",
      });
    }

    const mapping = await FacultyMap.findOne({
      _id: mappingId,
      facultyId: faculty._id,
    });

    if (!mapping) {
      return res.status(403).json({
        success: false,
        message: "This class is not assigned to you",
      });
    }

    const students = await Student.find({
      currentSession: mapping.session,
      course: mapping.course,
      branch: mapping.branch,
      year: mapping.year,
      semester: mapping.semester,
      section: mapping.section,
      status: "Active",
    });

    return res.status(200).json({
      success: true,
      data: students,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch students",
    });
  }
};

const submitAttendance = async (req, res) => {
  try {
    const { facultyMapId, timeSlotId, students, date } = req.body;

    if (!facultyMapId) {
      return res
        .status(400)
        .json({ success: false, message: "Faculty Map ID is required" });
    }
    if (!timeSlotId) {
      return res
        .status(400)
        .json({ success: false, message: "Time Slot ID is required" });
    }
    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Student attendance data is required",
      });
    }

    // Date: today by default, past dates allowed within the limit
    const today = getISTDateString();
    const dateKey = date || today;

    if (!isValidDateString(dateKey)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid date. Use YYYY-MM-DD" });
    }
    if (dateKey > today) {
      return res.status(400).json({
        success: false,
        message: "Attendance cannot be marked for a future date",
      });
    }
    if (daysBetween(dateKey, today) > MAX_BACKDATE_DAYS) {
      return res.status(400).json({
        success: false,
        message: `Attendance can only be marked up to ${MAX_BACKDATE_DAYS} days back`,
      });
    }

    const faculty = await Faculty.findOne({ userId: req.user._id });
    if (!faculty) {
      return res
        .status(404)
        .json({ success: false, message: "Faculty profile not found" });
    }

    const mapping = await FacultyMap.findOne({
      _id: facultyMapId,
      facultyId: faculty._id,
    });
    if (!mapping) {
      return res
        .status(403)
        .json({ success: false, message: "This class is not assigned to you" });
    }

    const timeSlot = await TimeSlot.findById(timeSlotId);
    if (!timeSlot) {
      return res
        .status(404)
        .json({ success: false, message: "Time slot not found" });
    }

    // Validate students
    const studentIds = students.map((s) => s.studentId);

    if (studentIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid student ID" });
    }
    if (new Set(studentIds.map(String)).size !== studentIds.length) {
      return res
        .status(400)
        .json({ success: false, message: "Duplicate students in request" });
    }
    if (students.some((s) => !["Present", "Absent"].includes(s.status))) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid attendance status" });
    }

    const validStudents = await Student.find({
      _id: { $in: studentIds },
      currentSession: mapping.session,
      course: mapping.course,
      branch: mapping.branch,
      year: mapping.year,
      semester: mapping.semester,
      section: mapping.section,
      status: "Active",
    }).select("_id");

    if (validStudents.length !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more students do not belong to this class",
      });
    }

    // Friendly duplicate check (also catches old records without dateKey)
    const startOfDay = new Date(`${dateKey}T00:00:00.000+05:30`);
    const endOfDay = new Date(`${dateKey}T23:59:59.999+05:30`);

    const existingAttendance = await Attendance.findOne({
      facultyMapId,
      timeSlotId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (existingAttendance) {
      return res.status(409).json({
        success: false,
        message: `Attendance has already been submitted for this lecture on ${dateKey}`,
      });
    }

    // Save; the unique index blocks races
    try {
      const attendance = await Attendance.create({
        facultyMapId,
        timeSlotId,
        dateKey,
        date: dateKey === today ? new Date() : startOfDay,
        students: students.map((s) => ({
          studentId: s.studentId,
          status: s.status,
        })),
      });

      return res.status(201).json({
        success: true,
        message: "Attendance submitted successfully",
        data: attendance,
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({
          success: false,
          message: `Attendance has already been submitted for this lecture on ${dateKey}`,
        });
      }
      throw err;
    }
  } catch (error) {
    console.error("Submit attendance error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to submit attendance" });
  }
};

const viewAttendance = async (req, res) => {
  try {
    const { mappingId, SingletimeSlot, date } = req.query;
    if (!mappingId) {
      return res.status(400).json({
        success: false,
        message: "Mapping ID is required",
      });
    }

    if (!SingletimeSlot) {
      return res.status(400).json({
        success: false,
        message: "Time slot is required",
      });
    }
    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required",
      });
    }
    const userId = req.user._id;

    const faculty = await Faculty.findOne({
      userId: userId,
    });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found",
      });
    }

    // Check mapping belongs to logged-in faculty
    const mapping = await FacultyMap.findOne({
      _id: mappingId,
      facultyId: faculty._id,
    });

    if (!mapping) {
      return res.status(403).json({
        success: false,
        message: "This class is not assigned to you",
      });
    }
    const startDate = new Date(`${date}T00:00:00+05:30`);
    const endDate = new Date(`${date}T23:59:59.999+05:30`);

    // Get attendance only for selected time slot
    const attendance = await Attendance.find({
      facultyMapId: mappingId,
      timeSlotId: SingletimeSlot,
      date: {
        $gte: startDate,
        $lt: endDate,
      },
    })
      .populate("timeSlotId")
      .populate("students.studentId")
      .sort({ date: -1 });

    return res.status(200).json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    console.error("View attendance error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateAttendance = async (req, res) => {
  try {
    const { facultyMapId, timeSlotId, date, students } = req.body;

    if (!facultyMapId || !timeSlotId || !date) {
      return res.status(400).json({
        success: false,
        message: "facultyMapId, timeSlotId, date and students are required",
      });
    }

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Students attendance data is required",
      });
    }

    // Find logged-in faculty
    const faculty = await Faculty.findOne({
      userId: req.user._id,
    });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found",
      });
    }

    // Check that this mapping belongs to logged-in faculty
    const mapping = await FacultyMap.findOne({
      _id: facultyMapId,
      facultyId: faculty._id,
    });

    if (!mapping) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized for this faculty mapping",
      });
    }

    // Validate only studentId and status
    for (const student of students) {
      if (!student.studentId || !student.status) {
        return res.status(400).json({
          success: false,
          message: "Each student must have studentId and status",
        });
      }

      if (!["Present", "Absent"].includes(student.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid attendance status",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(student.studentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID",
        });
      }
    }

    // Selected date range
    const startDate = new Date(`${date}T00:00:00+05:30`);
    const endDate = new Date(`${date}T23:59:59.999+05:30`);

    // Find the existing attendance record
    const attendanceRecord = await Attendance.findOne({
      facultyMapId: facultyMapId,
      timeSlotId: timeSlotId,
      date: {
        $gte: startDate,
        $lt: endDate,
      },
    });

    if (!attendanceRecord) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    // Update attendance
    attendanceRecord.students = students.map((student) => ({
      studentId: student.studentId,
      status: student.status,
    }));

    await attendanceRecord.save();

    return res.status(200).json({
      success: true,
      message: "Attendance updated successfully",
      data: attendanceRecord,
    });
  } catch (error) {
    console.error("Update attendance error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update attendance",
      error: error.message,
    });
  }
};

const getEregister = async (req, res) => {
  try {
    const { mappingId, fromDate, toDate } = req.query;

    // Validate required fields
    if (!mappingId || !fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: "Mapping ID, From Date and To Date are required",
      });
    }

    // Validate date range
    if (fromDate > toDate) {
      return res.status(400).json({
        success: false,
        message: "From Date cannot be greater than To Date",
      });
    }

    // Convert date-only values into India date boundaries
    const startDate = new Date(`${fromDate}T00:00:00+05:30`);
    const endDate = new Date(`${toDate}T23:59:59.999+05:30`);

    // Logged-in user's ID from JWT
    const userId = req.user._id;

    // Find logged-in faculty
    const faculty = await Faculty.findOne({
      userId: userId,
    });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found",
      });
    }

    // Verify that this mapping belongs to the logged-in faculty
    const facultyMap = await FacultyMap.findOne({
      _id: mappingId,
      facultyId: faculty._id,
    });

    if (!facultyMap) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this faculty mapping",
      });
    }

    // Get ALL attendance records for this mapping
    // within the selected date range.
    // attendance of every lecture.
    const attendanceRecords = await Attendance.find({
      facultyMapId: mappingId,
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .populate({
        path: "timeSlotId",
        select: "lectureNo timeSlot",
      })
      .populate({
        path: "students.studentId",
        select: "rollNumber firstName lastName",
      })
      .sort({
        date: 1,
      });

    // Sort by date and then lecture number
    attendanceRecords.sort((a, b) => {
      const dateDifference = new Date(a.date) - new Date(b.date);

      if (dateDifference !== 0) {
        return dateDifference;
      }

      return (
        (a.timeSlotId?.lectureNo ?? 999) - (b.timeSlotId?.lectureNo ?? 999)
      );
    });

    return res.status(200).json({
      success: true,
      data: attendanceRecords,
    });
  } catch (error) {
    console.error("E-Register error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch E-Attendance Register",
      error: error.message,
    });
  }
};

const getAttendanceDashboard = async (req, res) => {
  try {
    const today = getISTDateString();
    const date = req.query.date || today;

    if (!isValidDateString(date)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid date. Use YYYY-MM-DD" });
    }
    if (date > today) {
      return res.status(400).json({
        success: false,
        message: "Summary cannot be shown for a future date",
      });
    }

    const faculty = await Faculty.findOne({ userId: req.user._id });
    if (!faculty) {
      return res
        .status(404)
        .json({ success: false, message: "Faculty profile not found" });
    }

    const mappings = await FacultyMap.find({ facultyId: faculty._id })
      .populate("course", "courseShortName")
      .populate("branch", "branchShortName")
      .populate("subjectId", "subjectFullName");

    const startOfDay = new Date(`${date}T00:00:00.000+05:30`);
    const endOfDay = new Date(`${date}T23:59:59.999+05:30`);

    // Any attendance record for this mapping on this date = marked
    const records = await Attendance.find({
      facultyMapId: { $in: mappings.map((m) => m._id) },
      date: { $gte: startOfDay, $lte: endOfDay },
    }).select("facultyMapId");

    const markedIds = new Set(records.map((r) => String(r.facultyMapId)));

    const data = mappings.map((m) => ({
      mappingId: m._id,
      courseName: m.course?.courseShortName || "",
      branchName: m.branch?.branchShortName || "",
      subjectName: m.subjectId?.subjectFullName || "",
      year: m.year,
      semester: m.semester,
      section: m.section,
      marked: markedIds.has(String(m._id)),
    }));

    const marked = data.filter((d) => d.marked).length;

    return res.status(200).json({
      success: true,
      date,
      summary: { marked, pending: data.length - marked },
      data,
    });
  } catch (error) {
    console.error("Attendance summary error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load attendance summary" });
  }
};

const getMyAttendance = async (req, res) => {
  try {
    // 1. Find the logged-in user
    const user = await User.findById(req.user._id).select("email userRole");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 2. Allow only students
    if (user.userRole !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only students can view their attendance",
      });
    }

    // 3. Find the academic student record by email
    const student = await Student.findOne({
      collegeEmailId: user.email,
    }).select("_id");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student record not found",
      });
    }

    // 4. Fetch this student's attendance records
    const attendanceRecords = await Attendance.find({
      "students.studentId": student._id,
    })
      .populate({
        path: "facultyMapId",
        populate: [
          { path: "subjectId", select: "subjectFullName" },
          { path: "course", select: "courseShortName" },
          { path: "branch", select: "branchShortName" },
        ],
      })
      .populate("timeSlotId", "lectureNo timeSlot")
      .sort({ date: -1 });

    // 5. Extract this student's status from each record
    let present = 0;
    let absent = 0;

    const records = attendanceRecords.map((attendance) => {
      const studentEntry = attendance.students.find(
        (entry) => String(entry.studentId) === String(student._id),
      );

      const status = studentEntry?.status || null;

      if (status === "Present") present++;
      if (status === "Absent") absent++;

      const mapping = attendance.facultyMapId;
      const slot = attendance.timeSlotId;

      return {
        _id: attendance._id,
        date: attendance.date,
        status,
        subject: mapping?.subjectId?.subjectFullName || "N/A",
        course: mapping?.course?.courseShortName || "N/A",
        branch: mapping?.branch?.branchShortName || "N/A",
        year: mapping?.year || "",
        semester: mapping?.semester || "",
        section: mapping?.section || "",
        lectureNo: slot?.lectureNo ?? null,
        timeSlot: slot?.timeSlot || "",
      };
    });

    const totalClasses = present + absent;

    return res.status(200).json({
      success: true,
      data: {
        totalClasses,
        present,
        absent,
        percentage:
          totalClasses > 0
            ? Number(((present / totalClasses) * 100).toFixed(2))
            : 0,
        records,
      },
    });
  } catch (error) {
    console.error("My attendance error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch attendance",
    });
  }
};

module.exports = {
  getStudentsData,
  getFacultyMappings,
  submitAttendance,
  viewAttendance,
  updateAttendance,
  getEregister,
  getAttendanceDashboard,
  getMyAttendance
};
