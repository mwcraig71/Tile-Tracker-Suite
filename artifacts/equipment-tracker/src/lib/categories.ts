export const EQUIPMENT_CATEGORIES = [
  "Drone",
  "UT Machine",
  "D-Meter",
  "Laser Measurer",
  "Boat",
  "Rope Access",
  "Other",
] as const;

export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];

export const LOG_TYPES: Record<string, { label: string; categories?: string[] }> = {
  flight: { label: "Flight", categories: ["Drone"] },
  rope_access: { label: "Rope Access Use", categories: ["Rope Access"] },
  inspection: { label: "Inspection" },
  maintenance: { label: "Maintenance" },
  general: { label: "General Use" },
};

export function getLogTypesForCategory(category: string) {
  return Object.entries(LOG_TYPES)
    .filter(([, v]) => !v.categories || v.categories.includes(category))
    .map(([k, v]) => ({ value: k, label: v.label }));
}
