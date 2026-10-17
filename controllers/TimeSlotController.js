const TimeSlots = require("../models/TimeSlot");
const User = require("../models/User");
const getTimeSlots = async (req, res) => {
  try {
    const timeSlots = await TimeSlots.find({});
    res.status(200).send({
      success: true,
      data: timeSlots,
    });
  } catch (err) {
    console.log(err);

    res.status(400).send({
      success: false,
      message: err.message,
    });
  }
};

const AddTimeSlots = async (req, res) => {
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
    const timeslot = new TimeSlots(req.body);

    console.log(timeslot);

    await timeslot.save();

    res.status(200).send({
      success: true,
      data: timeslot,
    });
  } catch (err) {
    console.log(err);

    res.status(400).send({
      success: false,
      message: err.message,
    });
  }
};

const getTimeSlotById = async (req, res) => {
  try {
    const id = req.params.id;
    let timeslot = await TimeSlots.findOne({ _id: id });
    res.status(200).send({ success: true, data: timeslot });
  } catch (err) {
    console.log(err);
    res.status(400).send({
      success: false,
      message: err.message,
    });
  }
};

const editTimeSlot = async (req, res) => {
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
    const id = req.params.id;
    let data = req.body;
    await TimeSlots.updateOne({ _id: id }, { $set: data });
    res.status(200).send({ success: true });
  } catch (err) {
    console.log(err);
    res.status(400).send({
      success: false,
      message: err.message,
    });
  }
};

const deleteTimeSlots = async (req, res) => {
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
    let id = req.params.id;
    await TimeSlots.deleteOne({ _id: id });
    res.status(200).send({
      success: true,
    });
  } catch (err) {
    console.log(err);
    res.status(400).send({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  getTimeSlots,
  AddTimeSlots,
  editTimeSlot,
  getTimeSlotById,
  deleteTimeSlots,
};
