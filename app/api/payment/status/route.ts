import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("orderId");
  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.json({ message: "Invalid orderId" }, { status: 400 });
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { paymentStatus: true } });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });
  return NextResponse.json(order);
}
