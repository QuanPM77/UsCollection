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
import { auth } from "@/auth";
import { PayOS } from "@payos/node";
import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { BraceletConfig } from "@/types";

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY,
});

class ProductStockUnavailableError extends Error {}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user.id) {
      return NextResponse.json({ success: false, message: "Vui lòng đăng nhập để tiếp tục thanh toán." }, { status: 401 });
    }
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
          if (product.cost_price === null) throw new ProductStockUnavailableError("Sản phẩm chưa được cập nhật giá vốn. Vui lòng liên hệ cửa hàng để hoàn tất đơn hàng.");
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
            user_id: session.user.id,
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
              unit_cost: product.cost_price,
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
    } else {
      if (!braceletConfig || !Number.isInteger(braceletConfig.wristCircumference) ||
        braceletConfig.wristCircumference < 100 || braceletConfig.wristCircumference > 250 ||
        !Array.isArray(braceletConfig.slots) ||
        braceletConfig.slots.some((slot, index) => slot.index !== index ||
          (slot.beadTypeId !== null && (typeof slot.beadTypeId !== "string" || slot.beadTypeId.length > 64)))) {
        return NextResponse.json({ success: false, message: "Thông tin đơn hàng không hợp lệ." }, { status: 400 });
      }
      const selectedIds = braceletConfig.slots.flatMap((slot) => slot.beadTypeId ? [slot.beadTypeId] : []);
      if (!selectedIds.length) return NextResponse.json({ success: false, message: "Vui lòng chọn ít nhất một hạt." }, { status: 400 });
      const catalogBeads = await prisma.products.findMany({
        where: {
          type: "bead", status: "active", sku: { in: [...new Set(selectedIds)] },
          bead_product_details: { isNot: null },
        },
        select: {
          id: true, sku: true, name: true, price: true, cost_price: true,
          bead_product_details: {
            select: { material: true, color: true, emissive_color: true, metalness: true, roughness: true, diameter: true },
          },
        },
      });
      const beadBySku = new Map(catalogBeads.map((bead) => [bead.sku, bead]));
      const selectedBeads = selectedIds.map((sku) => beadBySku.get(sku)).filter((bead) => bead !== undefined);
      if (selectedBeads.length !== selectedIds.length) {
        return NextResponse.json({ success: false, message: "Một hoặc nhiều loại hạt không còn được bán. Vui lòng cập nhật thiết kế." }, { status: 409 });
      }
      if (selectedBeads.some((bead) => bead.cost_price === null)) {
        return NextResponse.json({ success: false, message: "Một hoặc nhiều loại hạt chưa được cập nhật giá vốn. Vui lòng liên hệ cửa hàng để hoàn tất đơn hàng." }, { status: 409 });
      }
      const braceletLength = selectedBeads.reduce((sum, bead) => sum + (bead.bead_product_details?.diameter ?? 8), 0);
      if (braceletLength > braceletConfig.wristCircumference + 2) {
        return NextResponse.json({ success: false, message: "Tổng kích thước hạt vượt quá chu vi cổ tay đã chọn. Vui lòng điều chỉnh kích thước hoặc thiết kế." }, { status: 400 });
      }
      amount = selectedBeads.reduce((sum, bead) => sum + bead.price, 0);
      payItemName = "Vòng tay thiết kế";
      const orderCode = randomInt(1_000_000_000, 9_000_000_000);
      const quantities = new Map<string, number>();
      for (const sku of selectedIds) quantities.set(sku, (quantities.get(sku) ?? 0) + 1);
      const reservedUntil = new Date(Date.now() - 15 * 60 * 1000);
      try {
        order = await prisma.$transaction(async (tx) => {
          for (const bead of [...selectedBeads].sort((a, b) => a.id.localeCompare(b.id))) {
            const quantity = quantities.get(bead.sku) ?? 0;
            await tx.$queryRaw`SELECT id FROM products WHERE id = ${bead.id}::uuid FOR UPDATE`;
            const lockedBead = await tx.products.findUnique({ where: { id: bead.id }, select: { type: true, status: true, stock: true } });
            if (!lockedBead || lockedBead.type !== "bead" || lockedBead.status !== "active") throw new ProductStockUnavailableError("Một hoặc nhiều loại hạt không còn được bán.");
            const [reservation] = await tx.$queryRaw<Array<{ reserved: number }>>`
              SELECT COALESCE(SUM(oi.quantity), 0)::int AS reserved
              FROM order_items oi
              JOIN orders o ON o.id = oi.order_id
              WHERE oi.product_id = ${bead.id}::uuid
                AND o.payment_status = 'pending'
                AND o.created_at > ${reservedUntil}
            `;
            const available = Math.max(0, lockedBead.stock - Number(reservation?.reserved ?? 0));
            if (available < quantity) {
              throw new ProductStockUnavailableError(`Hạt “${bead.name}” cần ${quantity} hạt nhưng hiện chỉ còn đặt được ${available}. Hãy xóa bớt hạt này hoặc chọn loại khác.`);
            }
          }
          return tx.order.create({ data: {
            orderCode: BigInt(orderCode),
            user_id: session.user.id,
            customerName: customer.name.trim(), customerPhone: customer.phone,
            customerAddress: customer.address.trim(), braceletConfig: braceletConfig as object,
            totalPrice: amount,
            order_items: { create: [...quantities.entries()].map(([sku, quantity]) => {
              const bead = beadBySku.get(sku)!;
              return {
                product_id: bead.id, product_name: bead.name, sku: bead.sku, product_type: "bead",
                quantity, unit_price: bead.price, unit_cost: bead.cost_price, line_total: bead.price * quantity,
                details: bead.bead_product_details ? {
                  material: bead.bead_product_details.material,
                  color: bead.bead_product_details.color,
                  emissive: bead.bead_product_details.emissive_color,
                  metalness: bead.bead_product_details.metalness,
                  roughness: bead.bead_product_details.roughness,
                  diameter: bead.bead_product_details.diameter,
                } : undefined,
              };
            }) },
          } });
        }, { maxWait: 5_000, timeout: 15_000 });
      } catch (error) {
        if (error instanceof ProductStockUnavailableError) return NextResponse.json({ success: false, message: error.message }, { status: 409 });
        throw error;
      }
    }
    const baseUrl = process.env.APP_URL ?? new URL(req.url).origin;

    let paymentLinkRes;
    try {
      paymentLinkRes = await payos.paymentRequests.create({
        orderCode: Number(order.orderCode), amount,
        description: `Vong tay ${order.orderCode}`,
        items: [{ name: payItemName.slice(0, 50), quantity: payQuantity, price: Math.floor(amount / payQuantity) }],
        expiredAt: Math.floor(Date.now() / 1000) + 15 * 60,
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
      orderCode: String(order.orderCode),
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
