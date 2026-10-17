const User = require("./models/User");
const bcrypt = require("bcrypt");

async function createAdmin() {
  try {
    const adminExists = await User.findOne({
      email: "admin@yopmail.com",
    });

    if (adminExists) {
      console.log("Admin already exists...");
      return;
    }

    const encryptedPassword = await bcrypt.hash("123456", 10);

    const admin = new User({
      firstName: "Project",
      lastName: "Admin",
      email: "admin@yopmail.com",
      password: encryptedPassword,
      userRole: "admin",
      status: "Active",
    });

    await admin.save();

    console.log("Admin created successfully...");
  } catch (error) {
    console.log(error);
  }
}

module.exports = createAdmin;

