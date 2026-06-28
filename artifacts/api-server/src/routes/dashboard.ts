import { Router } from "express";
import { getTiles } from "../lib/tile-client";
import { db, equipmentTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { eq } from "drizzle-orm";

export const dashboardRouter = Router();

dashboardRouter.get("/summary", async (_req, res) => {
  try {
    const tiles = await getTiles();
    const allEquipment = await db.select().from(equipmentTable);
    const equipmentByTileUuid = new Map(allEquipment.map((e) => [e.tileUuid, e]));

    const tilesWithEquipment = tiles.map((t) => ({
      ...t,
      equipment: equipmentByTileUuid.get(t.uuid) ?? null,
    }));

    const total = tilesWithEquipment.length;
    const lost = tilesWithEquipment.filter((t) => t.lost && !t.dead).length;
    const dead = tilesWithEquipment.filter((t) => t.dead).length;
    const active = total - lost - dead;

    // Count by equipment category
    const categoryMap = new Map<string, number>();
    for (const tile of tilesWithEquipment) {
      const cat = tile.equipment?.category ?? "Uncategorized";
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
