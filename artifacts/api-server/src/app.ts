import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { securityHeaders, requireApiKey, rateLimit } from "./middleware/security";

const app: Express = express();

// Behind Replit's proxy — needed so req.ip reflects the real client IP.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(securityHeaders);

// CORS: locked down by default. Allow extra origins via ALLOWED_ORIGINS
// (comma-separated). In development, allow all for convenience.
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin:
      allowedOrigins.length > 0
        ? allowedOrigins
        : process.env.NODE_ENV !== "production",
  }),
);

app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true, limit: "256kb" }));

// General limiter for all API traffic, plus auth gate.
app.use("/api", rateLimit({ windowMs: 60_000, max: 300, name: "api" }));
app.use("/api", requireApiKey);
app.use("/api", router);

export default app;
