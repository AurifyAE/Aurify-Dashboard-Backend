import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI || MONGO_URI.length < 10) {
    throw new Error(
      "MONGO_URI is not defined or invalid. Add MONGO_URI=mongodb://localhost:27017/aurify to your .env file."
    );
  }
  try {
    const opts: mongoose.ConnectOptions = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    };
    await mongoose.connect(MONGO_URI, opts);
    console.log("✅ MongoDB Connected Successfully");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    process.exit(1);
  }
};

// Graceful disconnect (e.g. on SIGTERM)
export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log("MongoDB disconnected");
  } catch (err) {
    console.error("Error disconnecting MongoDB:", err);
  }
};

export default connectDB;
