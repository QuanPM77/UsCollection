import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type BeadInput = { name?: string; material?: "glass" | "crystal" | "wood" | "stone" | "pearl"; color?: string; emissive?: string; metalness?: number; roughness?: number; price?: number; costPrice?: number; stock?: number; description?: string; diameter?: number };
async function getAdminId() {
  const session = await auth();
  return session?.user?.id && session.user.role === "admin" ? session.user.id : null;
}
function isValid(input: BeadInput) {
  return typeof input.name === "string" && input.name.trim().length >= 2 && input.name.trim().length <= 100 &&
    ["glass", "crystal", "wood", "stone", "pearl"].includes(input.material ?? "") &&
    typeof input.color === "string" && /^#[0-9a-f]{6}$/i.test(input.color) &&
    (input.emissive === undefined || input.emissive === "" || (typeof input.emissive === "string" && /^#[0-9a-f]{6}$/i.test(input.emissive))) &&
    typeof input.metalness === "number" && Number.isFinite(input.metalness) && input.metalness >= 0 && input.metalness <= 1 &&
    typeof input.roughness === "number" && Number.isFinite(input.roughness) && input.roughness >= 0 && input.roughness <= 1 &&
    typeof input.price === "number" && Number.isSafeInteger(input.price) && input.price > 0 &&
    typeof input.costPrice === "number" && Number.isSafeInteger(input.costPrice) && input.costPrice >= 0 &&
    typeof input.stock === "number" && Number.isSafeInteger(input.stock) && input.stock >= 0 &&
    typeof input.diameter === "number" && Number.isSafeInteger(input.diameter) && input.diameter >= 2 && input.diameter <= 30 &&
    typeof input.description === "string" && input.description.length <= 500;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminId();
  if (!adminId) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });
  const { id } = await params;
  const body = await request.json().catch(() => null) as BeadInput | null;
  if (!body || !isValid(body)) return NextResponse.json({ message: "Thông tin hạt không hợp lệ." }, { status: 400 });
  const current = await prisma.products.findFirst({ where: { sku: id, type: "bead" }, select: { id: true } });
  if (!current) return NextResponse.json({ message: "Không tìm thấy loại hạt." }, { status: 404 });
  const updated = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM products WHERE id = ${current.id}::uuid FOR UPDATE`;
    const locked = await tx.products.findUnique({ where: { id: current.id }, select: { stock: true } });
    if (!locked) throw new Error("Không tìm thấy loại hạt.");
    const [reservation] = await tx.$queryRaw<Array<{ reserved: number }>>`
      SELECT COALESCE(SUM(oi.quantity), 0)::int AS reserved
      FROM order_items oi JOIN orders o ON o.id = oi.order_id
      WHERE oi.product_id = ${current.id}::uuid AND o.payment_status = 'pending'
        AND o.created_at > ${new Date(Date.now() - 15 * 60 * 1000)}
    `;
    if (body.stock! < Number(reservation?.reserved ?? 0)) {
      throw new Error(`Không thể giảm tồn kho dưới ${reservation?.reserved ?? 0} hạt đang được giữ cho đơn chờ thanh toán.`);
    }
    const product = await tx.products.update({ where: { id: current.id }, data: {
      name: body.name!.trim(), description: body.description!.trim(), price: body.price!, cost_price: body.costPrice!, stock: body.stock!,
      bead_product_details: { upsert: {
        create: { material: body.material!, color: body.color!, emissive_color: body.emissive || null, metalness: body.metalness!, roughness: body.roughness!, diameter: body.diameter! },
        update: { material: body.material!, color: body.color!, emissive_color: body.emissive || null, metalness: body.metalness!, roughness: body.roughness!, diameter: body.diameter! },
      } },
    }, include: { bead_product_details: true } });
    const stockDelta = body.stock! - locked.stock;
    if (stockDelta !== 0) await tx.inventory_movements.create({ data: { product_id: current.id, quantity_delta: stockDelta, reason: "inventory_adjustment", changed_by: adminId } });
    return product;
  });
  return NextResponse.json({ bead: { id: updated.sku, name: updated.name, description: updated.description ?? "", price: updated.price, costPrice: updated.cost_price, stock: updated.stock, status: updated.status,
    material: updated.bead_product_details?.material ?? "crystal", color: updated.bead_product_details?.color ?? "#ffffff", emissive: updated.bead_product_details?.emissive_color ?? "",
    metalness: updated.bead_product_details?.metalness ?? 0, roughness: updated.bead_product_details?.roughness ?? 0.5, diameter: updated.bead_product_details?.diameter ?? 8 } });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminId())) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });
  const { id } = await params;
  const result = await prisma.products.updateMany({ where: { sku: id, type: "bead" }, data: { status: "inactive" } });
  if (!result.count) return NextResponse.json({ message: "Không tìm thấy loại hạt." }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function PUT(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminId())) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });
  const { id } = await params;
  const result = await prisma.products.updateMany({ where: { sku: id, type: "bead" }, data: { status: "active" } });
  if (!result.count) return NextResponse.json({ message: "Không tìm thấy loại hạt." }, { status: 404 });
  return NextResponse.json({ success: true });
}
