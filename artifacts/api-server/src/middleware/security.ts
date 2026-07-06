import { timingSafeEqual } from "crypto";
import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger";

// ── Security headers ─────────────────────────────────────────────────────────

export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  next();
}

// ── Rate limiting (in-memory sliding window, per IP) ────────────────────────

interface Bucket {
  count: number;
  windowStart: number;
}

export function rateLimit(options: { windowMs: number; max: number; name: string }) {
  const { windowMs, max, name } = options;
  const buckets = new Map<string, Bucket>();

  // Periodically drop stale buckets so the map can't grow unbounded.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now - bucket.windowStart > windowMs) buckets.delete(key);
    }
  }, windowMs);
  sweep.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now - bucket.windowStart > windowMs) {
      buckets.set(key, { count: 1, windowStart: now });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > max) {
      logger.warn({ ip: key, limiter: name }, "Rate limit exceeded");
      res.status(429).json({ error: "Too many requests. Try again shortly." });
      return;
    }
    next();
  };
}

// ── API-key auth ─────────────────────────────────────────────────────────────

const PUBLIC_PATHS: Array<{ method?: string; pattern: RegExp }> = [
  { pattern: /^\/healthz$/ },
  // The QR scan flow is intentionally public: anyone who scans a printed QR
  // label can view basic equipment info and report a GPS location.
  { pattern: /^\/scan\/[^/]+$/ },
];

function isPublic(req: Request): boolean {
  return PUBLIC_PATHS.some(
    (p) => p.pattern.test(req.path) && (!p.method || p.method === req.method),
  );
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Gate every /api route behind a shared API key.
 *
 * The key is supplied via the APP_API_KEY environment variable (Replit
 * secret). Clients send it as `Authorization: Bearer <key>` or `X-API-Key`.
 *
 * Fails closed in production: if APP_API_KEY is not configured, all
 * non-public routes return 503 rather than running wide open. In
 * development the gate is bypassed with a loud warning.
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  if (isPublic(req)) {
    next();
    return;
  }

  const configuredKey = process.env.APP_API_KEY;

  if (!configuredKey) {
    if (process.env.NODE_ENV === "production") {
      res.status(503).json({
        error: "Server is not configured: APP_API_KEY is not set.",
      });
      return;
    }
    warnOnceMissingKey();
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const headerKey = req.headers["x-api-key"];
  const provided = bearer ?? (typeof headerKey === "string" ? headerKey : null);

  if (!provided || !safeEqual(provided, configuredKey)) {
    res.status(401).json({ error: "Unauthorized: missing or invalid API key." });
    return;
  }

  next();
}

let warnedMissingKey = false;
function warnOnceMissingKey(): void {
  if (warnedMissingKey) return;
  warnedMissingKey = true;
  logger.warn(
    "APP_API_KEY is not set — API auth is DISABLED (development only). Set APP_API_KEY before exposing this server.",
  );
}
