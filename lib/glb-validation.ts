// Deliberately bounded, self-contained GLB profile for uploaded catalogue assets.
export const MAX_ORIGINAL_BYTES = 50 * 1024 * 1024;
export const MAX_WEB_BYTES = 8 * 1024 * 1024;
export function validateGlb(bytes: Uint8Array, maxBytes = MAX_WEB_BYTES) {
  const fail = (message: string): never => { throw new Error(message); };
  if (bytes.byteLength < 28 || bytes.byteLength > maxBytes) fail("File GLB quá lớn hoặc không hợp lệ.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== bytes.length) fail("Chỉ hỗ trợ file GLB 2.0 hợp lệ.");
  const jsonLength = view.getUint32(12, true);
  if (jsonLength > 2 * 1024 * 1024 || jsonLength % 4 || 20 + jsonLength + 8 > bytes.length || view.getUint32(16, true) !== 0x4e4f534a) fail("Cấu trúc GLB không hợp lệ.");
  const doc = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength)));
  const binOffset = 28 + jsonLength;
  if (view.getUint32(24 + jsonLength, true) !== 0x004e4942 || view.getUint32(20 + jsonLength, true) !== bytes.length - binOffset) fail("GLB cần chứa dữ liệu hình học bên trong file.");
  if (doc.asset?.version !== "2.0" || doc.buffers?.length !== 1 || doc.buffers[0].uri || doc.buffers[0].byteLength > bytes.length - binOffset) fail("Không hỗ trợ tài nguyên bên ngoài GLB.");
  const scan = (v: unknown, depth = 0) => {
    if (depth > 40) fail("GLB có cấu trúc quá sâu.");
    if (!v || typeof v !== "object") return;
    for (const [key, item] of Object.entries(v)) {
      if (key === "uri") fail("Hãy nhúng toàn bộ texture và dữ liệu vào GLB.");
      if (typeof item === "number" && !Number.isFinite(item)) fail("Tọa độ không hợp lệ.");
      scan(item, depth + 1);
    }
  };
  scan(doc);
  // Initial release uses uncompressed geometry. Avoid silently accepting unsupported decoders.
  const supported = new Set(["KHR_materials_transmission", "KHR_materials_ior", "KHR_materials_volume", "KHR_materials_specular", "KHR_materials_clearcoat", "KHR_materials_sheen", "KHR_materials_unlit", "KHR_texture_transform", "KHR_materials_emissive_strength"]);
  if ((doc.extensionsUsed ?? []).some((e: string) => !supported.has(e))) fail("GLB dùng phần mở rộng chưa hỗ trợ. Hãy xuất GLB không nén geometry cho bản này.");
  if (!doc.meshes?.length || doc.meshes.length > 100 || (doc.nodes?.length ?? 0) > 300 || (doc.materials?.length ?? 0) > 32 || (doc.textures?.length ?? 0) > 16 || doc.animations?.length || doc.skins?.length) fail("Mẫu hạt cần là mô hình tĩnh, tối đa 100 mesh và 32 vật liệu.");
  for (const b of doc.bufferViews ?? []) {
    if (b.buffer !== 0 || !Number.isSafeInteger(b.byteLength) || b.byteLength < 0 || !Number.isSafeInteger(b.byteOffset ?? 0) || (b.byteOffset ?? 0) < 0 || (b.byteOffset ?? 0) + b.byteLength > bytes.length - binOffset) fail("Vùng dữ liệu GLB vượt giới hạn.");
  }
  const componentBytes: Record<number, number> = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
  const widths: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  for (const a of doc.accessors ?? []) {
    const b = doc.bufferViews?.[a.bufferView]; const size = componentBytes[a.componentType] * widths[a.type];
    if (!b || a.sparse || !size || !Number.isSafeInteger(a.count) || a.count < 1 || a.count > 1000000 || !Number.isSafeInteger(a.byteOffset ?? 0) || (a.byteOffset ?? 0) < 0) fail("Accessor GLB không hỗ trợ.");
    const stride = b.byteStride ?? size;
    if (!Number.isSafeInteger(stride) || stride < size || stride > 252 || (a.byteOffset ?? 0) + (a.count - 1) * stride + size > b.byteLength) fail("Dữ liệu mesh vượt buffer.");
  }
  let triangles = 0;
  for (const mesh of doc.meshes) for (const primitive of mesh.primitives ?? []) {
    const a = doc.accessors?.[primitive.attributes?.POSITION];
    if (!a || a.type !== "VEC3" || a.componentType !== 5126 || (primitive.mode ?? 4) !== 4) fail("Mẫu cần mesh tam giác với tọa độ FLOAT.");
    const b = doc.bufferViews[a.bufferView];
    for (let i = 0; i < a.count; i++) for (let axis = 0; axis < 3; axis++) {
      const v = view.getFloat32(binOffset + (b.byteOffset ?? 0) + (a.byteOffset ?? 0) + i * (b.byteStride ?? 12) + axis * 4, true);
      if (!Number.isFinite(v) || Math.abs(v) > 1e6) fail("Tọa độ mesh không hợp lệ.");
    }
    const idx = primitive.indices === undefined ? null : doc.accessors?.[primitive.indices];
    if (primitive.indices !== undefined && (!idx || idx.type !== "SCALAR" || ![5121, 5123, 5125].includes(idx.componentType))) fail("Chỉ mục tam giác không hợp lệ.");
    const count = idx?.count ?? a.count;
    if (count % 3) fail("Số đỉnh tam giác không hợp lệ.");
    if (idx) {
      const bv = doc.bufferViews[idx.bufferView]; const size = componentBytes[idx.componentType];
      for (let i = 0; i < idx.count; i++) {
        const at = binOffset + (bv.byteOffset ?? 0) + (idx.byteOffset ?? 0) + i * (bv.byteStride ?? size);
        const index = size === 1 ? view.getUint8(at) : size === 2 ? view.getUint16(at, true) : view.getUint32(at, true);
        if (index >= a.count) fail("Chỉ mục đỉnh vượt mesh.");
      }
    }
    triangles += count / 3;
  }
  if (!triangles || triangles > 250000) fail("Mẫu web cần từ 1 đến 250.000 tam giác; hãy giảm số mặt trước khi tải.");
  // Reject cycles / multiple-parent node graphs before handing them to a renderer.
  const visited = new Set<number>(); const active = new Set<number>();
  const walk = (i: number) => {
    if (!Number.isInteger(i) || !doc.nodes?.[i] || active.has(i) || visited.has(i)) fail("Cây đối tượng GLB không hợp lệ.");
    active.add(i); visited.add(i);
    for (const child of doc.nodes[i].children ?? []) walk(child);
    active.delete(i);
  };
  const scene = doc.scenes?.[doc.scene ?? 0];
  if (!scene?.nodes?.length) fail("GLB chưa có scene.");
  for (const i of scene.nodes) walk(i);
  return { bytes: bytes.length, triangles, warnings: [
    ...(bytes.length > 1024 * 1024 ? ["Bản web trên 1 MB; nên giảm dung lượng."] : []),
    ...(triangles > 20000 ? ["Mẫu có nhiều mặt; nên kiểm tra trên điện thoại."] : []),
  ] };
}
