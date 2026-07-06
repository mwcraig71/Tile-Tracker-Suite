import { Router } from "express";
import { db, equipmentTable, equipmentLogsTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { logger } from "../lib/logger";

// Express 5 typings do not infer params merged from the parent router
// (mergeParams), so pull the parent :id out with an explicit cast.
function parentEquipmentId(req: { params: unknown }): number {
  return parseInt((req.params as { id?: string }).id ?? "", 10);
}

export const equipmentLogsRouter = Router({ mergeParams: true });

equipmentLogsRouter.get("/", async (req, res) => {
  try {
    const id = parentEquipmentId(req);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [equipment] = await db.select().from(equipmentTable).where(eq(equipmentTable.id, id)).limit(1);
    if (!equipment) { res.status(404).json({ error: "Equipment not found" }); return; }

    const logs = await db
      .select()
      .from(equipmentLogsTable)
      .where(eq(equipmentLogsTable.equipmentId, id))
      .orderBy(desc(equipmentLogsTable.logDate));

    res.json(logs);
  } catch (err) {
    logger.error({ err }, "Failed to list equipment logs");
    res.status(500).json({ error: "Failed to list equipment logs" });
  }
});

equipmentLogsRouter.post("/", async (req, res) => {
  try {
    const id = parentEquipmentId(req);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [equipment] = await db.select().from(equipmentTable).where(eq(equipmentTable.id, id)).limit(1);
    if (!equipment) { res.status(404).json({ error: "Equipment not found" }); return; }

    const { logType, logDate, durationMinutes, operatorName, location, notes } = req.body;
    if (!logType || !logDate) {
      res.status(400).json({ error: "logType and logDate are required" });
      return;
    }

    const [log] = await db
      .insert(equipmentLogsTable)
      .values({
        equipmentId: id,
        logType,
        logDate: new Date(logDate),
        durationMinutes: durationMinutes ?? null,
        operatorName: operatorName ?? null,
        location: location ?? null,
        notes: notes ?? null,
      })
      .returning();

    logger.info({ equipmentId: id, logType }, "Equipment log created");
    res.status(201).json(log);
  } catch (err) {
    logger.error({ err }, "Failed to create equipment log");
    res.status(500).json({ error: "Failed to create equipment log" });
  }
});

equipmentLogsRouter.delete("/:logId", async (req, res) => {
  try {
    const id = parentEquipmentId(req);
    const logId = parseInt(req.params.logId, 10);
    if (isNaN(id) || isNaN(logId)) { res.status(400).json({ error: "Invalid id" }); return; }

    await db
      .delete(equipmentLogsTable)
      .where(and(eq(equipmentLogsTable.id, logId), eq(equipmentLogsTable.equipmentId, id)));

    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete equipment log");
    res.status(500).json({ error: "Failed to delete equipment log" });
  }
});
