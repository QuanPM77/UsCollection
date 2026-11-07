import type { BeadType, BraceletConfig } from "@/types";
export type SavedDesign = { id: string; name: string; updatedAt: string; config: BraceletConfig & { beads: BeadType[] } };
export function designFingerprint(c: BraceletConfig) {
  return JSON.stringify([c.wristCircumference, c.slots.map(s => s.beadTypeId)]);
}
export function validateDesignInput(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (typeof input.name !== "string" || !input.name.trim() || input.name.trim().length > 80) return null;
  const c = input.config as BraceletConfig | undefined;
  if (!c || !Number.isInteger(c.wristCircumference) || c.wristCircumference < 100 || c.wristCircumference > 250 || !Array.isArray(c.slots) || !c.slots.length || c.slots.length > 100) return null;
  if (c.slots.some(s => !s || typeof s.beadTypeId !== "string" || !s.beadTypeId || s.beadTypeId.length > 100)) return null;
  return { name: input.name.trim(), config: { wristCircumference: c.wristCircumference, slots: c.slots.map((s, index) => ({ index, beadTypeId: s.beadTypeId })) } };
}
