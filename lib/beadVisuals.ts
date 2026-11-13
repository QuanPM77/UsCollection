/**
 * Texture tĩnh riêng cho từng hạt, tra theo mã hạt (SKU = `BeadType.id`).
 *
 * GLB model và charm được tải theo dữ liệu hạt từ trang Admin, không tham chiếu file render tĩnh.
 * Hạt không có texture vẫn vẽ như cũ (khối cầu màu `color`).
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

const TEX = "/textures/beads";
const THUMB = "/thumbnails/beads";

export const BEAD_VISUALS: Record<string, TexturedBeadVisual> = {
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
};

export function getBeadVisual(beadId: string | null | undefined): TexturedBeadVisual | undefined {
  return beadId ? BEAD_VISUALS[beadId] : undefined;
}
