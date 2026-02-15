import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import compression from "compression";
import { env, validateEnv } from "./config/env";
import helmet from "helmet";
import pino from "pino";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import { randomUUID } from "crypto";
import authRoutes from "./routes/auth";
import metricsRoutes from "./routes/metrics";
import exploreRoutes from "./routes/explore";
import dashboardRoutes from "./routes/dashboards";

validateEnv();

const app = express();
const PORT = env.PORT;

if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());

const logger = pino({ level: env.LOG_LEVEL || "info" });
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => (req.headers["x-request-id"] as string) || randomUUID(),
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.body.password",
        "req.body.currentPassword",
        "req.body.newPassword",
      ],
      remove: true,
    },
  })
);

const corsOptions = {
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/ready", (req: Request, res: Response) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

const authLimiter = rateLimit({ windowMs: 60_000, max: 30 });
app.use("/api/auth", authLimiter, authRoutes);

if (env.NODE_ENV !== "test") {
  const apiLimiter = rateLimit({ windowMs: 60_000, max: 300 });
  app.use("/api", apiLimiter);
}

app.use("/api/metrics", metricsRoutes);
app.use("/api/explore", exploreRoutes);
app.use("/api/dashboards", dashboardRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  req.log?.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
    logger.info(`Health: http://localhost:${PORT}/health`);
  });
}

export default app;
