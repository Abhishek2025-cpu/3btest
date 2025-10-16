const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error("❌ MONGO_URI is not defined in environment variables.");
    throw new Error("Missing MONGO_URI");
  }

  console.log("🔌 Attempting to connect to MongoDB...");

  try {
    // Add a connection timeout so the app fails fast if Atlas is unreachable
    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // ⏱️ Fail after 10s instead of hanging
      connectTimeoutMS: 10000,
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    // Don’t exit immediately — let Cloud Run start so logs are visible
    throw error;
  }
};

module.exports = connectDB;
