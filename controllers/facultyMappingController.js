const FacultyMap = require("../models/FacultyMap");
const Faculty = require("../models/Faculty");
const Branch = require("../models/Branch");
const Course = require("../models/Course");
const Subject = require("../models/Subject");
const User = require("../models/User");
const getFacultyForMapping = async (req, res) => {
  try {
    const faculties = await Faculty.find(
      {},
      {
        _id: 1,
        firstName: 1,
        lastName: 1,
      },
    ).sort({ firstName: 1 });

    res.status(200).send({
      success: true,
      data: faculties,
    });
  } catch (error) {
    console.error("Error fetching faculties for mapping:", error);

    res.status(500).send({
      success: false,
      message: "Failed to fetch faculties",
      error: error.message,
    });
  }
};

async function getCoursesForMapping(req, res) {
  try {
    const courses = await Course.find(
      {
        courseFullName: {
          $regex: new RegExp(req.query.courseFullName || "", "i"),
        },
      },
      {
        _id: 1,
        courseFullName: 1,
      },
    );

    const sendCourses = [];

    for (let i = 0; i < courses.length; i++) {
      sendCourses.push({
        value: courses[i]._id,
        label: courses[i].courseFullName,
      });
    }

    res.status(200).send({
      success: true,
      data: sendCourses,
    });
  } catch (error) {
    console.error(error);

    res.status(500).send({
      success: false,
      message: "Something went wrong",
    });
  }
}

async function getBranchsForMapping(req, res) {
  try {
    const branchs = await Branch.find(
      {
        branchFullName: {
          $regex: new RegExp(req.query.branchFullName || "", "i"),
        },
      },
      {
        _id: 1,
        branchFullName: 1,
      },
    );

    const sendBranchs = [];

    for (let i = 0; i < branchs.length; i++) {
      sendBranchs.push({
        value: branchs[i]._id,
        label: branchs[i].branchFullName,
      });
    }

    res.status(200).send({
      success: true,
      data: sendBranchs,
    });
  } catch (error) {
    console.error(error);

    res.status(500).send({
      success: false,
      message: "Something went wrong",
    });
  }
}

async function getSubjectsForMapping(req, res) {
  try {
    const subjects = await Subject.find(
      {
        subjectFullName: {
          $regex: new RegExp(req.query.subjectFullName || "", "i"),
        },
      },
      {
        _id: 1,
        subjectFullName: 1,
      },
    );

    const sendSubjects = [];

    for (let i = 0; i < subjects.length; i++) {
      sendSubjects.push({
        value: subjects[i]._id,
        label: subjects[i].subjectFullName,
      });
    }

    res.status(200).send({
      success: true,
      data: sendSubjects,
    });
  } catch (error) {
    console.error(error);

    res.status(500).send({
      success: false,
      message: "Something went wrong",
    });
  }
}

const addFacultyMapping = async (req, res) => {
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
    const facultyMapping = new FacultyMap(req.body);

    await facultyMapping.save();

    res.status(201).json({
      success: true,
      message: "Faculty mapping added successfully.",
    });
  } catch (error) {
    console.error("Error adding faculty mapping:", error);

    res.status(500).json({
      success: false,
      message: "Failed to add faculty mapping.",
      error: error.message,
    });
  }
};

const getFacultyList = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 5);
    const skip = (page - 1) * limit;

    const { filterBy = "session", search = "" } = req.query;
    const searchTerm = search.trim();

    const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const regex = {
      $regex: escapeRegex(searchTerm),
      $options: "i",
    };

    const allowedFilters = [
      "session",
      "facultyName",
      "course",
      "branch",
      "subject",
      "year",
      "semester",
      "section",
    ];

    // Common lookup stages
    const lookupStages = [
      {
        $lookup: {
          from: "faculties",
          localField: "facultyId",
          foreignField: "_id",
          as: "facultyId",
        },
      },
      {
        $lookup: {
          from: "courses",
          localField: "course",
          foreignField: "_id",
          as: "course",
        },
      },
      {
        $lookup: {
          from: "branches",
          localField: "branch",
          foreignField: "_id",
          as: "branch",
        },
      },
      {
        $lookup: {
          from: "subjects",
          localField: "subjectId",
          foreignField: "_id",
          as: "subjectId",
        },
      },
      {
        $unwind: {
          path: "$facultyId",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$course",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$branch",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$subjectId",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    let matchCondition = {};

    if (searchTerm && allowedFilters.includes(filterBy)) {
      switch (filterBy) {
        case "session":
          matchCondition.session = regex;
          break;

        case "facultyName":
          matchCondition.$or = [
            { "facultyId.firstName": regex },
            { "facultyId.lastName": regex },
          ];
          break;

        case "course":
          matchCondition.$or = [
            { "course.courseFullName": regex },
            { "course.courseShortName": regex },
          ];
          break;

        case "branch":
          matchCondition.$or = [
            { "branch.branchFullName": regex },
            { "branch.branchShortName": regex },
          ];
          break;

        case "subject":
          matchCondition.$or = [
            { "subjectId.subjectFullName": regex },
            { "subjectId.subjectNickName": regex },
          ];
          break;

        case "section":
          matchCondition.section = regex;
          break;

        case "year":
        case "semester": {
          const numericValue = Number(searchTerm);

          // Only allow valid numeric searches for these fields.
          if (searchTerm !== "" && Number.isFinite(numericValue)) {
            matchCondition[filterBy] = numericValue;
          } else {
            // No documents can match this impossible condition.
            matchCondition[filterBy] = { $exists: false };
          }
          break;
        }
      }
    } else if (searchTerm && !allowedFilters.includes(filterBy)) {
      return res.status(400).send({
        success: false,
        message: "Invalid filter field.",
      });
    }

    const pipeline = [
      ...lookupStages,
      ...(Object.keys(matchCondition).length
        ? [{ $match: matchCondition }]
        : []),
    ];

    // Count filtered records
    const countResult = await FacultyMap.aggregate([
      ...pipeline,
      { $count: "total" },
    ]);

    const totalRecords = countResult.length > 0 ? countResult[0].total : 0;

    // Get filtered and paginated records
    const facultyMapping = await FacultyMap.aggregate([
      ...pipeline,
      {
        $sort: {
          "facultyId.firstName": 1,
        },
      },
      { $skip: skip },
      { $limit: limit },
    ]);

    const totalPages = Math.ceil(totalRecords / limit);

    return res.status(200).send({
      success: true,
      data: facultyMapping,
      pagination: {
        currentPage: page,
        limit,
        totalRecords,
        totalPages,
      },
    });
  } catch (err) {
    console.error("Error fetching faculty mapping:", err);

    return res.status(500).send({
      success: false,
      message: "Failed to get faculty mapping.",
    });
  }
};

const getFacultyMappingById = async (req, res) => {
  try {
    let facultyId = req.params.id;

    let facultyMap = await FacultyMap.findOne({
      _id: facultyId,
    });

    console.log("Faculty Mapping:", facultyMap);

    if (!facultyMap) {
      return res.status(404).send({
        success: false,
        message: "Faculty Mapping not found",
      });
    }

    res.status(200).send({
      success: true,
      data: facultyMap,
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Something went wrong...",
    });
  }
};

const editFacultyMapping = async (req, res) => {
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

    let facultyMap = await FacultyMap.findOne({
      _id: facultyId,
    });

    if (!facultyMap) {
      return res.status(404).send({
        success: false,
        message: "Faculty Mapping not found",
      });
    }

    Object.assign(facultyMap, req.body);
    await facultyMap.save();

    res.status(200).send({
      success: true,
      message: "FacultyMapping has been updated",
      data: facultyMap,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Something went wrong in updating FacultyMapping",
    });
  }
};

const deleteFacultyMapping = async (req, res) => {
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
    const result = await FacultyMap.deleteOne({ _id: facultyId });

    if (result) {
      res.status(200).send({
        success: true,
        message: "Faculty Mapping Deleted Successfull...",
      });
    } else {
      res
        .status(500)
        .send({ success: false, message: "Can not Delete Faculty Mapping" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Can not Delete, Something went wrong..!",
    });
  }
};

const getFacultyMapForAttendance = async (req, res) => {
  try {
    const { session, course, branch, year, semester, section } = req.query;

    const facultyMaps = await FacultyMap.find({
      session: session,
      course: course,
      branch: branch,
      year: year,
      semester: semester,
      section: section,
    })
      .populate("facultyId")
      .populate("subjectId");

    res.status(200).json({
      success: true,
      data: facultyMaps,
    });
  } catch (error) {
    console.error("Faculty Mapping Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch faculty mapping",
    });
  }
};
module.exports = {
  getFacultyForMapping,
  getBranchsForMapping,
  getCoursesForMapping,
  getSubjectsForMapping,
  addFacultyMapping,
  getFacultyList,
  getFacultyMappingById,
  editFacultyMapping,
  deleteFacultyMapping,
  getFacultyMapForAttendance,
};
