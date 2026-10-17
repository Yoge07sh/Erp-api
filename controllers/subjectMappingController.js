const Mapping = require("../models/SubjectMap");
const Subject = require("../models/Subject");
const Course = require("../models/Course");
const Branch = require("../models/Branch");
const User = require("../models/User");

async function getSubjectsForMapping(req, res) {
  try {
    let subjects = await Subject.find(
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

    let sendSubjects = [];

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
    console.log(error);

    res.status(500).send({
      success: false,
      message: "something went wrong",
    });
  }
}

async function getCoursesForMapping(req, res) {
  try {
    let courses = await Course.find(
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

    let sendCourses = [];

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
    console.log(error);

    res.status(500).send({
      success: false,
      message: "something went wrong",
    });
  }
}

async function getBranchsForMapping(req, res) {
  try {
    let branchs = await Branch.find(
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

    let sendBranchs = [];

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
    console.log(error);

    res.status(500).send({
      success: false,
      message: "something went wrong",
    });
  }
}

async function addSubjectMapping(req, res) {
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

    let subjectmap = new Mapping(req.body);

    await subjectmap.save();

    res.status(200).send({
      success: true,
      message: "data saved successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "something went wrong",
    });
  }
}

async function getSubjectsMapped(req, res) {
  try {
    const page = parseInt(req.query.pageNo) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const searchTerm = req.query.course || "";

    let filter = {};

    // Search course by name
    if (searchTerm.trim() !== "") {
      const matchingCourses = await Course.find({
        $or: [
          {
            courseFullName: {
              $regex: searchTerm.trim(),
              $options: "i",
            },
          },
          {
            courseShortName: {
              $regex: searchTerm.trim(),
              $options: "i",
            },
          },
        ],
      }).select("_id");

      const courseIds = matchingCourses.map((course) => course._id);

      filter.course = { $in: courseIds };
    }

    const totalSubjectsMapped = await Mapping.countDocuments(filter);

    const subjectsmap = await Mapping.find(filter)
      .populate("subject", "subjectNickName subjectFullName")
      .populate("course", "courseShortName courseFullName")
      .populate("branch", "branchShortName branchFullName")
      .sort({ session: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalSubjectsMapped / limit);

    res.status(200).send({
      success: true,
      data: subjectsmap,
      pagination: {
        currentPage: page,
        limit: limit,
        totalRecords: totalSubjectsMapped,
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
const getSubjectMappingById = async (req, res) => {
  try {
    let id = req.params.id;

    let subjectMapping = await Mapping.findOne({
      _id: id,
    })
      .populate("subject", "subjectNickName subjectFullName")
      .populate("course", "courseShortName courseFullName")
      .populate("branch", "branchShortName branchFullName");

    res.status(200).send({
      success: true,
      data: subjectMapping,
    });
  } catch (err) {
    console.log(err);

    res.status(400).send({
      success: false,
      message: "Something went Wrong..!",
    });
  }
};

const editSubjectMapping = async (req, res) => {
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

    let subjectId = req.params.id;

    let subjectmap = await Mapping.findOne({
      _id: subjectId,
    });

    if (!subjectmap) {
      return res.status(404).send({
        success: false,
        message: "Subject Mapping not found",
      });
    }

    Object.assign(subjectmap, req.body);

    await subjectmap.save();

    res.status(200).send({
      success: true,
      message: "SubjectMapping has been updated",
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Something went wrong in updating SubjectMapping",
    });
  }
};

const deleteSubjectMapping = async (req, res) => {
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

    let subjectId = req.params.id;

    const result = await Mapping.deleteOne({
      _id: subjectId,
    });

    if (result.deletedCount > 0) {
      res.status(200).send({
        success: true,
        message: "Subject Mapping Deleted Successfully",
      });
    } else {
      res.status(404).send({
        success: false,
        message: "Subject Mapping not found",
      });
    }
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Can not Delete, Something went wrong..!",
    });
  }
};

module.exports = {
  getSubjectsForMapping,
  getCoursesForMapping,
  getBranchsForMapping,
  addSubjectMapping,
  getSubjectsMapped,
  editSubjectMapping,
  getSubjectMappingById,
  deleteSubjectMapping,
};
