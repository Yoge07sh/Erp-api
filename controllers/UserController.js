const User = require("../models/User");

const bcrypt = require("bcrypt");

const jwt = require("jsonwebtoken");

async function getMyProfile(req, res) {
  try {
    const user = await User.findById(req.user._id, {
      firstName: 1,
      lastName: 1,
      email: 1,
      userRole: 1,
      mobNo: 1,
      userImage: 1,
      status: 1,
    });

    if (!user) {
      return res.status(404).send({
        success: false,

        message: "User not found",
      });
    }

    return res.status(200).send({
      success: true,

      data: {
        name: user.firstName,

        lastName: user.lastName,

        email: user.email,

        userRole: user.userRole,

        mobNo: user.mobNo,

        userImage: user.userImage,

        status: user.status,
      },
    });
  } catch (error) {
    console.log(error);

    return res.status(500).send({
      success: false,

      message: "Something went wrong",
    });
  }
}

async function doLogin(req, res) {
  try {
    const user = await User.findOne({
      email: req.body.email,

      status: "Active",
    });

    // User not found

    if (!user) {
      return res.status(401).send({
        success: false,

        message: "Invalid email or password",
      });
    }

    // Check password

    const validPassword = await bcrypt.compare(
      req.body.password,

      user.password,
    );

    if (!validPassword) {
      return res.status(401).send({
        success: false,

        message: "Invalid email or password",
      });
    }

    // Update last login

    user.lastLogin = new Date();

    await user.save();

    // JWT secret

    const secret_key = process.env.JWT_SECRET;

    // Create JWT

    const token = jwt.sign(
      {
        _id: user._id,

        email: user.email,

        userRole: user.userRole,
      },

      secret_key,

      {
        expiresIn: "30d",
      },
    );

    // Response data

    const data = {
      name: user.firstName,

      email: user.email,

      userRole: user.userRole,

      token: token,
    };

    return res.status(200).send({
      success: true,

      data: data,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).send({
      success: false,

      message: "Something went wrong",
    });
  }
}

module.exports = {
  getMyProfile,
  doLogin,
};
