import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes';
import { globalErrorHandler } from './middlewares/error.middleware';

const app = express();

// Middlewares — allow frontend origin with credentials (required when fetch uses credentials: "include")
app.use(
  cors({
    origin: (origin, callback) => {
      // Read allowed origins from env — comma-separated list
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// Routes
app.use('/api', routes);

// Global Error Handler
app.use(globalErrorHandler);

export default app;
