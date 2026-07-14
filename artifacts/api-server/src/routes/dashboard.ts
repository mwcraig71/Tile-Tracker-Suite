import { Router } from "express";
import { getTiles } from "../lib/tile-client";
import { db, equipmentTable } from "@workspace/db";
import { logger } from "../lib/logger";

export const dashboardRouter = Router();

dashboardRouter.get("/summary", async (_req, res) => {
  try {
    // Tile cloud being unreachable (or not configured) shouldn't blank the
    // whole dashboard — QR/RFID-only equipment still exists without it.
    let tiles: Awaited<ReturnType<typeof getTiles>> = [];
    try {
      tiles = await getTiles();
    } catch (err) {
      logger.warn({ err }, "Dashboard: Tile data unavailable, continuing without it");
    }
    const allEquipment = await db.select().from(equipmentTable);
    const equipmentByTileUuid = new Map(allEquipment.map((e) => [e.tileUuid, e]));

    const tilesWithEquipment = tiles.map((t) => ({
      ...t,
      equipment: equipmentByTileUuid.get(t.uuid) ?? null,
    }));

    // Equipment that has no Tile (QR/RFID-only) still counts as an asset.
    const untrackedEquipment = allEquipment.filter((e) => !e.tileUuid);

    const lost = tilesWithEquipment.filter((t) => t.lost && !t.dead).length;
    const dead = tilesWithEquipment.filter((t) => t.dead).length;
    const total = tilesWithEquipment.length + untrackedEquipment.length;
    const active = total - lost - dead;

    // Count by equipment category
    const categoryMap = new Map<string, number>();
    for (const tile of tilesWithEquipment) {
      const cat = tile.equipment?.category ?? "Uncategorized";
      categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
    }
    for (const eq of untrackedEquipment) {
      const cat = eq.category ?? "Uncategorized";
      categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
    }
    const byCategory = Array.from(categoryMap.entries()).map(([category, count]) => ({
      category,
      count,
    }));

    const recentlyLost = tilesWithEquipment.filter((t) => t.lost).slice(0, 5);

    res.json({ total, active, lost, dead, byCategory, recentlyLost });
  } catch (err) {
    logger.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Failed to get dashboard summary" });
  }
});
