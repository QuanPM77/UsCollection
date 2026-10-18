import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });
  try {
  const query = new URL(request.url).searchParams;
  const search = query.get("search")?.trim();
  const type = query.get("type");
  const status = query.get("status");
  const material = query.get("material");
  const stockStatus = query.get("stockStatus");
  const settings = await prisma.store_settings.findUnique({ where: { id: 1 }, select: { low_stock_threshold: true } });
  const threshold = settings?.low_stock_threshold ?? 5;
  const conditions: Prisma.productsWhereInput[] = [];
  if (search) conditions.push({ OR: [{ name: { contains: search, mode: "insensitive" } }, { sku: { contains: search, mode: "insensitive" } }] });
  if (type === "bead" || type === "bracelet") conditions.push({ type });
  if (status === "active" || status === "inactive" || status === "draft") conditions.push({ status });
  else if (stockStatus) conditions.push({ status: "active" });
  if (material && ["glass", "crystal", "wood", "stone", "pearl"].includes(material)) conditions.push({ bead_product_details: { is: { material: material as "glass" | "crystal" | "wood" | "stone" | "pearl" } } });
  if (stockStatus === "attention") conditions.push({ OR: [{ stock: 0 }, { stock: { gt: 0, lte: threshold } }] });
  else if (stockStatus === "out_of_stock") conditions.push({ stock: 0 });
  else if (stockStatus === "low_stock") conditions.push({ stock: { gt: 0, lte: threshold } });
  else if (stockStatus === "in_stock") conditions.push({ stock: { gt: threshold } });
  const products = await prisma.products.findMany({
    where: { AND: conditions },
    include: { bead_product_details: true, bracelet_product_details: true },
    orderBy: { updated_at: "desc" },
  });
  return NextResponse.json({
    products: products.map((product) => product.type === "bead" ? {
      id: product.id, type: "bead", name: product.name, description: product.description ?? undefined,
      sku: product.sku, price: product.price, costPrice: product.cost_price, lowStockThreshold: threshold, stock: product.stock, status: product.status,
      createdAt: product.created_at.toISOString(), updatedAt: product.updated_at.toISOString(),
      material: product.bead_product_details?.material ?? "crystal", color: product.bead_product_details?.color ?? "#ffffff",
      metalness: product.bead_product_details?.metalness ?? 0, roughness: product.bead_product_details?.roughness ?? 0.5,
    } : {
      id: product.id, type: "bracelet", name: product.name, description: product.description ?? undefined,
      sku: product.sku, price: product.price, costPrice: product.cost_price, lowStockThreshold: threshold, stock: product.stock, status: product.status,
      createdAt: product.created_at.toISOString(), updatedAt: product.updated_at.toISOString(),
      beadTypeIds: [], wristCircumference: product.bracelet_product_details?.wrist_circumference ?? 160,
      imageUrl: product.images[0],
    }),
    total: products.length,
  });
  } catch (error) {
    console.error("Admin products request failed:", error);
    return NextResponse.json({ message: "Không thể tải danh sách sản phẩm. Vui lòng kiểm tra kết nối cơ sở dữ liệu." }, { status: 503 });
  }
}
