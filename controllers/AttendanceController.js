const Student = require("../models/Student");
const Faculty = require("../models/Faculty");
const FacultyMap = require("../models/FacultyMap");
const TimeSlot = require("../models/TimeSlot");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const mongoose = require("mongoose");

// ---------- Helpers ----------
const MAX_BACKDATE_DAYS = 30;

const getISTDateString = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(d);

const isValidDateString = (s) =>
  typeof s === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  getISTDateString(new Date(`${s}T12:00:00+05:30`)) === s;

const daysBetween = (fromStr, toStr) =>
  Math.round(
    (new Date(`${toStr}T00:00:00Z`) - new Date(`${fromStr}T00:00:00Z`)) /
      86400000,
  );

// ---------- Faculty Mappings ----------
const getFacultyMappings = async (req, res) => {
  try {
    const faculty = await Faculty.findOne({
      userId: req.user._id,
    });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found",
      });
    }

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
    console.error("Faculty mappings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch faculty mappings",
    });
  }
};

// ---------- Get Students for Existing Attendance Module ----------
const getStudentsData = async (req, res) => {
  try {
    const { mappingId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(mappingId || "")) {
      return res.status(400).json({
        success: false,
        message: "Valid mapping ID is required",
      });
    }

    const faculty = await Faculty.findOne({
      userId: req.user._id,
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
    }).lean();

    // Numerically sort string roll numbers.
    students.sort((a, b) =>
      String(a.rollNumber ?? "").localeCompare(
        String(b.rollNumber ?? ""),
        undefined,
        { numeric: true, sensitivity: "base" },
      ),
    );

    return res.status(200).json({
      success: true,
      data: students,
    });
  } catch (error) {
    console.error("Get students error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch students",
    });
  }
};

// ---------- Submit Attendance ----------
const submitAttendance = async (req, res) => {
  try {
    const { facultyMapId, timeSlotId, students, date, checkOnly } = req.body;

    if (!facultyMapId || !mongoose.Types.ObjectId.isValid(facultyMapId)) {
      return res.status(400).json({
        success: false,
        message: "Valid Faculty Map ID is required",
      });
    }

    if (!timeSlotId || !mongoose.Types.ObjectId.isValid(timeSlotId)) {
      return res.status(400).json({
        success: false,
        message: "Valid Time Slot ID is required",
      });
    }

    const today = getISTDateString();
    const dateKey = date || today;

    if (!isValidDateString(dateKey)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date. Use YYYY-MM-DD",
      });
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
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found",
      });
    }

    const mapping = await FacultyMap.findOne({
      _id: facultyMapId,
      facultyId: faculty._id,
    });

    if (!mapping) {
      return res.status(403).json({
        success: false,
        message: "This class is not assigned to you",
      });
    }

    const timeSlot = await TimeSlot.findById(timeSlotId);

    if (!timeSlot) {
      return res.status(404).json({
        success: false,
        message: "Time slot not found",
      });
    }

    // ---------- Step 1: is this lecture already marked for the class? ----------
    const classFilter = {
      course: mapping.course,
      branch: mapping.branch || null,
      year: mapping.year,
      semester: mapping.semester,
      section: mapping.section,
    };

    const startOfDay = new Date(`${dateKey}T00:00:00.000+05:30`);
    const endOfDayExclusive = new Date(
      startOfDay.getTime() + 24 * 60 * 60 * 1000,
    );

    // All mappings of this class (any subject, any faculty)
    const classMappings = await FacultyMap.find({
      session: mapping.session,
      ...classFilter,
    })
      .select("_id")
      .lean();

    const classMappingIds = classMappings.map((m) => m._id);

    const lectureQuery = {
      facultyMapId: { $in: classMappingIds },
      timeSlotId,
      date: { $gte: startOfDay, $lt: endOfDayExclusive },
    };

    const existingAttendance = await Attendance.findOne(lectureQuery).populate({
      path: "facultyMapId",
      populate: { path: "subjectId", select: "subjectFullName" },
    });

    const buildDuplicateMessage = (subject) =>
      `Lecture ${timeSlot.lectureNo ?? ""} is already marked for this class on ${dateKey}${
        subject ? ` (${subject})` : ""
      }. Choose another time slot or edit the existing attendance.`;

    const alreadyMarked = Boolean(existingAttendance);

    const duplicateMessage = buildDuplicateMessage(
      existingAttendance?.facultyMapId?.subjectId?.subjectFullName,
    );

    // ---------- Check-only mode: report status, save nothing ----------
    if (checkOnly === true) {
      return res.status(200).json({
        success: true,
        marked: alreadyMarked,
        message: alreadyMarked ? duplicateMessage : "",
      });
    }

    // ---------- Real submit: stop if already marked ----------
    if (alreadyMarked) {
      return res.status(409).json({
        success: false,
        message: duplicateMessage,
      });
    }

    // ---------- Step 2: validate students ----------
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Student attendance data is required",
      });
    }

    const studentIds = students.map((s) => s.studentId);

    if (studentIds.some((id) => !mongoose.Types.ObjectId.isValid(id || ""))) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID",
      });
    }

    if (new Set(studentIds.map(String)).size !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate students in request",
      });
    }

    if (students.some((s) => !["Present", "Absent"].includes(s.status))) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance status",
      });
    }

    const validStudents = await Student.find({
      _id: { $in: studentIds },
      currentSession: mapping.session,
      status: "Active",
      ...classFilter,
    }).select("_id");

    if (validStudents.length !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more students do not belong to this class",
      });
    }

    // ---------- Step 3: save ----------
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

    // ---------- Step 4: race-condition guard (replaces the unique index) ----------
    // If two requests passed the check at the same moment, both records exist now.
    // The earliest record (lowest _id) wins; the other removes itself.
    const winner = await Attendance.findOne(lectureQuery)
      .sort({ _id: 1 })
      .select("_id")
      .lean();

    if (winner && String(winner._id) !== String(attendance._id)) {
      await Attendance.deleteOne({ _id: attendance._id });

      return res.status(409).json({
        success: false,
        message: buildDuplicateMessage(),
      });
    }

    return res.status(201).json({
      success: true,
      message: "Attendance submitted successfully",
      data: attendance,
    });
  } catch (error) {
    console.error("Submit attendance error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit attendance",
    });
  }
};
// ---------- View Attendance ----------
const viewAttendance = async (req, res) => {
  try {
    const { mappingId, SingletimeSlot, date } = req.query;

    if (
      !mappingId ||
      !mongoose.Types.ObjectId.isValid(mappingId) ||
      !SingletimeSlot ||
      !mongoose.Types.ObjectId.isValid(SingletimeSlot) ||
      !date ||
      !isValidDateString(date)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid mapping ID, time slot and date are required",
      });
    }

    const faculty = await Faculty.findOne({
      userId: req.user._id,
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

    const startDate = new Date(`${date}T00:00:00.000+05:30`);
    const endDateExclusive = new Date(
      startDate.getTime() + 24 * 60 * 60 * 1000,
    );

    const attendance = await Attendance.find({
      facultyMapId: mappingId,
      timeSlotId: SingletimeSlot,
      date: {
        $gte: startDate,
        $lt: endDateExclusive,
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
      message: "Failed to fetch attendance",
    });
  }
};

// ---------- Update Attendance ----------
const updateAttendance = async (req, res) => {
  try {
    const { facultyMapId, timeSlotId, date, students } = req.body;

    if (
      !facultyMapId ||
      !mongoose.Types.ObjectId.isValid(facultyMapId) ||
      !timeSlotId ||
      !mongoose.Types.ObjectId.isValid(timeSlotId) ||
      !date ||
      !isValidDateString(date)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid facultyMapId, timeSlotId and date are required",
      });
    }

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Students attendance data is required",
      });
    }

    const faculty = await Faculty.findOne({
      userId: req.user._id,
    });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found",
      });
    }

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

    for (const student of students) {
      if (
        !student.studentId ||
        !mongoose.Types.ObjectId.isValid(student.studentId) ||
        !["Present", "Absent"].includes(student.status)
      ) {
        return res.status(400).json({
          success: false,
          message: "Each student must have a valid studentId and status",
        });
      }
    }

    const studentIds = students.map((s) => String(s.studentId));

    if (new Set(studentIds).size !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate students in request",
      });
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

    const startDate = new Date(`${date}T00:00:00.000+05:30`);
    const endDateExclusive = new Date(
      startDate.getTime() + 24 * 60 * 60 * 1000,
    );

    const attendanceRecord = await Attendance.findOne({
      facultyMapId,
      timeSlotId,
      date: {
        $gte: startDate,
        $lt: endDateExclusive,
      },
    });

    if (!attendanceRecord) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

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

// ---------- Existing E-Register ----------
const getEregister = async (req, res) => {
  try {
    const { mappingId, fromDate, toDate } = req.query;

    if (
      !mappingId ||
      !mongoose.Types.ObjectId.isValid(mappingId) ||
      !fromDate ||
      !toDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Mapping ID, From Date and To Date are required",
      });
    }

    if (!isValidDateString(fromDate) || !isValidDateString(toDate)) {
      return res.status(400).json({
        success: false,
        message: "Dates must use YYYY-MM-DD format",
      });
    }

    if (fromDate > toDate) {
      return res.status(400).json({
        success: false,
        message: "From Date cannot be greater than To Date",
      });
    }

    const startDate = new Date(`${fromDate}T00:00:00.000+05:30`);
    const endDateExclusive = new Date(
      new Date(`${toDate}T00:00:00.000+05:30`).getTime() + 24 * 60 * 60 * 1000,
    );

    const faculty = await Faculty.findOne({
      userId: req.user._id,
    });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found",
      });
    }

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

    const attendanceRecords = await Attendance.find({
      facultyMapId: mappingId,
      date: {
        $gte: startDate,
        $lt: endDateExclusive,
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
      .sort({ date: 1 });

    attendanceRecords.sort((a, b) => {
      const dateDifference = new Date(a.date) - new Date(b.date);

      if (dateDifference !== 0) return dateDifference;

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

// ---------- Attendance Dashboard ----------
const getAttendanceDashboard = async (req, res) => {
  try {
    const today = getISTDateString();
    const date = req.query.date || today;

    if (!isValidDateString(date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date. Use YYYY-MM-DD",
      });
    }

    if (date > today) {
      return res.status(400).json({
        success: false,
        message: "Summary cannot be shown for a future date",
      });
    }

    const faculty = await Faculty.findOne({
      userId: req.user._id,
    });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found",
      });
    }

    const mappings = await FacultyMap.find({
      facultyId: faculty._id,
    }).select("_id");

    const mappingIds = mappings.map((mapping) => mapping._id);

    if (mappingIds.length === 0) {
      return res.status(200).json({
        success: true,
        date,
        summary: { marked: 0 },
        data: [],
      });
    }

    const startOfDay = new Date(`${date}T00:00:00.000+05:30`);
    const endDateExclusive = new Date(
      startOfDay.getTime() + 24 * 60 * 60 * 1000,
    );

    const attendanceRecords = await Attendance.find({
      facultyMapId: { $in: mappingIds },
      date: {
        $gte: startOfDay,
        $lt: endDateExclusive,
      },
    })
      .populate({
        path: "facultyMapId",
        populate: [
          { path: "course", select: "courseShortName" },
          { path: "branch", select: "branchShortName" },
          { path: "subjectId", select: "subjectFullName" },
        ],
      })
      .populate({
        path: "timeSlotId",
        select: "lectureNo timeSlot",
      })
      .sort({ date: 1 });

    attendanceRecords.sort((a, b) => {
      return (
        (a.timeSlotId?.lectureNo ?? 999) - (b.timeSlotId?.lectureNo ?? 999)
      );
    });

    const data = attendanceRecords
      .filter((record) => record.facultyMapId && record.timeSlotId)
      .map((record) => {
        const mapping = record.facultyMapId;
        const slot = record.timeSlotId;

        return {
          _id: record._id,
          mappingId: mapping._id,
          timeSlotId: slot._id,
          subjectName: mapping.subjectId?.subjectFullName || "Unknown Subject",
          courseName: mapping.course?.courseShortName || "",
          branchName: mapping.branch?.branchShortName || "",
          year: mapping.year,
          semester: mapping.semester,
          section: mapping.section,
          lectureNo: slot.lectureNo ?? null,
          timeSlot: slot.timeSlot || "",
          marked: true,
        };
      });

    return res.status(200).json({
      success: true,
      date,
      summary: {
        marked: data.length,
      },
      data,
    });
  } catch (error) {
    console.error("Attendance summary error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load attendance summary",
    });
  }
};

// ---------- Student's Own Attendance ----------
const getMyAttendance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("email userRole");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.userRole !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only students can view their attendance",
      });
    }

    const student = await Student.findOne({
      collegeEmailId: user.email,
    }).select("_id");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student record not found",
      });
    }

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

    let present = 0;
    let absent = 0;

    const records = attendanceRecords.map((attendance) => {
      const studentEntry = attendance.students.find(
        (entry) =>
          String(entry.studentId?._id || entry.studentId) ===
          String(student._id),
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

// ---------- Daily E-Attendance Register: Faculty Mappings ----------
const getEAttendanceMappings = async (req, res) => {
  try {
    const faculty = await Faculty.findOne({
      userId: req.user._id,
    });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found",
      });
    }

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
    console.error("E-Attendance mappings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch mappings",
    });
  }
};

// ---------- Daily E-Attendance Register: Students ----------
const getEAttendanceStudents = async (req, res) => {
  try {
    const { mappingId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(mappingId || "")) {
      return res.status(400).json({
        success: false,
        message: "Valid mapping ID is required",
      });
    }

    const faculty = await Faculty.findOne({
      userId: req.user._id,
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
        message: "You are not authorized to view this class",
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
    })
      .select("_id rollNumber firstName lastName")
      .lean();

    // Numeric-aware sorting supports string roll numbers such as:
    // "1", "2", "10" and prefixes such as "MCA001", "MCA002".
    students.sort((a, b) =>
      String(a.rollNumber ?? "").localeCompare(
        String(b.rollNumber ?? ""),
        undefined,
        {
          numeric: true,
          sensitivity: "base",
        },
      ),
    );

    return res.status(200).json({
      success: true,
      data: students,
    });
  } catch (error) {
    console.error("E-Attendance students error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch students",
    });
  }
};

// ---------- Daily E-Attendance Register: Records ----------
const getEAttendanceRecords = async (req, res) => {
  try {
    const { mappingId, fromDate, toDate } = req.query;

    if (
      !mongoose.Types.ObjectId.isValid(mappingId || "") ||
      !fromDate ||
      !toDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Mapping ID, start date and end date are required",
      });
    }

    if (!isValidDateString(fromDate) || !isValidDateString(toDate)) {
      return res.status(400).json({
        success: false,
        message: "Dates must use YYYY-MM-DD format",
      });
    }

    if (fromDate > toDate) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot be after end date",
      });
    }

    const faculty = await Faculty.findOne({
      userId: req.user._id,
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
        message: "You are not authorized to view this class",
      });
    }

    const startDate = new Date(`${fromDate}T00:00:00.000+05:30`);
    const endDateExclusive = new Date(
      new Date(`${toDate}T00:00:00.000+05:30`).getTime() + 24 * 60 * 60 * 1000,
    );

    const records = await Attendance.find({
      facultyMapId: mapping._id,
      date: {
        $gte: startDate,
        $lt: endDateExclusive,
      },
    })
      .populate("timeSlotId", "lectureNo timeSlot")
      .populate("students.studentId", "rollNumber firstName lastName")
      .sort({ date: 1 });

    records.sort((a, b) => {
      const dateDifference = new Date(a.date) - new Date(b.date);

      if (dateDifference !== 0) return dateDifference;

      return (
        (a.timeSlotId?.lectureNo ?? 999) - (b.timeSlotId?.lectureNo ?? 999)
      );
    });

    return res.status(200).json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error("E-Attendance records error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch E-Attendance records",
    });
  }
};

const getTotalAttendanceRegister = async (req, res) => {
  try {
    const {
      session,
      course,
      branch,
      year,
      semester,
      section,
      fromDate,
      toDate,
    } = req.query;

    // 1. Validate required class filters
    if (
      !session ||
      !course ||
      year === undefined ||
      semester === undefined ||
      !section
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required class details.",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(course) ||
      (branch && !mongoose.Types.ObjectId.isValid(branch))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid course or branch ID.",
      });
    }

    // 2. Validate selected date range
    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: "Please select both From Date and To Date.",
      });
    }

    if (
      !isValidDateString(fromDate) ||
      !isValidDateString(toDate) ||
      fromDate > toDate ||
      daysBetween(fromDate, toDate) > 366
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid date range (maximum one year).",
      });
    }

    // 3. Create IST date boundaries
    const startDate = new Date(`${fromDate}T00:00:00.000+05:30`);

    const endExclusive = new Date(
      new Date(`${toDate}T00:00:00.000+05:30`).getTime() + 24 * 60 * 60 * 1000,
    );

    // 4. Find logged-in faculty
    const faculty = await Faculty.findOne({
      userId: req.user._id,
    })
      .select("_id")
      .lean();

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found.",
      });
    }

    // 5. Find mappings for the selected class
    const classFilter = {
      session,
      course,
      year,
      semester,
      section,
      branch: branch || null,
    };

    const mappings = await FacultyMap.find(classFilter)
      .select("_id facultyId")
      .lean();

    const assignedMappings = mappings.filter(
      (mapping) => String(mapping.facultyId) === String(faculty._id),
    );

    if (!assignedMappings.length) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this class.",
      });
    }

    const facultyMapIds = assignedMappings.map((mapping) => mapping._id);

    // 6. Find active students in the selected class
    const students = await Student.find({
      currentSession: session,
      course,
      year,
      semester,
      section,
      branch: branch || null,
      status: "Active",
    })
      .select("_id firstName lastName rollNumber enrollmentNumber")
      .lean();

    // Sort roll numbers naturally: 2 before 10
    students.sort((a, b) =>
      String(a.rollNumber ?? a.enrollmentNumber ?? "").localeCompare(
        String(b.rollNumber ?? b.enrollmentNumber ?? ""),
        undefined,
        { numeric: true, sensitivity: "base" },
      ),
    );

    // 7. Fetch ONLY attendance records within the selected range
    const attendanceFilter = {
      facultyMapId: {
        $in: facultyMapIds,
      },
      date: {
        $gte: startDate,
        $lt: endExclusive,
      },
    };

    const records = await Attendance.find(attendanceFilter)
      .select("date students facultyMapId timeSlotId")
      .sort({ date: 1 })
      .lean();

    // 8. Group attendance records by IST calendar date
    const lecturesByDate = new Map();

    for (const record of records) {
      const dateKey = getISTDateString(record.date);

      // Safety check: exclude dates outside the requested range
      if (dateKey < fromDate || dateKey > toDate) {
        continue;
      }

      const presentStudentIds = new Set(
        (record.students || [])
          .filter((student) => {
            const status = String(student.status || "")
              .trim()
              .toLowerCase();

            return status === "present" || status === "p";
          })
          .map((student) =>
            String(student.studentId?._id ?? student.studentId),
          ),
      );

      if (!lecturesByDate.has(dateKey)) {
        lecturesByDate.set(dateKey, []);
      }

      lecturesByDate.get(dateKey).push(presentStudentIds);
    }

    // 9. Get only dates that have saved attendance records
    const dates = [...lecturesByDate.keys()]
      .filter((date) => date >= fromDate && date <= toDate)
      .sort();

    const totalDays = dates.length;

    // 10. Calculate each student's daily attendance
    const register = students.map((student) => {
      const studentId = String(student._id);
      const dailyStatuses = {};
      let pointsEarned = 0;

      for (const dateKey of dates) {
        const lectures = lecturesByDate.get(dateKey) || [];

        // Present only if present in every saved lecture that day
        const attendedEveryLecture =
          lectures.length > 0 &&
          lectures.every((presentIds) => presentIds.has(studentId));

        dailyStatuses[dateKey] = attendedEveryLecture ? "P" : "A";

        if (attendedEveryLecture) {
          pointsEarned++;
        }
      }

      return {
        _id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        rollNumber: student.rollNumber ?? student.enrollmentNumber ?? "",
        dailyStatuses,
        pointsEarned,
        totalDays,
        percentage:
          totalDays > 0
            ? Number(((pointsEarned / totalDays) * 100).toFixed(2))
            : 0,
      };
    });

    // 11. Return the filtered attendance register
    return res.status(200).json({
      success: true,
      message:
        totalDays === 0
          ? "No attendance records found in the selected date range."
          : "Attendance register fetched successfully.",
      fromDate,
      toDate,
      totalRecords: records.length,
      dates,
      totalDays,
      students: register,
    });
  } catch (error) {
    console.error("Total attendance register error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate total attendance register.",
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
  getMyAttendance,
  getEAttendanceMappings,
  getEAttendanceStudents,
  getEAttendanceRecords,
  getTotalAttendanceRegister,
};
