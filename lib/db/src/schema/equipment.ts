import { pgTable, text, serial, timestamp, doublePrecision, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { randomUUID } from "crypto";

export const equipmentTable = pgTable("equipment", {
  id: serial("id").primaryKey(),
  tileUuid: text("tile_uuid").notNull().unique(),
  qrToken: text("qr_token").notNull().unique().$defaultFn(() => randomUUID()),
  label: text("label").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  serialNumber: text("serial_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const qrScansTable = pgTable("qr_scans", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull().references(() => equipmentTable.id, { onDelete: "cascade" }),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  accuracy: doublePrecision("accuracy"),
  city: text("city"),
  userAgent: text("user_agent"),
  scannedAt: timestamp("scanned_at").notNull().defaultNow(),
});

export const insertEquipmentSchema = createInsertSchema(equipmentTable).omit({
  id: true,
  qrToken: true,
  createdAt: true,
  updatedAt: true,
});

export const updateEquipmentSchema = insertEquipmentSchema
  .omit({ tileUuid: true })
  .partial();

export const insertQrScanSchema = createInsertSchema(qrScansTable).omit({
  id: true,
  scannedAt: true,
});

export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type UpdateEquipment = z.infer<typeof updateEquipmentSchema>;
export type Equipment = typeof equipmentTable.$inferSelect;
export type QrScan = typeof qrScansTable.$inferSelect;
