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
  if (Math.random() < 0.01) prisma.$executeRaw`
    DELETE FROM rate_limits
    WHERE reset_at < now()
      AND (key NOT LIKE 'login:fail:%' AND key NOT LIKE 'register:fail:%'
        OR reset_at < now() - interval '30 days')
  `.catch(() => {});
  const { count, reset_at } = rows[0];
  return { ok: Number(count) <= limit, retryAfterSec: Math.max(1, Math.ceil((reset_at.getTime() - Date.now()) / 1000)) };
}

const LOGIN_FAILURE_DELAYS = [30, 60, 120, 300, 900, 1800] as const;

export async function progressiveFailureLimit(key: string): Promise<Limit> {
  const rows = await prisma.$queryRaw<{ reset_at: Date }[]>`
    SELECT reset_at FROM rate_limits WHERE key = ${key} LIMIT 1
  `;
  const resetAt = rows[0]?.reset_at;
  if (!resetAt || resetAt.getTime() <= Date.now()) return { ok: true, retryAfterSec: 0 };
  return { ok: false, retryAfterSec: Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000)) };
}

export async function recordProgressiveFailure(key: string, activationThreshold = 1): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO rate_limits (key, count, reset_at)
    VALUES (${key}, 1, CASE WHEN ${activationThreshold} <= 1 THEN now() + interval '30 seconds' ELSE now() END)
    ON CONFLICT (key) DO UPDATE SET
      count = rate_limits.count + 1,
      reset_at = CASE WHEN rate_limits.count + 1 < ${activationThreshold} THEN now() ELSE now() + (
        CASE
          WHEN rate_limits.count + 1 - ${activationThreshold} >= 6 THEN ${LOGIN_FAILURE_DELAYS[5]}
          ELSE (ARRAY[${LOGIN_FAILURE_DELAYS[0]}, ${LOGIN_FAILURE_DELAYS[1]}, ${LOGIN_FAILURE_DELAYS[2]}, ${LOGIN_FAILURE_DELAYS[3]}, ${LOGIN_FAILURE_DELAYS[4]}, ${LOGIN_FAILURE_DELAYS[5]}]::int[])[rate_limits.count + 2 - ${activationThreshold}]
        END * interval '1 second'
      ) END
  `;
}

export async function setTemporaryLock(key: string, durationSec: number): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO rate_limits (key, count, reset_at)
    VALUES (${key}, 1, now() + (${durationSec}::int * interval '1 second'))
    ON CONFLICT (key) DO UPDATE SET
      count = rate_limits.count + 1,
      reset_at = now() + (${durationSec}::int * interval '1 second')
  `;
}

export const clearLimit = (key: string) => prisma.rateLimit.deleteMany({ where: { key } });

export function limitError(...rs: Limit[]) {
  const bad = rs.filter((r) => !r.ok);
  if (!bad.length) return null;
  const s = Math.max(...bad.map((r) => r.retryAfterSec));
  return `Bạn thao tác quá nhiều lần. Thử lại sau ${s >= 60 ? Math.ceil(s / 60) + " phút" : s + " giây"}.`;
}
