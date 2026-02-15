import dotenv from "dotenv";

dotenv.config();

type LogLevel = "error" | "warn" | "info" | "debug";

function parseCorsOrigin(value: string | undefined): string | string[] {
  if (!value || value.trim() === "") return "http://localhost:3000";
  if (value.includes(",")) return value.split(",").map((v) => v.trim());
  return value.trim();
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase().trim());
}

const nodeEnv = (process.env.NODE_ENV || "development").toLowerCase();

export const env = {
  NODE_ENV: nodeEnv,
  PORT: Number(process.env.PORT || 3001),
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT_SECRET: process.env.JWT_SECRET || "",
  CORS_ORIGIN: parseCorsOrigin(process.env.CORS_ORIGIN),
  LOG_LEVEL: (process.env.LOG_LEVEL || "info") as LogLevel,
  ALLOW_REGISTRATION: parseBoolean(
    process.env.ALLOW_REGISTRATION,
    nodeEnv !== "production"
  ),
  AUTH_COOKIE_NAME: process.env.AUTH_COOKIE_NAME || "nextage_auth",
  AUTH_COOKIE_SECURE: parseBoolean(
    process.env.AUTH_COOKIE_SECURE,
    nodeEnv === "production"
  ),
};

export function validateEnv() {
  const missing: string[] = [];
  if (!env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!env.JWT_SECRET) missing.push("JWT_SECRET");
  if (!process.env.CORS_ORIGIN) missing.push("CORS_ORIGIN");
  if (missing.length) {
    const msg = `Missing env vars: ${missing.join(", ")}`;
    if (env.NODE_ENV !== "test") {
      throw new Error(msg);
    } else {
      console.warn("[env] ", msg);
    }
  }

  if (env.JWT_SECRET && env.JWT_SECRET.length < 32 && env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must have at least 32 characters in production");
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
