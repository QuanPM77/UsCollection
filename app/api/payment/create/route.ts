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
import { Prisma } from "@prisma/client";
import { deleteUnpaidOrder } from "@/lib/payment-settlement";

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY,
});
const PAYMENT_WINDOW_MS = 15 * 60 * 1000;

class ProductStockUnavailableError extends Error {}

async function waitForPaymentCheckoutUrl(orderId: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const [paymentLink] = await prisma.$queryRaw<Array<{ payment_checkout_url: string | null }>>`
      SELECT payment_checkout_url FROM orders WHERE id = ${orderId}::uuid
    `;
    if (paymentLink?.payment_checkout_url) return paymentLink.payment_checkout_url;
    if (attempt < 19) await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user.id) {
      return NextResponse.json({ success: false, message: "Vui lòng đăng nhập để tiếp tục thanh toán." }, { status: 401 });
    }
    if (session.user.role !== "customer") {
      return NextResponse.json({ success: false, message: "Chỉ tài khoản khách hàng mới có thể đặt hàng." }, { status: 403 });
    }
    const account = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { profileCompletedAt: true, phone: true, email: true, emailVerifiedAt: true, status: true },
    });
    if (!account || account.status !== "active") {
      return NextResponse.json({ success: false, message: "Tài khoản không còn khả dụng." }, { status: 403 });
    }
    if (!account.profileCompletedAt || !account.phone) {
      return NextResponse.json({ success: false, message: "Vui lòng hoàn tất hồ sơ khách hàng trước khi đặt hàng." }, { status: 403 });
    }
    if (!account.email || !account.emailVerifiedAt) {
      return NextResponse.json({ success: false, message: "Vui lòng xác thực email trước khi đặt hàng." }, { status: 403 });
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
    const customerName = customer.name.trim();
    const customerPhone = customer.phone;
    const customerAddress = customer.address.trim();
    const reservationCutoff = new Date(Date.now() - PAYMENT_WINDOW_MS);
    const existingCheckout = await prisma.order.findFirst({
      where: { user_id: session.user.id, paymentStatus: "pending", createdAt: { gt: reservationCutoff } },
      orderBy: { createdAt: "asc" },
    });
    if (existingCheckout) {
      const checkoutUrl = await waitForPaymentCheckoutUrl(existingCheckout.id);
      if (!checkoutUrl) {
        return NextResponse.json({ success: false, message: "Đơn thanh toán đầu tiên đang được tạo. Vui lòng tiếp tục ở tab đã bắt đầu thanh toán." }, { status: 409 });
      }
      return NextResponse.json({ success: true, payUrl: checkoutUrl, amount: existingCheckout.totalPrice, orderCode: String(existingCheckout.orderCode), orderId: existingCheckout.id, expiresAt: existingCheckout.createdAt.getTime() + PAYMENT_WINDOW_MS, reused: true });
    }

    let amount: number;
    let payItemName: string;
    let payQuantity = 1;
    let order: Awaited<ReturnType<typeof prisma.order.create>> & { paymentCheckoutUrl?: string | null };
    let reusedExistingOrder = false;
    if (typeof productId === "string") {
      const requestedQuantity = typeof quantity === "number" ? quantity : Number.NaN;
      if (!/^[0-9a-f-]{36}$/i.test(productId) || !Number.isSafeInteger(requestedQuantity) || requestedQuantity < 1) {
        return NextResponse.json({ success: false, message: "Số lượng mua không hợp lệ." }, { status: 400 });
      }
      const orderCode = randomInt(1_000_000_000, 9_000_000_000);
      let purchase: { order: Awaited<ReturnType<typeof prisma.order.create>> & { paymentCheckoutUrl?: string | null }; amount: number; name: string; reused: boolean };
      try {
        purchase = await prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM users WHERE id = ${session.user.id}::uuid FOR UPDATE`;
          const activeOrder = await tx.order.findFirst({
            where: { user_id: session.user.id, paymentStatus: "pending", createdAt: { gt: reservationCutoff } },
            orderBy: { createdAt: "asc" },
          });
          if (activeOrder) {
            const [paymentLink] = await tx.$queryRaw<Array<{ payment_checkout_url: string | null }>>`
              SELECT payment_checkout_url FROM orders WHERE id = ${activeOrder.id}::uuid
            `;
            return { order: { ...activeOrder, paymentCheckoutUrl: paymentLink?.payment_checkout_url ?? null }, amount: activeOrder.totalPrice, name: "Đơn thanh toán hiện tại", reused: true };
          }

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
            FROM order_items oi JOIN orders o ON o.id = oi.order_id
            WHERE oi.product_id = ${productId}::uuid
              AND o.payment_status = 'pending'
              AND o.created_at > ${reservationCutoff}
          `;
          const available = Math.max(0, product.stock - Number(reservation?.reserved ?? 0));
          if (available < requestedQuantity) {
            const message = available === 0
              ? "Sản phẩm hiện đã hết hàng. Vui lòng chọn sản phẩm khác hoặc quay lại sau."
              : `Số lượng bạn chọn vượt quá số lượng hiện có. Hiện bạn có thể đặt tối đa ${available} sản phẩm.`;
            throw new ProductStockUnavailableError(message);
          }

          const total = product.price * requestedQuantity;
          const createdOrder = await tx.order.create({ data: {
            orderCode: BigInt(orderCode),
            user_id: session.user.id,
            customerName,
            customerPhone,
            customerAddress,
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
          return { order: createdOrder, amount: total, name: product.name, reused: false };
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
      reusedExistingOrder = purchase.reused;
      if (purchase.reused) {
        const checkoutUrl = purchase.order.paymentCheckoutUrl ?? await waitForPaymentCheckoutUrl(purchase.order.id);
        if (!checkoutUrl) {
          return NextResponse.json({ success: false, message: "Đơn thanh toán đầu tiên đang được tạo. Vui lòng tiếp tục ở tab đã bắt đầu thanh toán." }, { status: 409 });
        }
        return NextResponse.json({ success: true, payUrl: checkoutUrl, amount, orderCode: String(order.orderCode), orderId: order.id, expiresAt: order.createdAt.getTime() + PAYMENT_WINDOW_MS, reused: true });
      }
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
      payItemName = "Vòng tay thiết kế";
      const orderCode = randomInt(1_000_000_000, 9_000_000_000);
      const quantities = new Map<string, number>();
      for (const sku of selectedIds) quantities.set(sku, (quantities.get(sku) ?? 0) + 1);
      try {
        const checkout = await prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM users WHERE id = ${session.user.id}::uuid FOR UPDATE`;
          const activeOrder = await tx.order.findFirst({
            where: { user_id: session.user.id, paymentStatus: "pending", createdAt: { gt: reservationCutoff } },
            orderBy: { createdAt: "asc" },
          });
          if (activeOrder) {
            const [paymentLink] = await tx.$queryRaw<Array<{ payment_checkout_url: string | null }>>`
              SELECT payment_checkout_url FROM orders WHERE id = ${activeOrder.id}::uuid
            `;
            return { order: { ...activeOrder, paymentCheckoutUrl: paymentLink?.payment_checkout_url ?? null }, amount: activeOrder.totalPrice, reused: true };
          }

          const productIds = [...new Set(selectedBeads.map((bead) => bead.id))].sort();
          const idSql = Prisma.join(productIds.map((id) => Prisma.sql`${id}::uuid`));
          await tx.$queryRaw`SELECT id FROM products WHERE id IN (${idSql}) ORDER BY id FOR UPDATE`;
          const lockedBeads = await tx.products.findMany({
            where: { id: { in: productIds } },
            select: { id: true, sku: true, name: true, type: true, status: true, stock: true, price: true, cost_price: true,
              bead_product_details: { select: { material: true, color: true, emissive_color: true, metalness: true, roughness: true, diameter: true } } },
          });
          const lockedBySku = new Map(lockedBeads.map((bead) => [bead.sku, bead]));
          if (lockedBeads.length !== productIds.length || selectedIds.some((sku) => {
            const bead = lockedBySku.get(sku);
            return !bead || bead.type !== "bead" || bead.status !== "active" || !bead.bead_product_details;
          })) throw new ProductStockUnavailableError("Một hoặc nhiều loại hạt không còn được bán. Vui lòng cập nhật thiết kế.");
          const reservations = await tx.$queryRaw<Array<{ product_id: string; reserved: number }>>`
            SELECT oi.product_id, COALESCE(SUM(oi.quantity), 0)::int AS reserved
            FROM order_items oi JOIN orders o ON o.id = oi.order_id
            WHERE oi.product_id IN (${idSql}) AND o.payment_status = 'pending' AND o.created_at > ${reservationCutoff}
            GROUP BY oi.product_id
          `;
          const reservedByProduct = new Map(reservations.map((reservation) => [reservation.product_id, Number(reservation.reserved)]));
          for (const sku of quantities.keys()) {
            const bead = lockedBySku.get(sku)!;
            if (bead.cost_price === null) throw new ProductStockUnavailableError(`Hạt “${bead.name}” chưa được cập nhật giá vốn. Vui lòng liên hệ cửa hàng.`);
            const quantity = quantities.get(sku)!;
            const available = Math.max(0, bead.stock - (reservedByProduct.get(bead.id) ?? 0));
            if (available < quantity) throw new ProductStockUnavailableError(`Hạt “${bead.name}” cần ${quantity} hạt nhưng hiện chỉ còn đặt được ${available}. Hãy xóa bớt hạt này hoặc chọn loại khác.`);
          }
          const freshSelectedBeads = selectedIds.map((sku) => lockedBySku.get(sku)!);
          const freshBraceletLength = freshSelectedBeads.reduce((sum, bead) => sum + (bead.bead_product_details?.diameter ?? 8), 0);
          if (freshBraceletLength > braceletConfig.wristCircumference + 2) {
            throw new ProductStockUnavailableError("Thông số hạt vừa được cập nhật và vượt quá chu vi cổ tay. Vui lòng tải lại thiết kế.");
          }
          const total = freshSelectedBeads.reduce((sum, bead) => sum + bead.price, 0);
          const createdOrder = await tx.order.create({ data: {
            orderCode: BigInt(orderCode),
            user_id: session.user.id,
            customerName, customerPhone,
            customerAddress, braceletConfig: braceletConfig as object,
            totalPrice: total,
            order_items: { create: [...quantities.entries()].map(([sku, quantity]) => {
              const bead = lockedBySku.get(sku)!;
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
          return { order: createdOrder, amount: total, reused: false };
        }, { maxWait: 5_000, timeout: 15_000 });
        order = checkout.order;
        amount = checkout.amount;
        reusedExistingOrder = checkout.reused;
      } catch (error) {
        if (error instanceof ProductStockUnavailableError) return NextResponse.json({ success: false, message: error.message }, { status: 409 });
        throw error;
      }
      if (reusedExistingOrder) {
        const checkoutUrl = order.paymentCheckoutUrl ?? await waitForPaymentCheckoutUrl(order.id);
        if (!checkoutUrl) {
          return NextResponse.json({ success: false, message: "Đơn thanh toán đầu tiên đang được tạo. Vui lòng tiếp tục ở tab đã bắt đầu thanh toán." }, { status: 409 });
        }
        return NextResponse.json({ success: true, payUrl: checkoutUrl, amount, orderCode: String(order.orderCode), orderId: order.id, expiresAt: order.createdAt.getTime() + PAYMENT_WINDOW_MS, reused: true });
      }
    }
    const baseUrl = process.env.APP_URL ?? new URL(req.url).origin;

    let paymentLinkRes;
    const expiresAt = order.createdAt.getTime() + PAYMENT_WINDOW_MS;
    try {
      paymentLinkRes = await payos.paymentRequests.create({
        orderCode: Number(order.orderCode), amount,
        description: `Vong tay ${order.orderCode}`,
        items: [{ name: payItemName.slice(0, 50), quantity: payQuantity, price: Math.floor(amount / payQuantity) }],
        expiredAt: Math.floor(expiresAt / 1000),
        cancelUrl: `${baseUrl}/checkout/result?orderId=${order.id}&cancel=true`,
        returnUrl: `${baseUrl}/checkout/result?orderId=${order.id}`,
      });
      await prisma.$executeRaw`
        UPDATE orders
        SET payment_link_id = ${paymentLinkRes.paymentLinkId}, payment_checkout_url = ${paymentLinkRes.checkoutUrl}
        WHERE id = ${order.id}::uuid
      `;
    } catch (error) {
      if (paymentLinkRes?.paymentLinkId) {
        await payos.paymentRequests.cancel(Number(order.orderCode), "Không thể hoàn tất khởi tạo thanh toán").catch(() => undefined);
      }
      await deleteUnpaidOrder(order.orderCode);
      throw error;
    }

    return NextResponse.json({
      success: true,
      payUrl: paymentLinkRes.checkoutUrl,
      amount,
      orderCode: String(order.orderCode),
      orderId: order.id,
      expiresAt,
      reused: false,
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
