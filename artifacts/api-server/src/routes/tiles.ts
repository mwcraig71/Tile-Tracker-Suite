import { Router } from "express";
import { getTiles, getTileHistory } from "../lib/tile-client";
import { logger } from "../lib/logger";
import { db, equipmentTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const tilesRouter = Router();

tilesRouter.get("/", async (_req, res) => {
  try {
    const tiles = await getTiles();

    // Fetch all equipment records and attach them
    const allEquipment = await db.select().from(equipmentTable);
    const equipmentByTileUuid = new Map(
      allEquipment.map((e) => [e.tileUuid, e])
    );

    const tilesWithEquipment = tiles.map((tile) => ({
      ...tile,
      equipment: equipmentByTileUuid.get(tile.uuid) ?? null,
    }));

    res.json(tilesWithEquipment);
  } catch (err) {
    logger.error({ err }, "Failed to fetch tiles");
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("credentials") || message.includes("Invalid Tile")) {
      res.status(401).json({ error: "Tile authentication failed. Check TILE_EMAIL and TILE_PASSWORD." });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

tilesRouter.get("/:tileUuid/history", async (req, res) => {
  try {
    const { tileUuid } = req.params;
    const history = await getTileHistory(tileUuid);
    res.json(history);
  } catch (err) {
    logger.error({ err }, "Failed to fetch tile history");
    res.status(500).json({ error: "Failed to fetch tile history" });
  }
});
