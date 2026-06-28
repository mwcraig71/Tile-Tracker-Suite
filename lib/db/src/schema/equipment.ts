import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const equipmentTable = pgTable("equipment", {
  id: serial("id").primaryKey(),
  tileUuid: text("tile_uuid").notNull().unique(),
  label: text("label").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  serialNumber: text("serial_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEquipmentSchema = createInsertSchema(equipmentTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateEquipmentSchema = insertEquipmentSchema
  .omit({ tileUuid: true })
  .partial();

export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type UpdateEquipment = z.infer<typeof updateEquipmentSchema>;
export type Equipment = typeof equipmentTable.$inferSelect;
