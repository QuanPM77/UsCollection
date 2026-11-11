export type ModelSettings = {
  widthMm: number;
  spacingMm: number;
  holeAxis: "x" | "y" | "z";
  holeCenter: [number, number, number]; // relative to bounding-box centre, in mm
  rollDegrees: number;
  attachment: "bead" | "pendant";
};
export type BeadModel = ModelSettings & {
  assetId: string;
  url: string;
  bytes: number;
  triangles: number;
};
export const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  widthMm: 10, spacingMm: 10, holeAxis: "x", holeCenter: [0, 0, 0], rollDegrees: 0, attachment: "bead",
};
export function validateModelSettings(input: unknown): ModelSettings {
  const s = input as ModelSettings | null;
  if (!s || !Number.isFinite(s.widthMm) || s.widthMm < 2 || s.widthMm > 80 ||
      !Number.isFinite(s.spacingMm) || s.spacingMm < 2 || s.spacingMm > 80 ||
      !["x", "y", "z"].includes(s.holeAxis) || !["bead", "pendant"].includes(s.attachment) ||
      !Number.isFinite(s.rollDegrees) || Math.abs(s.rollDegrees) > 360 ||
      !Array.isArray(s.holeCenter) || s.holeCenter.length !== 3 ||
      s.holeCenter.some(v => !Number.isFinite(v) || Math.abs(v) > 80)) {
    throw new Error("Kích thước hoặc hướng lỗ xỏ không hợp lệ.");
  }
  return { widthMm: s.widthMm, spacingMm: s.spacingMm, holeAxis: s.holeAxis,
    holeCenter: [...s.holeCenter], rollDegrees: s.rollDegrees, attachment: s.attachment };
}
export function readBeadModel(value: unknown): BeadModel | undefined {
  if (!value || typeof value !== "object") return undefined;
  const m = value as BeadModel;
  try { validateModelSettings(m); } catch { return undefined; }
  if (typeof m.assetId !== "string" || typeof m.url !== "string" || !/^https?:\/\//.test(m.url)) return undefined;
  return m;
}
export function beadSpacing(bead?: { diameter: number; model?: BeadModel } | null) {
  return bead?.model?.spacingMm ?? bead?.diameter ?? 8;
}
export function modelVersionIds(beads: Array<{ id: string; model?: BeadModel }>) {
  return Object.fromEntries(beads.map(b => [b.id, b.model?.assetId ?? null]));
}
export function validateModelVersions(value: unknown): Record<string, string | null> | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length > 100) throw new Error("Danh sách phiên bản mô hình không hợp lệ.");
  for (const [sku, id] of Object.entries(value)) {
    if (!/^[a-z0-9-]{1,64}$/.test(sku) || (id !== null && (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)))) throw new Error("Mã phiên bản mô hình không hợp lệ.");
  }
  return value as Record<string, string | null>;
}
