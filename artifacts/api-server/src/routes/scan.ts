import { Router } from "express";
import { db, equipmentTable, qrScansTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { logger } from "../lib/logger";

export const scanRouter = Router();

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "FieldTrack Equipment Tracker/1.0", "Accept-Language": "en-US,en" },
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as { address?: Record<string, string | undefined> };
    const addr = data.address ?? {};
    return addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.state || null;
  } catch {
    return null;
  }
}

// GET /api/scan/:token — public
scanRouter.get("/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const [equipment] = await db
      .select()
      .from(equipmentTable)
      .where(eq(equipmentTable.qrToken, token))
      .limit(1);

    if (!equipment) {
      res.status(404).json({ error: "QR code not found or equipment removed" });
      return;
    }

    const [lastScan] = await db
      .select()
      .from(qrScansTable)
      .where(eq(qrScansTable.equipmentId, equipment.id))
      .orderBy(desc(qrScansTable.scannedAt))
      .limit(1);

    const allScans = await db
      .select()
      .from(qrScansTable)
      .where(eq(qrScansTable.equipmentId, equipment.id));

    res.json({
      equipmentId: equipment.id,
      label: equipment.label,
      category: equipment.category,
      description: equipment.description ?? null,
      serialNumber: equipment.serialNumber ?? null,
      notes: equipment.notes ?? null,
      inServiceDate: equipment.inServiceDate ? equipment.inServiceDate.toISOString() : null,
      outOfServiceDate: equipment.outOfServiceDate ? equipment.outOfServiceDate.toISOString() : null,
      lastQrScan: lastScan ?? null,
      totalScans: allScans.length,
    });
  } catch (err) {
    logger.error({ err }, "Failed to get scan info");
    res.status(500).json({ error: "Failed to get scan info" });
  }
});

// POST /api/scan/:token — record GPS location
scanRouter.post("/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { latitude, longitude, accuracy } = req.body;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      res.status(400).json({ error: "latitude and longitude are required numbers" });
      return;
    }

    const [equipment] = await db
      .select()
      .from(equipmentTable)
      .where(eq(equipmentTable.qrToken, token))
      .limit(1);

    if (!equipment) {
      res.status(404).json({ error: "QR code not found" });
      return;
    }

    const city = await reverseGeocode(latitude, longitude);

    const [scan] = await db
      .insert(qrScansTable)
      .values({
        equipmentId: equipment.id,
        latitude,
        longitude,
        accuracy: typeof accuracy === "number" ? accuracy : null,
        city,
        userAgent: req.headers["user-agent"] ?? null,
      })
      .returning();

    logger.info({ equipmentId: equipment.id, city }, "QR scan recorded");
    res.json(scan);
  } catch (err) {
    logger.error({ err }, "Failed to record scan");
    res.status(500).json({ error: "Failed to record scan" });
  }
});

// GET /api/equipment/:id/scans
export const equipmentScansRouter = Router({ mergeParams: true });

equipmentScansRouter.get("/", async (req, res) => {
  try {
    const id = parseInt((req.params as { id?: string }).id ?? "", 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [equipment] = await db.select().from(equipmentTable).where(eq(equipmentTable.id, id)).limit(1);
    if (!equipment) { res.status(404).json({ error: "Equipment not found" }); return; }

    const scans = await db
      .select()
      .from(qrScansTable)
      .where(eq(qrScansTable.equipmentId, id))
      .orderBy(desc(qrScansTable.scannedAt));

    res.json(scans);
  } catch (err) {
    logger.error({ err }, "Failed to list QR scans");
    res.status(500).json({ error: "Failed to list QR scans" });
  }
});
