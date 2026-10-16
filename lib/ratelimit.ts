import { supabase } from "@/lib/supabase";

// Lưu ý: x-forwarded-for chỉ đáng tin khi app chạy sau proxy/host bạn kiểm soát (Vercel, Nginx...).
export function clientIp(h: Headers) {
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

export type Limit = { ok: boolean; retryAfterSec: number };

// Cửa sổ cố định, đếm nguyên tử bằng upsert Supabase — an toàn cho các request song song.
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<Limit> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSec * 1000);

  // Lấy bản ghi hiện tại
  const { data: existing } = await supabase
    .from("rate_limits")
    .select("*")
    .eq("key", key)
    .single();

  let count = 1;
  let reset_at = resetAt;

  if (existing) {
    const isExpired = new Date(existing.reset_at) < now;
    if (isExpired) {
      // Cửa sổ đã hết hạn → reset về 1
      count = 1;
      reset_at = resetAt;
    } else {
      count = existing.count + 1;
      reset_at = new Date(existing.reset_at);
    }
    await supabase
      .from("rate_limits")
      .update({ count, reset_at: reset_at.toISOString() })
      .eq("key", key);
  } else {
    await supabase.from("rate_limits").insert({
      key,
      count: 1,
      reset_at: resetAt.toISOString(),
    });
  }

  // Thỉnh thoảng dọn các dòng đã hết hạn
  if (Math.random() < 0.01) {
    supabase
      .from("rate_limits")
      .delete()
      .lt("reset_at", now.toISOString())
      .then(() => {});
  }

  return {
    ok: count <= limit,
    retryAfterSec: Math.max(1, Math.ceil((reset_at.getTime() - now.getTime()) / 1000)),
  };
}

export const clearLimit = async (key: string) => {
  await supabase.from("rate_limits").delete().eq("key", key);
};

export function limitError(...rs: Limit[]) {
  const bad = rs.filter((r) => !r.ok);
  if (!bad.length) return null;
  const s = Math.max(...bad.map((r) => r.retryAfterSec));
  return `Bạn thao tác quá nhiều lần. Thử lại sau ${s >= 60 ? Math.ceil(s / 60) + " phút" : s + " giây"}.`;
}
