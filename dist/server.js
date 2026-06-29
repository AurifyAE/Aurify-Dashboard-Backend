'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const app_1 = __importDefault(require('./app'));
const dotenv_1 = __importDefault(require('dotenv'));
const db_1 = __importDefault(require('./config/db'));
const node_dns_1 = __importDefault(require('node:dns'));
dotenv_1.default.config();
const PORT = process.env.PORT || 5000;
const startServer = async () => {
  try {
    node_dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
    await (0, db_1.default)();
    // Start Express Server
    app_1.default.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};
startServer(); // restarted with permissive development CORS
