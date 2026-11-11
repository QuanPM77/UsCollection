import { getStorageClient } from "@/lib/supabase-storage";
import { MAX_ORIGINAL_BYTES, MAX_WEB_BYTES } from "@/lib/glb-validation";

export const ORIGINAL_BUCKET = "bead-model-originals";
export const MODEL_BUCKET = "bead-models";
export async function ensureModelBuckets() {
  const storage = getStorageClient().storage;
  for (const [name, isPublic, limit] of [[ORIGINAL_BUCKET, false, MAX_ORIGINAL_BYTES], [MODEL_BUCKET, true, MAX_WEB_BYTES]] as const) {
    const { data, error } = await storage.getBucket(name);
    if (data) {
      if (data.public !== isPublic) throw new Error(`Kho ${name} cần đặt quyền ${isPublic ? "công khai" : "riêng tư"}.`);
      continue;
    }
    if (error && !/not found|does not exist/i.test(error.message)) throw error;
    const created = await storage.createBucket(name, { public: isPublic, fileSizeLimit: limit, allowedMimeTypes: ["model/gltf-binary", "application/octet-stream"] });
    if (created.error && !/already exists/i.test(created.error.message)) throw created.error;
  }
}
export async function signModelUpload(path: string) {
  const { data, error } = await getStorageClient().storage.from(ORIGINAL_BUCKET).createSignedUploadUrl(path, { upsert: false });
  if (error) throw error;
  return { path, signedUrl: data.signedUrl, token: data.token, publicKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" };
}
export async function downloadModel(path: string, expectedBytes: number) {
  const bucket = getStorageClient().storage.from(ORIGINAL_BUCKET);
  const { data: info, error: infoError } = await bucket.info(path);
  if (infoError || !info) throw new Error("File chưa tải xong. Hãy tải lại.");
  if (Number(info.size) !== expectedBytes || expectedBytes > MAX_ORIGINAL_BYTES) throw new Error("Dung lượng file tải lên không khớp.");
  const { data, error } = await bucket.download(path);
  if (error) throw error;
  const bytes = new Uint8Array(await data.arrayBuffer());
  if (bytes.length !== expectedBytes) throw new Error("File chưa tải đủ dữ liệu.");
  return bytes;
}
export async function publishModel(path: string, bytes: Uint8Array) {
  const bucket = getStorageClient().storage.from(MODEL_BUCKET);
  const { error } = await bucket.upload(path, bytes, { contentType: "model/gltf-binary", cacheControl: "31536000", upsert: false });
  if (error && !/already exists|duplicate/i.test(error.message)) throw error;
  return bucket.getPublicUrl(path).data.publicUrl;
}
