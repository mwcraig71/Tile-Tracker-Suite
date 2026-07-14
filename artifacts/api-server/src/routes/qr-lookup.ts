import { Router } from "express";
import { db, equipmentTable, qrScansTable, equipmentLogsTable } from "@workspace/db";
import { eq, or, desc } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getTiles } from "../lib/tile-client";

export const qrLookupRouter = Router();

// Extracts a FieldTrack token from a URL like https://domain.com/scan/{token}
function extractTokenFromUrl(raw: string): string | null {
  try {
    const match = raw.match(/\/scan\/([0-9a-f-]{36})/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

qrLookupRouter.get("/", async (req, res) => {
  try {
    const code = (req.query.code as string || "").trim();
    if (!code) {
      res.status(400).json({ error: "code query parameter is required" });
      return;
    }

    // Try to extract a FieldTrack token from a URL scan
    const extractedToken = extractTokenFromUrl(code);
    const lookupToken = extractedToken ?? code;

    // Find by qrToken (FieldTrack auto-generated), customQrCode
    // (user-defined QR/barcode), or rfidTag (NFC/RFID tag UID).
    // RFID UIDs are stored uppercase, so match case-insensitively.
    const results = await db
      .select()
      .from(equipmentTable)
      .where(
        or(
          eq(equipmentTable.qrToken, lookupToken),
          eq(equipmentTable.customQrCode, code),
          eq(equipmentTable.rfidTag, code.toUpperCase()),
        )
      )
      .limit(1);

    if (results.length === 0) {
      res.status(404).json({ error: "No equipment linked to this code or tag" });
      return;
    }

    const equipment = results[0];

    // Last QR scan
    const [lastScan] = await db
      .select()
      .from(qrScansTable)
      .where(eq(qrScansTable.equipmentId, equipment.id))
      .orderBy(desc(qrScansTable.scannedAt))
      .limit(1);

    // Recent use logs (last 5)
    const recentLogs = await db
      .select()
      .from(equipmentLogsTable)
      .where(eq(equipmentLogsTable.equipmentId, equipment.id))
      .orderBy(desc(equipmentLogsTable.logDate))
      .limit(5);

    // Try to get live tile info — only when this equipment has a Tile linked,
    // so QR/RFID-only lookups don't pay for a Tile cloud round-trip.
    let tile = null;
    if (equipment.tileUuid) {
      try {
        const tiles = await getTiles();
        tile = tiles.find(t => t.uuid === equipment.tileUuid) ?? null;
      } catch {
        // Tile data is optional
      }
    }

    res.json({
      equipment,
      tile,
      lastQrScan: lastScan ?? null,
      recentLogs,
    });
  } catch (err) {
    logger.error({ err }, "QR lookup failed");
    res.status(500).json({ error: "QR lookup failed" });
  }
});
