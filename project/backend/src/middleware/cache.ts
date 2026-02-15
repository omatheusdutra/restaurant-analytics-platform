import { createHash } from "crypto";
import { Request, Response, NextFunction } from "express";

interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ENTRIES = Number(process.env.CACHE_MAX_ENTRIES || 2000);

function evictOldestEntry() {
  const firstKey = cache.keys().next().value;
  if (firstKey) cache.delete(firstKey);
}

function buildBodyHash(body: unknown): string {
  const serialized = JSON.stringify(body ?? {});
  return createHash("sha256").update(serialized).digest("hex");
}

export const cacheMiddleware = (duration: number = CACHE_DURATION) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const canCacheMethod = req.method === "GET" || req.method === "POST";
    if (!canCacheMethod || duration <= 0) {
      return next();
    }

    // Never cache export/download responses.
    if (String((req.query as any)?.format || "").toLowerCase() === "csv") {
      return next();
    }

    const userKey = (req as any).userId ?? "anon";
    const queryKey = JSON.stringify(req.query || {});
    const bodyHash = req.method === "POST" ? buildBodyHash((req as any).body) : "";
    const cacheKey = `${userKey}:${req.method}:${req.path}:${queryKey}:${bodyHash}`;
    const cachedEntry = cache.get(cacheKey);

    if (cachedEntry && Date.now() - cachedEntry.timestamp < duration) {
      return res.json(cachedEntry.data);
    }

    const originalJson = res.json.bind(res);
    res.json = (data: any) => {
      const statusCode = typeof res.statusCode === "number" ? res.statusCode : 200;
      if (statusCode >= 200 && statusCode < 300) {
        if (cache.size >= MAX_CACHE_ENTRIES) {
          evictOldestEntry();
        }
        cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });
      }
      return originalJson(data);
    };

    next();
  };
};

const _cacheSweep = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_DURATION) {
      cache.delete(key);
    }
  }
}, 10 * 60 * 1000);

// @ts-ignore - unref is available in Node environments
if (typeof (_cacheSweep as any).unref === "function") {
  // @ts-ignore
  (_cacheSweep as any).unref();
}

export const clearCache = () => {
  cache.clear();
};
