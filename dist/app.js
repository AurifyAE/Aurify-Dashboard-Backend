"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const routes_1 = __importDefault(require("./routes"));
const error_middleware_1 = require("./middlewares/error.middleware");
const app = (0, express_1.default)();
// Middlewares — allow frontend origin with credentials (required when fetch uses credentials: "include")
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Read allowed origins from env — comma-separated list
        const allowed = (process.env.CORS_ORIGINS || '')
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean);
        // Allow requests with no origin (Postman, server-to-server, mobile apps)
        if (!origin)
            return callback(null, true);
        if (allowed.includes(origin))
            return callback(null, true);
        callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
app.use((0, morgan_1.default)('dev'));
// Routes
app.use('/api', routes_1.default);
// Global Error Handler
app.use(error_middleware_1.globalErrorHandler);
exports.default = app;
