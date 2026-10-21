import { prisma } from "@/lib/prisma";

export async function settlePaidOrder(orderCode: bigint, amount: number) {
  const order = await prisma.order.findUnique({ where: { orderCode }, select: { id: true, totalPrice: true } });
  if (!order || order.totalPrice !== amount) throw new Error("Order not found or amount mismatch");

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${order.id}::uuid FOR UPDATE`;
    const current = await tx.order.findUnique({ where: { id: order.id }, include: { order_items: true } });
    if (!current || current.paymentStatus === "paid") return current;

    const quantities = new Map<string, number>();
    for (const item of current.order_items) {
      if (item.product_id) quantities.set(item.product_id, (quantities.get(item.product_id) ?? 0) + item.quantity);
    }
    const productIds = [...quantities.keys()].sort();
    for (const productId of productIds) {
      await tx.$queryRaw`SELECT id FROM products WHERE id = ${productId}::uuid FOR UPDATE`;
    }
    const products = productIds.length
      ? await tx.products.findMany({ where: { id: { in: productIds } }, select: { id: true, stock: true } })
      : [];
    const stockById = new Map(products.map((product) => [product.id, product.stock]));
    const inventoryReviewRequired = current.order_items.some((item) => !item.product_id) ||
      productIds.some((id) => (stockById.get(id) ?? -1) < quantities.get(id)!);

    if (!inventoryReviewRequired) {
      for (const productId of productIds) {
        const quantity = quantities.get(productId)!;
        await tx.products.update({ where: { id: productId }, data: { stock: { decrement: quantity } } });
        await tx.inventory_movements.create({ data: {
          product_id: productId,
          quantity_delta: -quantity,
          reason: "customer_purchase",
          order_id: current.id,
        } });
      }
    }

    return tx.order.update({
      where: { id: current.id },
      data: {
        paymentStatus: "paid",
        paidAt: current.paidAt ?? new Date(),
        ...(current.order_status === "cancelled" ? { order_status: "new" } : {}),
        inventoryReviewRequired: inventoryReviewRequired || current.inventoryReviewRequired,
      },
    });
  }, { maxWait: 5_000, timeout: 15_000 });
}

export async function deleteUnpaidOrder(orderCode: bigint) {
  const order = await prisma.order.findUnique({ where: { orderCode }, select: { id: true } });
  if (!order) return;
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${order.id}::uuid FOR UPDATE`;
    const current = await tx.order.findUnique({ where: { id: order.id }, select: { paymentStatus: true } });
    if (!current || current.paymentStatus !== "pending") return;
    await tx.order.delete({ where: { id: order.id } });
  });
}
