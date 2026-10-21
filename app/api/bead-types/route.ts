import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const beads = await prisma.products.findMany({
    where: { type: "bead", status: "active", bead_product_details: { isNot: null } },
    include: { bead_product_details: true },
    orderBy: { name: "asc" },
  });
  const reservedUntil = new Date(Date.now() - 15 * 60 * 1000);
  const reservations = beads.length ? await prisma.$queryRaw<Array<{ product_id: string; reserved: number }>>`
    SELECT oi.product_id, COALESCE(SUM(oi.quantity), 0)::int AS reserved
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.product_id IN (${Prisma.join(beads.map((bead) => Prisma.sql`${bead.id}::uuid`))})
      AND o.payment_status = 'pending'
      AND o.created_at > ${reservedUntil}
    GROUP BY oi.product_id
  ` : [];
  const reservedByProduct = new Map(reservations.map((row) => [row.product_id, Number(row.reserved)]));
  return NextResponse.json({ success: true, data: beads.map((product) => ({
    id: product.sku,
    code: product.sku,
    name: product.name,
    material: product.bead_product_details!.material,
    color: product.bead_product_details!.color,
    emissive: product.bead_product_details!.emissive_color ?? undefined,
    metalness: product.bead_product_details!.metalness,
    roughness: product.bead_product_details!.roughness,
    price: product.price,
    stock: Math.max(0, product.stock - (reservedByProduct.get(product.id) ?? 0)),
    description: product.description ?? "",
    diameter: product.bead_product_details!.diameter,
    is_active: product.status === "active",
  })) });
}
