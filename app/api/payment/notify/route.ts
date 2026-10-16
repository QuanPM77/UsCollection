import { NextRequest, NextResponse } from "next/server";
import { PayOS } from "@payos/node";
import { prisma } from "@/lib/prisma";

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const webhook = await req.json();
    const data = await payos.webhooks.verify(webhook);
    const order = await prisma.order.findUnique({ where: { orderCode: BigInt(data.orderCode) }, include: { order_items: true } });
    if (!order || order.totalPrice !== data.amount) {
      return NextResponse.json({ message: "Order not found or amount mismatch" }, { status: 400 });
    }

    if (data.code === "00") {
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM orders WHERE id = ${order.id}::uuid FOR UPDATE`;
        const current = await tx.order.findUnique({ where: { id: order.id }, include: { order_items: true } });
        if (!current || current.paymentStatus !== "pending") return;

        for (const item of current.order_items) {
          if (!item.product_id) continue;
          await tx.$queryRaw`SELECT id FROM products WHERE id = ${item.product_id}::uuid FOR UPDATE`;
          const changed = await tx.products.updateMany({
            where: { id: item.product_id, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (changed.count !== 1) throw new Error(`Insufficient stock for paid order ${current.id}`);
          await tx.inventory_movements.create({ data: {
            product_id: item.product_id,
            quantity_delta: -item.quantity,
            reason: "customer_purchase",
            order_id: current.id,
          } });
        }

        await tx.order.update({ where: { id: current.id }, data: { paymentStatus: "paid" } });
      });
    }
    return NextResponse.json({ message: "OK" });
  } catch (error) {
    console.error("[PayOS Webhook] Invalid webhook or processing error", error);
    return NextResponse.json({ message: "Invalid webhook" }, { status: 400 });
  }
}
