const Course = require("../models/Course");
const User = require("../models/User");

async function addCourse(req, res) {
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
    let course = new Course(req.body);
    await course.save();
    res.status(200).send({ success: true, message: "Data saved successfully" });
  } catch (error) {
    console.error("AddCourse error:", error);

    if (error.code === 11000) {
      // duplicate courseCode
      return res
        .status(400)
        .json({ success: false, message: "Course code already exists" });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

async function getCourses(req, res) {
  try {
    const page = parseInt(req.query.pageNo) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const { courseFullName, courseCode, courseShortName } = req.query;

    // Build filter dynamically
    const filter = {};

    if (courseFullName) {
      filter.courseFullName = {
        $regex: courseFullName,
        $options: "i",
      };
    } else if (courseCode) {
      filter.courseCode = {
        $regex: courseCode,
        $options: "i",
      };
    } else if (courseShortName) {
      filter.courseShortName = {
        $regex: courseShortName,
        $options: "i",
      };
    }

    // Count matching courses
    const totalCourses = await Course.countDocuments(filter);

    // Fetch filtered courses with pagination
    const courses = await Course.find(filter).skip(skip).limit(limit);

    const totalPages = Math.ceil(totalCourses / limit);

    res.status(200).send({
      success: true,
      data: courses,
      pagination: {
        currentPage: page,
        limit: limit,
        totalRecords: totalCourses,
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

async function deleteCourse(req, res) {
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

    let courseId = req.params.id;
    const result = await Course.deleteOne({ _id: courseId });

    if (result) {
      res
        .status(200)
        .send({ success: true, message: "Course Deleted Successfull..." });
    } else {
      res
        .status(500)
        .send({ success: false, message: "Can not Delete Course" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Can not Delete, Something went wrong..!",
    });
  }
}

async function getCourse(req, res) {
  try {
    let courseId = req.params.id;
    let course = await Course.findOne({ _id: courseId });
    res.status(200).send({ success: true, data: course });
  } catch (error) {
    res
      .status(500)
      .send({ success: false, message: "Something went wrong..." });
  }
}

async function editCourse(req, res) {
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
    let courseId = req.params.id;
    let course = await Course.findOne({ _id: courseId });
    Object.assign(course, req.body);
    await course.save();
    console.log("Course has been updated Successfully.....");

    res.status(200).send({ success: true, message: "Course has been updated" });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Something went wrong in updating Course.",
    });
  }
}

module.exports = {
  addCourse,
  getCourses,
  deleteCourse,
  getCourse,
  editCourse,
};
