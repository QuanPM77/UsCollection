import { prisma } from "@/lib/prisma";

// Lưu ý: x-forwarded-for chỉ đáng tin khi app chạy sau proxy/host bạn kiểm soát (Vercel, Nginx...).
export function clientIp(h: Headers) {
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

export type Limit = { ok: boolean; retryAfterSec: number };

// Cửa sổ cố định, đếm nguyên tử bằng một câu upsert nên an toàn khi nhiều request chạy song song.
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<Limit> {
  const rows = await prisma.$queryRaw<{ count: number; reset_at: Date }[]>`
    INSERT INTO rate_limits (key, count, reset_at)
    VALUES (${key}, 1, now() + (${windowSec}::int * interval '1 second'))
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.reset_at < now() THEN 1 ELSE rate_limits.count + 1 END,
      reset_at = CASE WHEN rate_limits.reset_at < now()
                      THEN now() + (${windowSec}::int * interval '1 second')
                      ELSE rate_limits.reset_at END
    RETURNING count, reset_at`;
  // Thỉnh thoảng dọn các dòng đã hết hạn
  if (Math.random() < 0.01) prisma.$executeRaw`DELETE FROM rate_limits WHERE reset_at < now()`.catch(() => {});
  const { count, reset_at } = rows[0];
  return { ok: Number(count) <= limit, retryAfterSec: Math.max(1, Math.ceil((reset_at.getTime() - Date.now()) / 1000)) };
}

export const clearLimit = (key: string) => prisma.rateLimit.deleteMany({ where: { key } });

export function limitError(...rs: Limit[]) {
  const bad = rs.filter((r) => !r.ok);
  if (!bad.length) return null;
  const s = Math.max(...bad.map((r) => r.retryAfterSec));
  return `Bạn thao tác quá nhiều lần. Thử lại sau ${s >= 60 ? Math.ceil(s / 60) + " phút" : s + " giây"}.`;
}
