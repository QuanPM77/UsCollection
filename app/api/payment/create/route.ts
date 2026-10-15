/**
 * POST /api/payment/create
 *
 * Backend handler that creates a PayOS payment link.
 * Uses the @payos/node SDK to call PayOS's API.
 *
 * Environment variables required (set in .env.local):
 *   PAYOS_CLIENT_ID
 *   PAYOS_API_KEY
 *   PAYOS_CHECKSUM_KEY
 */

import { NextRequest, NextResponse } from "next/server";
import { PayOS } from "@payos/node";
import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { BEAD_CATALOG } from "@/lib/beadData";
import { BraceletConfig } from "@/types";

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customer, braceletConfig } = body as {
      customer?: { name?: string; phone?: string; address?: string };
      braceletConfig?: BraceletConfig;
    };
    if (!process.env.PAYOS_CLIENT_ID || !process.env.PAYOS_API_KEY || !process.env.PAYOS_CHECKSUM_KEY) {
      return NextResponse.json({ success: false, message: "PayOS chưa được cấu hình." }, { status: 503 });
    }
    if (!customer || typeof customer.name !== "string" || customer.name.trim().length < 2 ||
      typeof customer.phone !== "string" || !/^(0|\+84)[0-9]{8,10}$/.test(customer.phone) ||
      typeof customer.address !== "string" || customer.address.trim().length < 10 ||
      !braceletConfig || !Number.isInteger(braceletConfig.wristCircumference) ||
      braceletConfig.wristCircumference < 100 || braceletConfig.wristCircumference > 250 ||
      !Array.isArray(braceletConfig.slots) || braceletConfig.slots.length < 6 || braceletConfig.slots.length > 32 ||
      braceletConfig.slots.some((slot, index) => slot.index !== index ||
        (slot.beadTypeId !== null && !BEAD_CATALOG.some((bead) => bead.id === slot.beadTypeId)))) {
      return NextResponse.json({ success: false, message: "Thông tin đơn hàng không hợp lệ." }, { status: 400 });
    }
    const selectedBeads = braceletConfig.slots.flatMap((slot) =>
      slot.beadTypeId ? [BEAD_CATALOG.find((bead) => bead.id === slot.beadTypeId)!] : []
    );
    if (!selectedBeads.length) return NextResponse.json({ success: false, message: "Vui lòng chọn ít nhất một hạt." }, { status: 400 });
    const amount = selectedBeads.reduce((sum, bead) => sum + bead.price, 0);
    const orderCode = randomInt(1_000_000_000, 9_000_000_000);
    const baseUrl = process.env.APP_URL ?? new URL(req.url).origin;
    const order = await prisma.order.create({ data: {
      orderCode: BigInt(orderCode),
      customerName: customer.name.trim(), customerPhone: customer.phone,
      customerAddress: customer.address.trim(), braceletConfig: braceletConfig as object,
      totalPrice: amount,
    } });

    let paymentLinkRes;
    try {
      paymentLinkRes = await payos.paymentRequests.create({
        orderCode, amount,
        description: `Vong tay ${orderCode}`,
        items: [{ name: `Vong tay ${orderCode}`, quantity: 1, price: amount }],
        cancelUrl: `${baseUrl}/checkout/result?orderId=${order.id}`,
        returnUrl: `${baseUrl}/checkout/result?orderId=${order.id}`,
      });
      await prisma.order.update({ where: { id: order.id }, data: { paymentLinkId: paymentLinkRes.paymentLinkId } });
    } catch (error) {
      await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "failed" } });
      throw error;
    }

    return NextResponse.json({
      success: true,
      payUrl: paymentLinkRes.checkoutUrl,
      orderCode: paymentLinkRes.orderCode,
      orderId: order.id,
    });
  } catch (err) {
    console.error("[PayOS API]", err);
    return NextResponse.json(
      {
        success: false,
        message:
          err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
