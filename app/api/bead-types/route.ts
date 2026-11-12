import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readBeadModel, readBeadPhotoThumbnail } from "@/lib/bead-model";

export async function GET() {
  const reservedUntil = new Date(Date.now() - 15 * 60 * 1000);
  const beads = await prisma.$queryRaw<Array<{
    id: string; sku: string; name: string; description: string | null; price: number;
    stock: number; reserved: number; material: string; color: string; emissive_color: string | null;
    metalness: number; roughness: number; diameter: number; model_3d: unknown;
  }>>`
    SELECT p.id, p.sku, p.name, p.description, p.price, p.stock,
      COALESCE(reservations.reserved, 0)::int AS reserved,
      details.material::text AS material, details.color, details.emissive_color,
      details.metalness, details.roughness, details.diameter, details.model_3d
    FROM products p
    JOIN bead_product_details details ON details.product_id = p.id
    LEFT JOIN (
      SELECT oi.product_id, SUM(oi.quantity)::int AS reserved
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products active_bead ON active_bead.id = oi.product_id
        AND active_bead.type::text = 'bead' AND active_bead.status::text = 'active'
      WHERE o.payment_status = 'pending' AND o.created_at > ${reservedUntil}
      GROUP BY oi.product_id
    ) reservations ON reservations.product_id = p.id
    WHERE p.type::text = 'bead' AND p.status::text = 'active'
    ORDER BY p.name ASC
  `;
  return NextResponse.json({ success: true, data: beads.map((product) => ({
    id: product.sku,
    code: product.sku,
    name: product.name,
    material: product.material,
    color: product.color,
    emissive: product.emissive_color ?? undefined,
    metalness: product.metalness,
    roughness: product.roughness,
    price: product.price,
    stock: Math.max(0, product.stock - product.reserved),
    description: product.description ?? "",
    diameter: product.diameter,
    model: readBeadModel(product.model_3d),
    thumbnail: readBeadPhotoThumbnail(product.model_3d),
    is_active: true,
  })) });
}
