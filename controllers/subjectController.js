const Subject = require("../models/Subject");
const User = require("../models/User");
async function addSubject(req, res) {
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
    let subject = new Subject(req.body);

    await subject.save();
    console.log("data saved sucessfully....");

    res.status(200).send({ success: true, message: "data saved successfully" });
  } catch (error) {
    res.status(500).send({ success: false, message: "something went wrong" });
    console.log(error);
  }
}

async function getSubjects(req, res) {
  try {
    const page = parseInt(req.query.pageNo) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const searchTerm = req.query.subjectFullName || "";

    const filter = {
      subjectFullName: {
        $regex: new RegExp(searchTerm, "i"),
      },
    };

    const totalSubjects = await Subject.countDocuments(filter);

    const subjects = await Subject.find(filter, {
      _id: 1,
      subjectFullName: 1,
      subjectCode: 1,
      subjectNickName: 1,
      subjectCategory: 1,
      subjectType: 1,
      creditScore: 1,
    })
      .sort({ subjectFullName: 1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalSubjects / limit);

    res.status(200).send({
      success: true,
      data: subjects,
      pagination: {
        currentPage: page,
        limit: limit,
        totalRecords: totalSubjects,
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

async function getSubject(req, res) {
  try {
    let subjectId = req.params.id;
    let subject = await Subject.findOne({ _id: subjectId });

    res.status(200).send({ success: true, data: subject });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .send({ success: false, message: "Something went wrong..." });
  }
}

async function editSubject(req, res) {
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
    let subject = await Subject.findOne({ _id: subjectId });
    Object.assign(subject, req.body);
    await subject.save();
    res
      .status(200)
      .send({ success: true, message: "Subject has been updated" });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Something went wrong in updating Subject.",
    });
  }
}

async function deleteSubject(req, res) {
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
    await Subject.findOneAndDelete({ _id: subjectId });
    res
      .status(200)
      .send({ success: true, message: "Subject has been deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Something went wrong in deleted Subject.",
    });
  }
}

module.exports = {
  addSubject,
  getSubjects,
  getSubject,
  editSubject,
  deleteSubject,
};
