import { Router } from "express";
import { db, equipmentTable, equipmentComponentsTable, componentLogsTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { logger } from "../lib/logger";

// Express 5 typings do not infer params merged from the parent router
// (mergeParams), so pull the parent :id out with an explicit cast.
function parentEquipmentId(req: { params: unknown }): number {
  return parseInt((req.params as { id?: string }).id ?? "", 10);
}

export const equipmentComponentsRouter = Router({ mergeParams: true });

function parseDate(val: unknown): Date | null {
  if (!val || typeof val !== "string") return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

// ── Components CRUD ──────────────────────────────────────────────────────────

equipmentComponentsRouter.get("/", async (req, res) => {
  try {
    const id = parentEquipmentId(req);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [equipment] = await db.select().from(equipmentTable).where(eq(equipmentTable.id, id)).limit(1);
    if (!equipment) { res.status(404).json({ error: "Equipment not found" }); return; }

    const components = await db
      .select()
      .from(equipmentComponentsTable)
      .where(eq(equipmentComponentsTable.parentEquipmentId, id))
      .orderBy(equipmentComponentsTable.createdAt);

    res.json(components);
  } catch (err) {
    logger.error({ err }, "Failed to list components");
    res.status(500).json({ error: "Failed to list components" });
  }
});

equipmentComponentsRouter.post("/", async (req, res) => {
  try {
    const id = parentEquipmentId(req);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [equipment] = await db.select().from(equipmentTable).where(eq(equipmentTable.id, id)).limit(1);
    if (!equipment) { res.status(404).json({ error: "Equipment not found" }); return; }

    const { name, componentType, serialNumber, notes, inServiceDate, outOfServiceDate } = req.body;
    if (!name || !componentType) {
      res.status(400).json({ error: "name and componentType are required" });
      return;
    }

    const [component] = await db
      .insert(equipmentComponentsTable)
      .values({
        parentEquipmentId: id,
        name,
        componentType,
        serialNumber: serialNumber ?? null,
        notes: notes ?? null,
        inServiceDate: parseDate(inServiceDate),
        outOfServiceDate: parseDate(outOfServiceDate),
      })
      .returning();

    logger.info({ equipmentId: id, name }, "Component created");
    res.status(201).json(component);
  } catch (err) {
    logger.error({ err }, "Failed to create component");
    res.status(500).json({ error: "Failed to create component" });
  }
});

equipmentComponentsRouter.patch("/:componentId", async (req, res) => {
  try {
    const id = parentEquipmentId(req);
    const componentId = parseInt(req.params.componentId, 10);
    if (isNaN(id) || isNaN(componentId)) { res.status(400).json({ error: "Invalid id" }); return; }

    const { name, componentType, serialNumber, notes, inServiceDate, outOfServiceDate } = req.body;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (componentType !== undefined) updates.componentType = componentType;
    if (serialNumber !== undefined) updates.serialNumber = serialNumber ?? null;
    if (notes !== undefined) updates.notes = notes ?? null;
    if (inServiceDate !== undefined) updates.inServiceDate = parseDate(inServiceDate);
    if (outOfServiceDate !== undefined) updates.outOfServiceDate = parseDate(outOfServiceDate);

    const [updated] = await db
      .update(equipmentComponentsTable)
      .set(updates)
      .where(and(
        eq(equipmentComponentsTable.id, componentId),
        eq(equipmentComponentsTable.parentEquipmentId, id),
      ))
      .returning();

    if (!updated) { res.status(404).json({ error: "Component not found" }); return; }
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to update component");
    res.status(500).json({ error: "Failed to update component" });
  }
});

equipmentComponentsRouter.delete("/:componentId", async (req, res) => {
  try {
    const id = parentEquipmentId(req);
    const componentId = parseInt(req.params.componentId, 10);
    if (isNaN(id) || isNaN(componentId)) { res.status(400).json({ error: "Invalid id" }); return; }

    await db.delete(equipmentComponentsTable).where(and(
      eq(equipmentComponentsTable.id, componentId),
      eq(equipmentComponentsTable.parentEquipmentId, id),
    ));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete component");
    res.status(500).json({ error: "Failed to delete component" });
  }
});

// ── Component Logs ───────────────────────────────────────────────────────────

async function findScopedComponent(equipmentId: number, componentId: number) {
  const [component] = await db
    .select()
    .from(equipmentComponentsTable)
    .where(and(
      eq(equipmentComponentsTable.id, componentId),
      eq(equipmentComponentsTable.parentEquipmentId, equipmentId),
    ))
    .limit(1);
  return component ?? null;
}

equipmentComponentsRouter.get("/:componentId/logs", async (req, res) => {
  try {
    const id = parentEquipmentId(req);
    const componentId = parseInt(req.params.componentId, 10);
    if (isNaN(id) || isNaN(componentId)) { res.status(400).json({ error: "Invalid id" }); return; }

    const component = await findScopedComponent(id, componentId);
    if (!component) { res.status(404).json({ error: "Component not found" }); return; }

    const logs = await db
      .select()
      .from(componentLogsTable)
      .where(eq(componentLogsTable.componentId, componentId))
      .orderBy(desc(componentLogsTable.logDate));

    res.json(logs);
  } catch (err) {
    logger.error({ err }, "Failed to list component logs");
    res.status(500).json({ error: "Failed to list component logs" });
  }
});

equipmentComponentsRouter.post("/:componentId/logs", async (req, res) => {
  try {
    const id = parentEquipmentId(req);
    const componentId = parseInt(req.params.componentId, 10);
    if (isNaN(id) || isNaN(componentId)) { res.status(400).json({ error: "Invalid id" }); return; }

    const component = await findScopedComponent(id, componentId);
    if (!component) { res.status(404).json({ error: "Component not found" }); return; }

    const { logType, logDate, durationMinutes, operatorName, location, notes } = req.body;
    if (!logType || !logDate) {
      res.status(400).json({ error: "logType and logDate are required" });
      return;
    }

    const [log] = await db
      .insert(componentLogsTable)
      .values({
        componentId,
        logType,
        logDate: new Date(logDate),
        durationMinutes: durationMinutes ?? null,
        operatorName: operatorName ?? null,
        location: location ?? null,
        notes: notes ?? null,
      })
      .returning();

    res.status(201).json(log);
  } catch (err) {
    logger.error({ err }, "Failed to create component log");
    res.status(500).json({ error: "Failed to create component log" });
  }
});

equipmentComponentsRouter.delete("/:componentId/logs/:logId", async (req, res) => {
  try {
    const id = parentEquipmentId(req);
    const componentId = parseInt(req.params.componentId, 10);
    const logId = parseInt(req.params.logId, 10);
    if (isNaN(id) || isNaN(componentId) || isNaN(logId)) { res.status(400).json({ error: "Invalid id" }); return; }

    const component = await findScopedComponent(id, componentId);
    if (!component) { res.status(404).json({ error: "Component not found" }); return; }

    await db.delete(componentLogsTable).where(and(
      eq(componentLogsTable.id, logId),
      eq(componentLogsTable.componentId, componentId),
    ));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete component log");
    res.status(500).json({ error: "Failed to delete component log" });
  }
});
