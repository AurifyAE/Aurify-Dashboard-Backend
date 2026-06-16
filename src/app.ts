import express from "express";
import cors from "cors";
import morgan from "morgan";
import routes from "./routes";
import { globalErrorHandler } from "./middlewares/error.middleware";

const app = express();

// Middlewares — allow frontend origin with credentials (required when fetch uses credentials: "include")
app.use(
  cors({
    origin: (origin, callback) => {
      // In development, reflect any origin back to allow localhost, 127.0.0.1, local network IP, etc.
      if (process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }
      const allowedOrigins = [process.env.FRONTEND_URL].filter(Boolean) as string[];
      const isAllowed = !origin || allowedOrigins.includes(origin);
      callback(null, isAllowed);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(morgan("dev"));

// Routes
app.use("/api", routes);

// Global Error Handler
app.use(globalErrorHandler);

export default app;
