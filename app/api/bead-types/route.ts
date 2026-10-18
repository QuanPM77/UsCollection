import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const beads = await prisma.products.findMany({
    where: { type: "bead", status: "active", stock: { gt: 0 }, bead_product_details: { isNot: null } },
    include: { bead_product_details: true },
    orderBy: { name: "asc" },
  });
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
    stock: product.stock,
    description: product.description ?? "",
    diameter: product.bead_product_details!.diameter,
    is_active: product.status === "active",
  })) });
}
