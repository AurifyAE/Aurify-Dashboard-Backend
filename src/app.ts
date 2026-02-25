import express from "express";
import cors from "cors";
import morgan from "morgan";
import routes from "./routes";
import { globalErrorHandler } from "./middlewares/error.middleware";

const app = express();

// Middlewares — allow frontend origin with credentials (required when fetch uses credentials: "include")
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan("dev"));

// Routes
app.use("/api", routes);

// Global Error Handler
app.use(globalErrorHandler);

export default app;
