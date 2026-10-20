import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const AVATAR_BUCKET = "avatars";
const PRODUCT_BUCKET = "product-images";
let storageClient: SupabaseClient | undefined;

function getStorageClient() {
  if (storageClient) return storageClient;

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Thiếu cấu hình Supabase Storage: SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY.");
  }

  storageClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return storageClient;
}

export async function avatarDisplayUrl(avatarPath: string | null) {
  if (!avatarPath) return null;
  // Keep legacy data URLs visible until that user replaces their avatar.
  if (avatarPath.startsWith("data:image/")) return avatarPath;
  // Older/manual entries may already contain a public URL.
  if (/^https?:\/\//i.test(avatarPath)) return avatarPath;

  const path = avatarPath.startsWith(`${AVATAR_BUCKET}/`)
    ? avatarPath.slice(AVATAR_BUCKET.length + 1)
    : avatarPath.replace(/^\/+/, "");
  const bucket = getStorageClient().storage.from(AVATAR_BUCKET);
  const { data, error } = await bucket.createSignedUrl(path, 60 * 60);
  if (!error && data?.signedUrl) return data.signedUrl;

  // Public buckets can still be displayed if signed URL generation is unavailable.
  return bucket.getPublicUrl(path).data.publicUrl;
}

export async function uploadAvatar(userId: string, bytes: Buffer) {
  const path = `${userId}/${randomUUID()}.webp`;
  const { error } = await getStorageClient().storage.from(AVATAR_BUCKET).upload(path, bytes, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(`Không thể tải ảnh lên Supabase Storage: ${error.message}`);
  return path;
}

function productObjectLocation(imageRef: string) {
  if (!/^https?:\/\//i.test(imageRef)) {
    const path = imageRef.replace(/^\/+/, "");
    if (path.startsWith("catalog/")) return { bucketName: PRODUCT_BUCKET, path };
    if (path.startsWith("products/")) return { bucketName: AVATAR_BUCKET, path };
    return null;
  }

  try {
    const pathname = new URL(imageRef).pathname;
    const match = pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/);
    if (!match) return null;
    const bucketName = match[1];
    const path = decodeURIComponent(match[2]);
    if (bucketName === PRODUCT_BUCKET && path.startsWith("catalog/")) return { bucketName, path };
    if (bucketName === AVATAR_BUCKET && path.startsWith("products/")) return { bucketName, path };
  } catch {
    return null;
  }
  return null;
}

export async function productImageDisplayUrl(imageRef: string) {
  const location = productObjectLocation(imageRef);
  if (!location) return imageRef;
  return getStorageClient().storage.from(location.bucketName).getPublicUrl(location.path).data.publicUrl;
}

export async function uploadProductImage(adminId: string, bytes: Buffer) {
  const path = `catalog/${adminId}/${randomUUID()}.webp`;
  const bucket = getStorageClient().storage.from(PRODUCT_BUCKET);
  const { error } = await bucket.upload(path, bytes, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(`Không thể tải ảnh sản phẩm lên Supabase Storage: ${error.message}`);
  return { path, url: bucket.getPublicUrl(path).data.publicUrl };
}

export async function removeProductImage(imageRef: string) {
  const location = productObjectLocation(imageRef);
  if (!location) return;

  const { error } = await getStorageClient().storage.from(location.bucketName).remove([location.path]);
  if (error) throw new Error(`Không thể xóa ảnh sản phẩm khỏi Supabase Storage: ${error.message}`);
}

export async function removeAvatar(path: string | null | undefined) {
  if (!path || path.startsWith("data:image/")) return;
  const { error } = await getStorageClient().storage.from(AVATAR_BUCKET).remove([path]);
  if (error) throw new Error(`Không thể xóa ảnh khỏi Supabase Storage: ${error.message}`);
}
