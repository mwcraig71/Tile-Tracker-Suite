import { Router } from "express";
import { db, equipmentTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

export const equipmentRouter = Router();

function parseDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}

function sanitizeBody(body: Record<string, unknown>) {
  return {
    ...body,
    inServiceDate: parseDate(body.inServiceDate),
    outOfServiceDate: parseDate(body.outOfServiceDate),
    // Null out empty strings for optional fields
    customQrCode: body.customQrCode || null,
    description: body.description || null,
    serialNumber: body.serialNumber || null,
    notes: body.notes || null,
  };
}

equipmentRouter.get("/", async (_req, res) => {
  try {
    const equipment = await db.select().from(equipmentTable).orderBy(equipmentTable.createdAt);
    res.json(equipment);
  } catch (err) {
    logger.error({ err }, "Failed to list equipment");
    res.status(500).json({ error: "Failed to list equipment" });
  }
});

equipmentRouter.post("/", async (req, res) => {
  try {
    const { tileUuid, label, category } = req.body;
    if (!tileUuid || !label || !category) {
      res.status(400).json({ error: "tileUuid, label, and category are required" });
      return;
    }

    const data = sanitizeBody(req.body);

    const existing = await db
      .select()
      .from(equipmentTable)
      .where(eq(equipmentTable.tileUuid, tileUuid))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(equipmentTable)
        .set({ ...data, updatedAt: new Date() } as any)
        .where(eq(equipmentTable.tileUuid, tileUuid))
        .returning();
      res.status(201).json(updated);
    } else {
      const [created] = await db
        .insert(equipmentTable)
        .values(data as any)
        .returning();
      res.status(201).json(created);
    }
  } catch (err) {
    logger.error({ err }, "Failed to create equipment");
    res.status(500).json({ error: "Failed to create equipment" });
  }
});

equipmentRouter.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [equipment] = await db.select().from(equipmentTable).where(eq(equipmentTable.id, id)).limit(1);
    if (!equipment) { res.status(404).json({ error: "Equipment not found" }); return; }
    res.json(equipment);
  } catch (err) {
    logger.error({ err }, "Failed to get equipment");
    res.status(500).json({ error: "Failed to get equipment" });
  }
});

equipmentRouter.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const data = sanitizeBody(req.body);

    const [updated] = await db
      .update(equipmentTable)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(equipmentTable.id, id))
      .returning();

    if (!updated) { res.status(404).json({ error: "Equipment not found" }); return; }
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to update equipment");
    res.status(500).json({ error: "Failed to update equipment" });
  }
});

equipmentRouter.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    await db.delete(equipmentTable).where(eq(equipmentTable.id, id));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete equipment");
    res.status(500).json({ error: "Failed to delete equipment" });
  }
});
