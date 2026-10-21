import { NextRequest, NextResponse } from "next/server";
import { PayOS } from "@payos/node";
import { prisma } from "@/lib/prisma";
import { deleteUnpaidOrder, settlePaidOrder } from "@/lib/payment-settlement";

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const webhook = await req.json();
    const data = await payos.webhooks.verify(webhook);
    const order = await prisma.order.findUnique({ where: { orderCode: BigInt(data.orderCode) }, select: { id: true, totalPrice: true } });
    if (!order || order.totalPrice !== data.amount) {
      return NextResponse.json({ message: "Order not found or amount mismatch" }, { status: 400 });
    }

    if (data.code === "00") {
      await settlePaidOrder(BigInt(data.orderCode), data.amount);
    } else {
      await deleteUnpaidOrder(BigInt(data.orderCode));
    }
    return NextResponse.json({ message: "OK" });
  } catch (error) {
    console.error("[PayOS Webhook] Invalid webhook or processing error", error);
    return NextResponse.json({ message: "Invalid webhook" }, { status: 400 });
  }
}
