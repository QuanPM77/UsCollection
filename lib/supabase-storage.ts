import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const AVATAR_BUCKET = "avatars";
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

function productObjectPath(imageRef: string) {
  if (!/^https?:\/\//i.test(imageRef)) {
    const path = imageRef.replace(/^\/+/, "");
    return path.startsWith("products/") ? path : null;
  }

  try {
    const pathname = new URL(imageRef).pathname;
    for (const visibility of ["public", "sign", "authenticated"]) {
      const prefix = `/storage/v1/object/${visibility}/${AVATAR_BUCKET}/products/`;
      if (pathname.startsWith(prefix)) return decodeURIComponent(pathname.slice(`/storage/v1/object/${visibility}/${AVATAR_BUCKET}/`.length));
    }
  } catch {
    return null;
  }
  return null;
}

export async function productImageDisplayUrl(imageRef: string) {
  const path = productObjectPath(imageRef);
  if (!path) return imageRef;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!supabaseUrl) throw new Error("Thiếu cấu hình URL Supabase để hiển thị ảnh sản phẩm.");
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${AVATAR_BUCKET}/${encodedPath}`;
}

export async function uploadProductImage(adminId: string, bytes: Buffer) {
  const path = `products/${adminId}/${randomUUID()}.webp`;
  const bucket = getStorageClient().storage.from(AVATAR_BUCKET);
  const { error } = await bucket.upload(path, bytes, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(`Không thể tải ảnh sản phẩm lên Supabase Storage: ${error.message}`);
  const { data, error: signedUrlError } = await bucket.createSignedUrl(path, 60 * 60);
  if (signedUrlError || !data?.signedUrl) {
    await bucket.remove([path]).catch(() => undefined);
    throw new Error(`Không thể tạo link xem ảnh Supabase: ${signedUrlError?.message ?? "không nhận được URL"}`);
  }
  return { path, url: data.signedUrl };
}

export async function removeProductImage(imageRef: string) {
  const path = productObjectPath(imageRef);
  if (!path) return;

  const { error } = await getStorageClient().storage.from(AVATAR_BUCKET).remove([path]);
  if (error) throw new Error(`Không thể xóa ảnh sản phẩm khỏi Supabase Storage: ${error.message}`);
}

export async function removeAvatar(path: string | null | undefined) {
  if (!path || path.startsWith("data:image/")) return;
  const { error } = await getStorageClient().storage.from(AVATAR_BUCKET).remove([path]);
  if (error) throw new Error(`Không thể xóa ảnh khỏi Supabase Storage: ${error.message}`);
}
