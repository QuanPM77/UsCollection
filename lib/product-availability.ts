import { prisma } from "@/lib/prisma";

const PAYMENT_RESERVATION_WINDOW_MS = 15 * 60 * 1000;

export async function getAvailableProductStock(productId: string, stock: number, excludeUserId?: string) {
  const reservedUntil = new Date(Date.now() - PAYMENT_RESERVATION_WINDOW_MS);
  const [reservation] = await prisma.$queryRaw<Array<{ reserved: number }>>`
    SELECT COALESCE(SUM(oi.quantity), 0)::int AS reserved
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.product_id = ${productId}::uuid
      AND o.payment_status = 'pending'
      AND o.created_at > ${reservedUntil}
      AND (${excludeUserId ?? null}::uuid IS NULL OR o.user_id IS DISTINCT FROM ${excludeUserId ?? null}::uuid)
  `;

  return Math.max(0, stock - Number(reservation?.reserved ?? 0));
}
