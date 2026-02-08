import dotenv from "dotenv";

dotenv.config();

type LogLevel = "error" | "warn" | "info" | "debug";

function parseCorsOrigin(value: string | undefined): string | string[] {
  if (!value || value.trim() === "") return "http://localhost:3000";
  if (value.includes(",")) return value.split(",").map((v) => v.trim());
  return value.trim();
}

export const env = {
  NODE_ENV: (process.env.NODE_ENV || "development").toLowerCase(),
  PORT: Number(process.env.PORT || 3001),
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT_SECRET: process.env.JWT_SECRET || "",
  CORS_ORIGIN: parseCorsOrigin(process.env.CORS_ORIGIN),
  LOG_LEVEL: (process.env.LOG_LEVEL || "info") as LogLevel,
};

export function validateEnv() {
  const missing: string[] = [];
  if (!env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!env.JWT_SECRET) missing.push("JWT_SECRET");
  if (!process.env.CORS_ORIGIN) missing.push("CORS_ORIGIN");
  if (missing.length) {
    // Fail fast to avoid insecure defaults.
    const msg = `Missing env vars: ${missing.join(", ")}`;
    if (env.NODE_ENV !== "test") {
      throw new Error(msg);
    } else {
      console.warn("[env] ", msg);
    }
  }
}

export function log(level: LogLevel, ...args: any[]) {
  const priority: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3 };
  const current = priority[env.LOG_LEVEL];
  const want = priority[level];
  if (want <= current) {
    // eslint-disable-next-line no-console
    (console as any)[level] ? (console as any)[level](...args) : console.log(...args);
  }
}
