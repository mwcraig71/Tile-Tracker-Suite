import { Router } from "express";
import {
  db,
  equipmentTable,
  qrScansTable,
  insertEquipmentSchema,
  updateEquipmentSchema,
} from "@workspace/db";
import { eq, desc, isNull } from "drizzle-orm";
import { logger } from "../lib/logger";

export const equipmentRouter = Router();

function parseDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}

const DATE_FIELDS = ["inServiceDate", "outOfServiceDate"] as const;
const NULLABLE_TEXT_FIELDS = ["tileUuid", "customQrCode", "rfidTag", "description", "serialNumber", "notes"] as const;

/**
 * Normalize the raw request body ahead of Zod validation: convert date
 * strings to Date objects and empty strings to null for optional fields.
 * Only fields present in the body are touched, so partial updates do not
 * clobber unspecified columns. Field whitelisting (mass-assignment
 * protection) is done by the Zod schemas, which strip unknown keys such
 * as id, qrToken, and createdAt.
 */
function normalizeBody(body: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...body };
  for (const field of DATE_FIELDS) {
    if (field in out) out[field] = parseDate(out[field]);
  }
  for (const field of NULLABLE_TEXT_FIELDS) {
    if (field in out) {
      const v = typeof out[field] === "string" ? (out[field] as string).trim() : out[field];
      out[field] = v || null;
    }
  }
  // RFID tag UIDs are case-insensitive hex in practice; store them
  // uppercase so the same physical tag always matches one record.
  if (typeof out.rfidTag === "string") {
    out.rfidTag = out.rfidTag.toUpperCase();
  }
  return out;
}

/** Map a Postgres unique-constraint violation to a friendly 409 message. */
function uniqueViolationMessage(err: unknown): string | null {
  const e = err as { code?: string; constraint?: string } | null;
  if (!e || e.code !== "23505") return null;
  const c = e.constraint ?? "";
  if (c.includes("tile_uuid")) return "Another equipment record is already linked to this Tile.";
  if (c.includes("rfid_tag")) return "Another equipment record is already linked to this RFID tag.";
  return "A record with one of these identifiers already exists.";
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
    const parsed = insertEquipmentSchema.safeParse(normalizeBody(req.body));
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid equipment payload", details: parsed.error.issues });
      return;
    }
    const data = parsed.data;

    // When a Tile is supplied, keep the historical upsert behavior:
    // one record per Tile, re-posting the same Tile updates its metadata.
    if (data.tileUuid) {
      const existing = await db
        .select()
        .from(equipmentTable)
        .where(eq(equipmentTable.tileUuid, data.tileUuid))
        .limit(1);

      if (existing.length > 0) {
        const { tileUuid: _tileUuid, ...updateData } = data;
        const [updated] = await db
          .update(equipmentTable)
          .set({ ...updateData, updatedAt: new Date() })
          .where(eq(equipmentTable.tileUuid, data.tileUuid))
          .returning();
        res.status(200).json(updated);
        return;
      }
    }

    // No Tile (QR/RFID-only equipment) or a new Tile: plain insert.
    const [created] = await db
      .insert(equipmentTable)
      .values(data)
      .returning();
    res.status(201).json(created);
  } catch (err) {
    const conflict = uniqueViolationMessage(err);
    if (conflict) {
      res.status(409).json({ error: conflict });
      return;
    }
    logger.error({ err }, "Failed to create equipment");
    res.status(500).json({ error: "Failed to create equipment" });
  }
});

// Last known scan location for each piece of equipment that has no Tile.
// Lets the map show QR/RFID-only assets alongside live Tile positions.
// NOTE: registered before /:id so "scan-locations" isn't parsed as an id.
equipmentRouter.get("/scan-locations", async (_req, res) => {
  try {
    const rows = await db
      .select({
        equipmentId: equipmentTable.id,
        label: equipmentTable.label,
        category: equipmentTable.category,
        serialNumber: equipmentTable.serialNumber,
        customQrCode: equipmentTable.customQrCode,
        rfidTag: equipmentTable.rfidTag,
        latitude: qrScansTable.latitude,
        longitude: qrScansTable.longitude,
        accuracy: qrScansTable.accuracy,
        city: qrScansTable.city,
        scannedAt: qrScansTable.scannedAt,
      })
      .from(qrScansTable)
      .innerJoin(equipmentTable, eq(qrScansTable.equipmentId, equipmentTable.id))
      .where(isNull(equipmentTable.tileUuid))
      .orderBy(desc(qrScansTable.scannedAt));

    // Keep only the most recent scan per equipment (rows are newest-first).
    const seen = new Set<number>();
    const latest = rows.filter((r) => {
      if (seen.has(r.equipmentId)) return false;
      seen.add(r.equipmentId);
      return true;
    });

    res.json(latest);
  } catch (err) {
    logger.error({ err }, "Failed to list equipment scan locations");
    res.status(500).json({ error: "Failed to list equipment scan locations" });
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

    const parsed = updateEquipmentSchema.safeParse(normalizeBody(req.body));
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid equipment payload", details: parsed.error.issues });
      return;
    }

    const [updated] = await db
      .update(equipmentTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(equipmentTable.id, id))
      .returning();

    if (!updated) { res.status(404).json({ error: "Equipment not found" }); return; }
    res.json(updated);
  } catch (err) {
    const conflict = uniqueViolationMessage(err);
    if (conflict) {
      res.status(409).json({ error: conflict });
      return;
    }
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
