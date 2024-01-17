const mongoose = require("mongoose");
require("dotenv").config();

async function connectMongoDb() {
  const url = process.env.MONGODB_URI;

  try {
    const connection = await mongoose.connect(url);
    return connection;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

module.exports = connectMongoDb;
