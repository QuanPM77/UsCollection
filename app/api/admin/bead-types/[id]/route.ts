import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";
import { readBeadKind, readBeadModel } from "@/lib/bead-model";
import { prisma } from "@/lib/prisma";

type BeadInput = { kind?: "bead" | "charm"; name?: string; material?: "glass" | "crystal" | "wood" | "stone" | "pearl" | "metal"; color?: string; emissive?: string; metalness?: number; roughness?: number; price?: number; costPrice?: number; stock?: number; description?: string; diameter?: number; thumbnail?: string };
async function getAdminId() {
  const session = await auth();
  return session?.user?.id && session.user.role === "admin" ? session.user.id : null;
}
function isValid(input: BeadInput) {
  return (input.thumbnail === undefined || input.thumbnail === "" || (typeof input.thumbnail === "string" && input.thumbnail.length <= 200000 && /^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(input.thumbnail))) &&
    (input.kind === undefined || input.kind === "bead" || input.kind === "charm") &&
    typeof input.name === "string" && input.name.trim().length >= 2 && input.name.trim().length <= 100 &&
    ["glass", "crystal", "wood", "stone", "pearl", "metal"].includes(input.material ?? "") &&
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
  const current = await prisma.products.findFirst({ where: { sku: id, type: "bead" }, include: { bead_product_details: true } });
  if (!current) return NextResponse.json({ message: "Không tìm thấy loại hạt." }, { status: 404 });
  let modelData = current.bead_product_details?.model_3d as Prisma.InputJsonValue | null | undefined;
  {
    const nextModelData = modelData && typeof modelData === "object" && !Array.isArray(modelData)
      ? { ...(modelData as Record<string, unknown>) }
      : {};
    nextModelData.kind = body.kind ?? readBeadKind(modelData);
    if (body.thumbnail !== undefined) {
      if (body.thumbnail) { nextModelData.thumbnail = body.thumbnail; nextModelData.thumbnailSource = "photo"; }
      else { delete nextModelData.thumbnail; delete nextModelData.thumbnailSource; }
    }
    modelData = Object.keys(nextModelData).length ? nextModelData as Prisma.InputJsonValue : null;
  }
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
        create: { material: body.material!, color: body.color!, emissive_color: body.emissive || null, metalness: body.metalness!, roughness: body.roughness!, diameter: body.diameter!, model_3d: modelData ? modelData as Prisma.InputJsonValue : Prisma.DbNull },
        update: { material: body.material!, color: body.color!, emissive_color: body.emissive || null, metalness: body.metalness!, roughness: body.roughness!, diameter: body.diameter!, ...(body.thumbnail !== undefined ? { model_3d: modelData ? modelData as Prisma.InputJsonValue : Prisma.DbNull } : {}) },
      } },
    }, include: { bead_product_details: true } });
    const stockDelta = body.stock! - locked.stock;
    if (stockDelta !== 0) await tx.inventory_movements.create({ data: { product_id: current.id, quantity_delta: stockDelta, reason: "inventory_adjustment", changed_by: adminId } });
    return product;
  });
  return NextResponse.json({ bead: { id: updated.sku, name: updated.name, description: updated.description ?? "", price: updated.price, costPrice: updated.cost_price, stock: updated.stock, status: updated.status,
    kind: readBeadKind(updated.bead_product_details?.model_3d), material: updated.bead_product_details?.material ?? "crystal", color: updated.bead_product_details?.color ?? "#ffffff", emissive: updated.bead_product_details?.emissive_color ?? "",
    metalness: updated.bead_product_details?.metalness ?? 0, roughness: updated.bead_product_details?.roughness ?? 0.5, diameter: updated.bead_product_details?.diameter ?? 8 } });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminId())) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ message: "Yêu cầu không hợp lệ." }, { status: 403 });
  const { id } = await params;
  try {
    const result = await prisma.$transaction(async tx => {
      const current = await tx.products.findFirst({ where: { sku: id, type: "bead" }, select: { id: true } });
      if (!current) return { status: 404, message: "Không tìm thấy loại hạt." };
      await tx.$queryRaw`SELECT id FROM products WHERE id = ${current.id}::uuid FOR UPDATE`;
      const [orders, bracelets] = await Promise.all([
        tx.order_items.count({ where: { product_id: current.id } }),
        tx.bracelet_product_beads.count({ where: { bead_product_id: current.id } }),
      ]);
      if (orders || bracelets) return { status: 409, message: orders
        ? "Không thể xóa vĩnh viễn: hạt đang được tham chiếu trong đơn hàng. Hạt chưa bị xóa hoặc ẩn."
        : "Không thể xóa vĩnh viễn: hạt đang nằm trong mẫu vòng. Hãy bỏ hạt khỏi mẫu vòng trước. Hạt chưa bị xóa hoặc ẩn." };
      // Stock movements cannot outlive their required product FK. Order-linked
      // products are rejected above; product details/model version rows cascade.
      await tx.inventory_movements.deleteMany({ where: { product_id: current.id } });
      await tx.products.delete({ where: { id: current.id } });
      return { status: 200, message: "Đã xóa vĩnh viễn loại hạt." };
    });
    return NextResponse.json({ success: result.status === 200, message: result.message }, { status: result.status });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "P2003") return NextResponse.json({ message: "Hạt đang được dữ liệu khác tham chiếu nên chưa thể xóa. Hạt chưa bị xóa hoặc ẩn." }, { status: 409 });
    if (code === "P2025") return NextResponse.json({ message: "Hạt đã được xóa ở nơi khác. Hãy tải lại danh sách." }, { status: 404 });
    console.error("Bead deletion failed", error);
    return NextResponse.json({ message: "Không xóa được hạt. Vui lòng thử lại." }, { status: 503 });
  }
}

export async function PUT(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminId())) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });
  const { id } = await params;
  const current = await prisma.products.findFirst({ where: { sku: id, type: "bead" }, include: { bead_product_details: true } });
  if (!current) return NextResponse.json({ message: "Không tìm thấy hạt." }, { status: 404 });
  if (current.status === "draft" && !readBeadModel(current.bead_product_details?.model_3d)) {
    return NextResponse.json({ message: "Cần lưu model thành công trước khi hoàn tất bản nháp." }, { status: 409 });
  }
  const result = await prisma.products.updateMany({ where: { sku: id, type: "bead" }, data: { status: "active" } });
  if (!result.count) return NextResponse.json({ message: "Không tìm thấy loại hạt." }, { status: 404 });
  return NextResponse.json({ success: true });
}
