import { pgTable, text, serial, timestamp, doublePrecision, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { randomUUID } from "crypto";

export const equipmentTable = pgTable("equipment", {
  id: serial("id").primaryKey(),
  tileUuid: text("tile_uuid").notNull().unique(),
  qrToken: text("qr_token").notNull().unique().$defaultFn(() => randomUUID()),
  customQrCode: text("custom_qr_code"),
  label: text("label").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  serialNumber: text("serial_number"),
  notes: text("notes"),
  inServiceDate: timestamp("in_service_date"),
  outOfServiceDate: timestamp("out_of_service_date"),
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

export const equipmentLogsTable = pgTable("equipment_logs", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull().references(() => equipmentTable.id, { onDelete: "cascade" }),
  logType: text("log_type").notNull(),
  logDate: timestamp("log_date").notNull(),
  durationMinutes: integer("duration_minutes"),
  operatorName: text("operator_name"),
  location: text("location"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const equipmentComponentsTable = pgTable("equipment_components", {
  id: serial("id").primaryKey(),
  parentEquipmentId: integer("parent_equipment_id").notNull().references(() => equipmentTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  componentType: text("component_type").notNull(),
  serialNumber: text("serial_number"),
  notes: text("notes"),
  inServiceDate: timestamp("in_service_date"),
  outOfServiceDate: timestamp("out_of_service_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const componentLogsTable = pgTable("component_logs", {
  id: serial("id").primaryKey(),
  componentId: integer("component_id").notNull().references(() => equipmentComponentsTable.id, { onDelete: "cascade" }),
  logType: text("log_type").notNull(),
  logDate: timestamp("log_date").notNull(),
  durationMinutes: integer("duration_minutes"),
  operatorName: text("operator_name"),
  location: text("location"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Zod schemas ---

export const insertEquipmentSchema = createInsertSchema(equipmentTable).omit({
  id: true, qrToken: true, createdAt: true, updatedAt: true,
});

export const updateEquipmentSchema = insertEquipmentSchema
  .omit({ tileUuid: true })
  .partial();

export const insertQrScanSchema = createInsertSchema(qrScansTable).omit({
  id: true, scannedAt: true,
});

export const insertEquipmentLogSchema = createInsertSchema(equipmentLogsTable).omit({
  id: true, createdAt: true,
});

export const insertComponentSchema = createInsertSchema(equipmentComponentsTable).omit({
  id: true, createdAt: true, updatedAt: true,
});

export const updateComponentSchema = insertComponentSchema
  .omit({ parentEquipmentId: true })
  .partial();

export const insertComponentLogSchema = createInsertSchema(componentLogsTable).omit({
  id: true, createdAt: true,
});

// --- Types ---

export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type UpdateEquipment = z.infer<typeof updateEquipmentSchema>;
export type Equipment = typeof equipmentTable.$inferSelect;
export type QrScan = typeof qrScansTable.$inferSelect;
export type EquipmentLog = typeof equipmentLogsTable.$inferSelect;
export type EquipmentComponent = typeof equipmentComponentsTable.$inferSelect;
export type ComponentLog = typeof componentLogsTable.$inferSelect;
