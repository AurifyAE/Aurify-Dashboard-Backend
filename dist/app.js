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
const helmet_1 = __importDefault(require('helmet'));
const cookie_parser_1 = __importDefault(require('cookie-parser'));
const routes_1 = __importDefault(require('./routes'));
const error_middleware_1 = require('./middlewares/error.middleware');
const app = (0, express_1.default)();
// ─── Security: Helmet HTTP headers ──────────────────────────────────────────
// CSP disabled for now — TradingView widgets, Google Fonts, Socket.IO all need
// a tailored allowlist before strict CSP can be enabled safely.
app.use(
  (0, helmet_1.default)({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(
  (0, cors_1.default)({
    origin: (origin, callback) => {
      const allowed = (process.env.CORS_ORIGINS || '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
      // Allow requests with no origin (Postman, server-to-server, mobile apps)
      if (!origin) return callback(null, true);
      if (allowed.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  })
);
// ─── Cookie parser ───────────────────────────────────────────────────────────
app.use((0, cookie_parser_1.default)());
// ─── Body parsers ─────────────────────────────────────────────────────────────
// Generous limit to accommodate high-resolution TV wallpapers & screen builder assets
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// ─── NoSQL Injection Protection ──────────────────────────────────────────────
// express-mongo-sanitize is incompatible with Express 5 (req.query is read-only).
// We implement an equivalent sanitizer that targets only req.body and req.params,
// stripping keys that start with $ or contain dots to prevent operator injection.
const sanitizeObject = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  const clean = {};
  for (const key of Object.keys(obj)) {
    // Strip keys starting with $ (mongo operators) or containing dots
    if (key.startsWith('$') || key.includes('.')) continue;
    clean[key] = sanitizeObject(obj[key]);
  }
  return clean;
};
app.use((req, _res, next) => {
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.params) req.params = sanitizeObject(req.params);
  next();
});
// ─── Logging ─────────────────────────────────────────────────────────────────
app.use((0, morgan_1.default)('dev'));
// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api', routes_1.default);
// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(error_middleware_1.globalErrorHandler);
exports.default = app;
