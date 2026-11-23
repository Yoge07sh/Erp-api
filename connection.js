const mongoose = require("mongoose");

async function connect() {
  try {
    await mongoose.connect(
      "mongodb://127.0.0.1:27017/rdcollege_erp?replicaSet=rs0",
    );
    console.log("Database is Connected");
  } catch (error) {
    console.log(error);
  }
}

module.exports = connect;
