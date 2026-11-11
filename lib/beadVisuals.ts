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
  roughness?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  iridescence?: number;
  iridescenceIOR?: number;
  iridescenceThicknessRange?: [number, number];
  /** 0–1: ánh sáng xuyên qua hạt (thuỷ tinh). Texture màu khi đó là lớp nhuộm. */
  transmission?: number;
  thickness?: number;
  ior?: number;
  /** Màu ánh sáng bị nhuộm khi đi xuyên qua thân hạt, và quãng đường (đơn vị scene) để đạt màu đó. */
  attenuationColor?: string;
  attenuationDistance?: number;
}

/**
 * Hạt tròn phủ texture: khối cầu như cũ, thay màu đơn bằng ảnh.
 * `cracksMap` (RGBA, alpha = vết nứt) vẽ thêm một lớp cầu nhỏ hơn BÊN TRONG hạt thuỷ tinh,
 * nhìn xuyên qua vỏ sẽ thấy vết rạn có chiều sâu.
 */
export interface TexturedBeadVisual extends BeadPhysicalProps {
  kind: "texture";
  map: string;
  normalMap?: string;
  cracksMap?: string;
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
    cracksMap: `${TEX}/crackle-do-den-cracks.webp`,
    thumbnail: `${THUMB}/crackle-do-den.webp`,
    roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02,
    transmission: 0.9, thickness: 0.9, ior: 1.5,
  },
  "crackle-tim": {
    kind: "texture",
    map: `${TEX}/crackle-tim.webp`,
    cracksMap: `${TEX}/crackle-tim-cracks.webp`,
    thumbnail: `${THUMB}/crackle-tim.webp`,
    roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02,
    transmission: 0.92, thickness: 0.9, ior: 1.5,
  },
  "ab-xanh-duong": {
    kind: "texture",
    map: `${TEX}/ab-xanh-duong.webp`,
    thumbnail: `${THUMB}/ab-xanh-duong.webp`,
    roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05,
    iridescence: 0.8, iridescenceIOR: 1.4, iridescenceThicknessRange: [250, 550],
  },
  "trong-xanh-bac-ha": {
    kind: "texture",
    map: `${TEX}/trong-xanh-bac-ha.webp`,
    thumbnail: `${THUMB}/trong-xanh-bac-ha.webp`,
    roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.02,
    transmission: 1, thickness: 0.9, ior: 1.5,
    attenuationColor: "#B9E6CF", attenuationDistance: 1.2,
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
