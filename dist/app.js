'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const express_1 = __importDefault(require('express'));
const cors_1 = __importDefault(require('cors'));
const morgan_1 = __importDefault(require('morgan'));
const routes_1 = __importDefault(require('./routes'));
const error_middleware_1 = require('./middlewares/error.middleware');
const app = (0, express_1.default)();
// Middlewares — allow frontend origin with credentials (required when fetch uses credentials: "include")
app.use(
  (0, cors_1.default)({
    origin: (origin, callback) => {
      // In development, reflect any origin back to allow localhost, 127.0.0.1, local network IP, etc.
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      const allowedOrigins = [process.env.FRONTEND_URL].filter(Boolean);
      const isAllowed = !origin || allowedOrigins.includes(origin);
      callback(null, isAllowed);
    },
    credentials: true,
  })
);
app.use(express_1.default.json());
app.use((0, morgan_1.default)('dev'));
// Routes
app.use('/api', routes_1.default);
// Global Error Handler
app.use(error_middleware_1.globalErrorHandler);
exports.default = app;
