'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.disconnectDB = void 0;
const mongoose_1 = __importDefault(require('mongoose'));
const connectDB = async () => {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI || MONGO_URI.length < 10) {
    throw new Error(
      'MONGO_URI is not defined or invalid. Add MONGO_URI=mongodb://localhost:27017/aurify to your .env file.'
    );
  }
  try {
    const opts = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    };
    await mongoose_1.default.connect(MONGO_URI, opts);
    console.log('✅ MongoDB Connected Successfully');
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    process.exit(1);
  }
};
// Graceful disconnect (e.g. on SIGTERM)
const disconnectDB = async () => {
  try {
    await mongoose_1.default.disconnect();
    console.log('MongoDB disconnected');
  } catch (err) {
    console.error('Error disconnecting MongoDB:', err);
  }
};
exports.disconnectDB = disconnectDB;
exports.default = connectDB;
