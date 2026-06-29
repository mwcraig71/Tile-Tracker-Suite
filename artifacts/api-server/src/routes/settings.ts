import { Router } from "express";
import { setCredentials, getCredentialsStatus, initSession } from "../lib/tile-client";
import { logger } from "../lib/logger";

export const settingsRouter = Router();

settingsRouter.get("/credentials", (_req, res) => {
  const status = getCredentialsStatus();
  res.json(status);
});

settingsRouter.post("/credentials", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || typeof email !== "string" || !email.trim()) {
    res.status(400).json({ error: "email is required" });
    return;
  }
  if (!password || typeof password !== "string" || !password.trim()) {
    res.status(400).json({ error: "password is required" });
    return;
  }

  setCredentials(email.trim(), password.trim());

  try {
    await initSession();
    logger.info({ email }, "Tile credentials updated via settings");
    res.json({ ok: true, email: email.trim(), sessionActive: true });
  } catch (err) {
    logger.warn({ err }, "Tile credential test failed");
    const message = err instanceof Error ? err.message : "Authentication failed";
    res.status(401).json({ error: message });
  }
});
