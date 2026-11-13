export type ModelSettings = {
  widthMm: number;
  spacingMm: number;
  holeAxis: "x" | "y" | "z";
  holeCenter: [number, number, number]; // relative to bounding-box centre, in mm
  rollDegrees: number;
  attachment: "bead" | "pendant";
  /** Local anchor frame: X follows the cord, Z is the model front. */
  anchorRotation?: [number, number, number, number];
  thumbnail?: string;
  thumbnailSource?: "model" | "photo";
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
  if (s?.thumbnailSource !== undefined && !["model", "photo"].includes(s.thumbnailSource)) throw new Error("Nguồn ảnh không hợp lệ.");
  if (s?.anchorRotation !== undefined && (!Array.isArray(s.anchorRotation) || s.anchorRotation.length !== 4 ||
      s.anchorRotation.some(v => !Number.isFinite(v)) || Math.abs(Math.hypot(...s.anchorRotation) - 1) > 0.01)) {
    throw new Error("Hướng điểm gắn không hợp lệ.");
  }
  if (s?.thumbnail !== undefined && (typeof s.thumbnail !== "string" || s.thumbnail.length > 200000 ||
      !/^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(s.thumbnail))) {
    throw new Error("Ảnh xem trước không hợp lệ hoặc quá lớn.");
  }
  if (!s || !Number.isFinite(s.widthMm) || s.widthMm < 2 || s.widthMm > 80 ||
      !Number.isFinite(s.spacingMm) || s.spacingMm < 2 || s.spacingMm > 80 ||
      !["x", "y", "z"].includes(s.holeAxis) || !["bead", "pendant"].includes(s.attachment) ||
      !Number.isFinite(s.rollDegrees) || Math.abs(s.rollDegrees) > 360 ||
      !Array.isArray(s.holeCenter) || s.holeCenter.length !== 3 ||
      s.holeCenter.some(v => !Number.isFinite(v) || Math.abs(v) > 80)) {
    throw new Error("Kích thước hoặc hướng lỗ xỏ không hợp lệ.");
  }
  return { widthMm: s.widthMm, spacingMm: s.spacingMm, holeAxis: s.holeAxis,
    holeCenter: [...s.holeCenter], rollDegrees: s.rollDegrees, attachment: s.attachment,
    ...(s.anchorRotation ? { anchorRotation: [...s.anchorRotation] as [number, number, number, number] } : {}),
    ...(s.thumbnail ? { thumbnail: s.thumbnail } : {}),
    ...(s.thumbnailSource ? { thumbnailSource: s.thumbnailSource } : {}) };
}
export function readBeadModel(value: unknown): BeadModel | undefined {
  if (!value || typeof value !== "object") return undefined;
  const m = value as BeadModel;
  try { validateModelSettings(m); } catch { return undefined; }
  if (typeof m.assetId !== "string" || typeof m.url !== "string" || !/^https?:\/\//.test(m.url)) return undefined;
  return m;
}
export type BeadKind = "bead" | "charm";
export function readBeadKind(value: unknown): BeadKind {
  if (value && typeof value === "object") {
    const raw = value as { kind?: unknown; attachment?: unknown };
    if (raw.kind === "bead" || raw.kind === "charm") return raw.kind;
    if (raw.attachment === "pendant") return "charm";
  }
  return "bead";
}
export function readBeadThumbnail(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const thumbnail = (value as { thumbnail?: unknown }).thumbnail;
  return typeof thumbnail === "string" && thumbnail.length <= 200000 &&
    /^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(thumbnail)
    ? thumbnail
    : undefined;
}
export function readBeadPhotoThumbnail(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || (value as { thumbnailSource?: unknown }).thumbnailSource !== "photo") return undefined;
  return readBeadThumbnail(value);
}
export function beadSpacing(bead?: { diameter: number; model?: BeadModel } | null) {
  if (!bead?.model) return bead?.diameter ?? 8;
  // spacingMm is the configured footprint along the cord. widthMm only scales
  // the rendered model; using it here made small-loop charms consume their full
  // visual width (for example 15mm) even when their cord spacing was 2mm.
  return bead.model.spacingMm;
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
