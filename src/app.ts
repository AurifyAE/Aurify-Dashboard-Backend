import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import routes from './routes';
import { globalErrorHandler } from './middlewares/error.middleware';

const app = express();

// ─── Security: Helmet HTTP headers ──────────────────────────────────────────
// CSP disabled for now — TradingView widgets, Google Fonts, Socket.IO all need
// a tailored allowlist before strict CSP can be enabled safely.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(
  cors({
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
app.use(cookieParser());

// ─── Body parsers — reduced limits to prevent DoS via large payloads ─────────
// Individual upload routes that genuinely need larger bodies should override
// with their own limit via multer or a scoped middleware.
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ─── NoSQL Injection Protection ──────────────────────────────────────────────
// express-mongo-sanitize is incompatible with Express 5 (req.query is read-only).
// We implement an equivalent sanitizer that targets only req.body and req.params,
// stripping keys that start with $ or contain dots to prevent operator injection.
const sanitizeObject = (obj: unknown): unknown => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const clean: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    // Strip keys starting with $ (mongo operators) or containing dots
    if (key.startsWith('$') || key.includes('.')) continue;
    clean[key] = sanitizeObject((obj as Record<string, unknown>)[key]);
  }
  return clean;
};

app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.params) req.params = sanitizeObject(req.params) as Record<string, string>;
  next();
});

// ─── Logging ─────────────────────────────────────────────────────────────────
app.use(morgan('dev'));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(globalErrorHandler);

export default app;
