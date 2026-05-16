require('dotenv').config();
const mongoose = require('mongoose');


const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(' MongoDB connected');

  } catch (err) {
    console.error(' Initial MongoDB connection failed:', err);
    // process.exit(1); // Exit app if DB fails to connect initially
  }
};

module.exports = connectDB;
