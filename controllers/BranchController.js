const Branch = require("../models/Branch");
const Course = require("../models/Course");
const User = require("../models/User");

async function getCoursesForBranch(req, res) {
  try {
    let courses = await Course.find(
      {},
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
      message: "Something went wrong",
    });
  }
}
async function addBranch(req, res) {
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
        message: "Only admin  can perform this action",
      });
    }

    let branch = new Branch(req.body);
    await branch.save();
    res.status(200).send({ success: true, message: "Data Saved Successfully" });
  } catch (error) {
    console.log(error);
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ success: false, message: "Branch code already exists" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

async function getBranches(req, res) {
  try {
    const page = parseInt(req.query.pageNo) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const skip = (page - 1) * limit;

    const searchTerm = req.query.branchFullName || "";

    const filter = {
      branchFullName: {
        $regex: new RegExp(searchTerm, "i"),
      },
    };

    // Total branches matching search
    const totalBranches = await Branch.countDocuments(filter);

    // Current page branches
    const branches = await Branch.find(filter).skip(skip).limit(limit);

    const totalPages = Math.ceil(totalBranches / limit);

    res.status(200).send({
      success: true,
      data: branches,
      pagination: {
        currentPage: page,
        limit: limit,
        totalRecords: totalBranches,
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
async function deleteBranch(req, res) {
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
        message: "Only admin can delete branch",
      });
    }

    let branchId = req.params.id;
    const result = await Branch.deleteOne({ _id: branchId });

    if (result) {
      res
        .status(200)
        .send({ success: true, message: "Branch Deleted Successfull..." });
    } else {
      res
        .status(500)
        .send({ success: false, message: "Can not Delete Branch" });
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

async function getBranch(req, res) {
  try {
    let branchId = req.params.id;
    let branch = await Branch.findOne({ _id: branchId });
    res.status(200).send({ success: true, data: branch });
  } catch (error) {
    res
      .status(500)
      .send({ success: false, message: "Something went wrong..." });
  }
}

async function editBranch(req, res) {
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
        message: "Only admin can edit branch",
      });
    }

    let branchId = req.params.id;
    let branch = await Branch.findOne({ _id: branchId });
    Object.assign(branch, req.body);
    await branch.save();
    res.status(200).send({ success: true, message: "Branch has been updated" });
  } catch (error) {
    res
      .status(500)
      .send({
        success: false,
        message: "Something went wrong in updating Branch.",
      });
  }
}
module.exports = {
  getCoursesForBranch,
  addBranch,
  getBranches,
  getBranch,
  deleteBranch,
  editBranch,
};
