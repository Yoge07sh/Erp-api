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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const session = req.query.session || "";
    const facultyName = req.query.facultyName || "";

    let searchCondition = {};

    if (session.trim() !== "") {
      searchCondition.session = {
        $regex: session.trim(),
        $options: "i",
      };
    }

    if (facultyName.trim() !== "") {
      searchCondition.$or = [
        {
          "facultyId.firstName": {
            $regex: facultyName.trim(),
            $options: "i",
          },
        },
        {
          "facultyId.lastName": {
            $regex: facultyName.trim(),
            $options: "i",
          },
        },
      ];
    }

    // Count filtered records
    const totalRecords = await FacultyMap.aggregate([
      {
        $lookup: {
          from: "faculties",
          localField: "facultyId",
          foreignField: "_id",
          as: "facultyId",
        },
      },
      {
        $unwind: {
          path: "$facultyId",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: searchCondition,
      },
      {
        $count: "total",
      },
    ]);

    const total = totalRecords.length > 0 ? totalRecords[0].total : 0;

    // Get paginated data
    const facultyMapping = await FacultyMap.aggregate([
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
      {
        $match: searchCondition,
      },
      {
        $sort: {
          "facultyId.firstName": 1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).send({
      success: true,
      data: facultyMapping,
      pagination: {
        currentPage: page,
        limit: limit,
        totalRecords: total,
        totalPages: totalPages,
      },
    });
  } catch (err) {
    console.error("Error fetching faculty mapping:", err);

    res.status(500).send({
      success: false,
      message: "Failed to get faculty mapping.",
      error: err.message,
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
