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

class ProductStockUnavailableError extends Error {}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customer, braceletConfig, productId, quantity } = body as {
      customer?: { name?: string; phone?: string; address?: string };
      braceletConfig?: BraceletConfig;
      productId?: string;
      quantity?: number;
    };
    if (!process.env.PAYOS_CLIENT_ID || !process.env.PAYOS_API_KEY || !process.env.PAYOS_CHECKSUM_KEY) {
      return NextResponse.json({ success: false, message: "PayOS chưa được cấu hình." }, { status: 503 });
    }
    if (!customer || typeof customer.name !== "string" || customer.name.trim().length < 2 ||
      typeof customer.phone !== "string" || !/^(0|\+84)[0-9]{8,10}$/.test(customer.phone) ||
      typeof customer.address !== "string" || customer.address.trim().length < 10) {
      return NextResponse.json({ success: false, message: "Thông tin đơn hàng không hợp lệ." }, { status: 400 });
    }

    let amount: number;
    let payItemName: string;
    let payQuantity = 1;
    let isCatalogProduct = false;
    let order: Awaited<ReturnType<typeof prisma.order.create>>;
    if (typeof productId === "string") {
      const requestedQuantity = typeof quantity === "number" ? quantity : Number.NaN;
      if (!/^[0-9a-f-]{36}$/i.test(productId) || !Number.isSafeInteger(requestedQuantity) || requestedQuantity < 1) {
        return NextResponse.json({ success: false, message: "Số lượng mua không hợp lệ." }, { status: 400 });
      }
      const reservedUntil = new Date(Date.now() - 15 * 60 * 1000);
      const orderCode = randomInt(1_000_000_000, 9_000_000_000);
      let purchase: { order: Awaited<ReturnType<typeof prisma.order.create>>; amount: number; name: string };
      try {
        purchase = await prisma.$transaction(async (tx) => {
          // Serialize purchase attempts per product so simultaneous checkouts cannot reserve beyond stock.
          await tx.$queryRaw`SELECT id FROM products WHERE id = ${productId}::uuid FOR UPDATE`;
          const product = await tx.products.findFirst({
            where: { id: productId, type: "bracelet", status: "active" },
            include: { bracelet_product_details: true },
          });
          if (!product) throw new ProductStockUnavailableError("Sản phẩm không còn khả dụng.");
          const [reservation] = await tx.$queryRaw<Array<{ reserved: number }>>`
            SELECT COALESCE(SUM(oi.quantity), 0)::int AS reserved
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE oi.product_id = ${productId}::uuid
              AND o.payment_status = 'pending'
              AND o.created_at > ${reservedUntil}
          `;
          if (product.stock - Number(reservation?.reserved ?? 0) < requestedQuantity) {
            throw new ProductStockUnavailableError("Số lượng bạn chọn hiện đã hết. Vui lòng giảm số lượng hoặc quay lại sau.");
          }

          const total = product.price * requestedQuantity;
          const createdOrder = await tx.order.create({ data: {
            orderCode: BigInt(orderCode),
            customerName: customer.name!.trim(),
            customerPhone: customer.phone!,
            customerAddress: customer.address!.trim(),
            braceletConfig: { kind: "catalog_product", productId: product.id, sku: product.sku, name: product.name, quantity: requestedQuantity },
            totalPrice: total,
            order_items: { create: {
              product_id: product.id,
              product_name: product.name,
              sku: product.sku,
              product_type: product.type,
              quantity: requestedQuantity,
              unit_price: product.price,
              line_total: total,
              details: { details: product.details, wristCircumference: product.bracelet_product_details?.wrist_circumference ?? null },
            } },
          } });
          return { order: createdOrder, amount: total, name: product.name };
        });
      } catch (error) {
        if (error instanceof ProductStockUnavailableError) {
          const status = error.message.includes("không còn khả dụng") ? 404 : 409;
          return NextResponse.json({ success: false, message: error.message }, { status });
        }
        throw error;
      }
      order = purchase.order;
      amount = purchase.amount;
      payItemName = purchase.name.slice(0, 50);
      payQuantity = requestedQuantity;
      isCatalogProduct = true;
    } else {
      if (!braceletConfig || !Number.isInteger(braceletConfig.wristCircumference) ||
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
      amount = selectedBeads.reduce((sum, bead) => sum + bead.price, 0);
      payItemName = "Vòng tay thiết kế";
      const orderCode = randomInt(1_000_000_000, 9_000_000_000);
      order = await prisma.order.create({ data: {
        orderCode: BigInt(orderCode),
        customerName: customer.name.trim(), customerPhone: customer.phone,
        customerAddress: customer.address.trim(), braceletConfig: braceletConfig as object,
        totalPrice: amount,
      } });
    }
    const baseUrl = process.env.APP_URL ?? new URL(req.url).origin;

    let paymentLinkRes;
    try {
      paymentLinkRes = await payos.paymentRequests.create({
        orderCode: Number(order.orderCode), amount,
        description: `Vong tay ${order.orderCode}`,
        items: [{ name: payItemName.slice(0, 50), quantity: payQuantity, price: Math.floor(amount / payQuantity) }],
        ...(isCatalogProduct ? { expiredAt: Math.floor(Date.now() / 1000) + 15 * 60 } : {}),
        cancelUrl: `${baseUrl}/checkout/result?orderId=${order.id}&cancel=true`,
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
