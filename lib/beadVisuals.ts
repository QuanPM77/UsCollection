/**
 * Hình ảnh 3D riêng cho từng hạt, tra theo mã hạt (SKU = `BeadType.id`).
 *
 * Hạt không có trong bảng vẫn vẽ như cũ (khối cầu màu `color`).
 * Muốn hạt mới hiện texture/model: tạo hạt trong trang Admin → Hạt với đúng "Mã hạt" dưới đây.
 *
 * Đơn vị: file GLB tính bằng mét (chuẩn glTF); trong scene 1 đơn vị = 10 mm → nhân 100.
 * Nguồn file: Desktop/Texture_Bead (bead_texture.py) và Desktop/3D_Model (script Blender).
 */

/** Thông số MeshPhysicalMaterial bổ sung (ánh AB, độ trong). */
export interface BeadPhysicalProps {
  clearcoat?: number;
  clearcoatRoughness?: number;
  iridescence?: number;
  iridescenceIOR?: number;
  iridescenceThicknessRange?: [number, number];
  transmission?: number;
  thickness?: number;
  ior?: number;
}

/** Hạt tròn phủ texture: khối cầu như cũ, thay màu đơn bằng ảnh. */
export interface TexturedBeadVisual extends BeadPhysicalProps {
  kind: "texture";
  map: string;
  normalMap?: string;
  thumbnail: string;
}

/**
 * Hạt/charm là model GLB.
 * - "bead": gốc toạ độ = tâm lỗ xỏ, lỗ chạy theo trục X → nằm trên dây.
 * - "charm": gốc toạ độ = đỉnh khoen móc, thân treo xuống theo trục −Y.
 * Cả hai: mặt trước hướng +Z, được xoay quay ra ngoài vòng.
 */
export interface ModelBeadVisual {
  kind: "model";
  mount: "bead" | "charm";
  url: string;
  thumbnail: string;
}

export type BeadVisual = TexturedBeadVisual | ModelBeadVisual;

const TEX = "/textures/beads";
const THUMB = "/thumbnails/beads";

export const BEAD_VISUALS: Record<string, BeadVisual> = {
  "crackle-do-den": {
    kind: "texture",
    map: `${TEX}/crackle-do-den.webp`,
    normalMap: `${TEX}/crackle-do-den-normal.webp`,
    thumbnail: `${THUMB}/crackle-do-den.webp`,
    clearcoat: 1, clearcoatRoughness: 0.03,
  },
  "crackle-tim": {
    kind: "texture",
    map: `${TEX}/crackle-tim.webp`,
    normalMap: `${TEX}/crackle-tim-normal.webp`,
    thumbnail: `${THUMB}/crackle-tim.webp`,
    clearcoat: 1, clearcoatRoughness: 0.03,
  },
  "ab-xanh-duong": {
    kind: "texture",
    map: `${TEX}/ab-xanh-duong.webp`,
    thumbnail: `${THUMB}/ab-xanh-duong.webp`,
    clearcoat: 1, clearcoatRoughness: 0.05,
    iridescence: 0.8, iridescenceIOR: 1.4, iridescenceThicknessRange: [250, 550],
  },
  "trong-xanh-bac-ha": {
    kind: "texture",
    map: `${TEX}/trong-xanh-bac-ha.webp`,
    thumbnail: `${THUMB}/trong-xanh-bac-ha.webp`,
    clearcoat: 1, clearcoatRoughness: 0.02,
    transmission: 0.92, thickness: 0.8, ior: 1.5,
    iridescence: 0.35, iridescenceIOR: 1.3, iridescenceThicknessRange: [200, 450],
  },
  "cupcake-hong": {
    kind: "model",
    mount: "bead",
    url: "/models/beads/cupcake-hong.glb",
    thumbnail: `${THUMB}/cupcake-hong.webp`,
  },
  "charm-meo-vang": {
    kind: "model",
    mount: "charm",
    url: "/models/charms/charm-meo-vang.glb",
    thumbnail: `${THUMB}/charm-meo-vang.webp`,
  },
  "charm-meo-hong": {
    kind: "model",
    mount: "charm",
    url: "/models/charms/charm-meo-hong.glb",
    thumbnail: `${THUMB}/charm-meo-hong.webp`,
  },
};

export function getBeadVisual(beadId: string | null | undefined): BeadVisual | undefined {
  return beadId ? BEAD_VISUALS[beadId] : undefined;
}

/** GLB (mét) → đơn vị scene (10 mm). */
export const GLB_TO_SCENE = 100;
