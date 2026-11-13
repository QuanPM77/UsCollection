import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { readBeadKind, readBeadModel, readBeadPhotoThumbnail } from "@/lib/bead-model";
import { prisma } from "@/lib/prisma";

const materials = ["glass", "crystal", "wood", "stone", "pearl", "metal"] as const;
type BeadInput = { kind?: "bead" | "charm"; draft?: boolean; id?: string; name?: string; material?: string; color?: string; emissive?: string; metalness?: number; roughness?: number; price?: number; costPrice?: number; stock?: number; description?: string; diameter?: number; thumbnail?: string };

async function getAdminId() {
  const session = await auth();
  return session?.user?.id && session.user.role === "admin" ? session.user.id : null;
}

function validate(input: BeadInput) {
  return (input.thumbnail === undefined || input.thumbnail === "" || (typeof input.thumbnail === "string" && input.thumbnail.length <= 200000 && /^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(input.thumbnail))) &&
    (input.kind === undefined || input.kind === "bead" || input.kind === "charm") &&
    (input.draft === undefined || typeof input.draft === "boolean") && typeof input.name === "string" && input.name.trim().length >= 2 && input.name.trim().length <= 100 &&
    typeof input.material === "string" && materials.includes(input.material as typeof materials[number]) &&
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

function toResponse(product: { sku: string; name: string; description: string | null; price: number; cost_price: number | null; stock: number; status: string; bead_product_details: { model_3d?: unknown; material: string; color: string; emissive_color: string | null; metalness: number; roughness: number; diameter: number } | null }) {
  const kind = readBeadKind(product.bead_product_details?.model_3d);
  const model = readBeadModel(product.bead_product_details?.model_3d);
  return { kind, model: model ? { ...model, attachment: kind === "charm" ? "pendant" as const : "bead" as const } : undefined, thumbnail: readBeadPhotoThumbnail(product.bead_product_details?.model_3d), id: product.sku, name: product.name, description: product.description ?? "", price: product.price, costPrice: product.cost_price, stock: product.stock, status: product.status,
    material: product.bead_product_details?.material ?? "crystal", color: product.bead_product_details?.color ?? "#ffffff",
    emissive: product.bead_product_details?.emissive_color ?? "", metalness: product.bead_product_details?.metalness ?? 0,
    roughness: product.bead_product_details?.roughness ?? 0.5, diameter: product.bead_product_details?.diameter ?? 8 };
}

export async function GET(request: Request) {
  if (!(await getAdminId())) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });
  const attention = new URL(request.url).searchParams.get("stockStatus") === "attention";
  const settings = attention ? await prisma.store_settings.findUnique({ where: { id: 1 }, select: { low_stock_threshold: true } }) : null;
  const threshold = settings?.low_stock_threshold ?? 5;
  const products = await prisma.products.findMany({ where: { type: "bead", ...(attention ? { status: "active", OR: [{ stock: 0 }, { stock: { gt: 0, lte: threshold } }] } : {}) }, include: { bead_product_details: true }, orderBy: { name: "asc" } });
  return NextResponse.json({ beads: products.map(toResponse) });
}

export async function POST(request: Request) {
  const adminId = await getAdminId();
  if (!adminId) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });
  const body = await request.json().catch(() => null) as BeadInput | null;
  if (!body || !validate(body)) return NextResponse.json({ message: "Thông tin hạt không hợp lệ." }, { status: 400 });
  const slug = body.id?.trim().toLowerCase();
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 64) return NextResponse.json({ message: "Mã hạt không hợp lệ." }, { status: 400 });
  try {
    const product = await prisma.products.create({ data: {
      sku: slug, type: "bead", name: body.name!.trim(), description: body.description!.trim(), price: body.price!, cost_price: body.costPrice!, stock: body.stock!, status: body.draft ? "draft" : "active",
      inventory_movements: body.stock! > 0 ? { create: { quantity_delta: body.stock!, reason: "initial_stock", changed_by: adminId } } : undefined,
      bead_product_details: { create: { material: body.material as typeof materials[number], color: body.color!, emissive_color: body.emissive || null, metalness: body.metalness!, roughness: body.roughness!, diameter: body.diameter!, model_3d: { kind: body.kind ?? "bead", ...(body.thumbnail ? { thumbnail: body.thumbnail, thumbnailSource: "photo" } : {}) } } },
    }, include: { bead_product_details: true } });
    return NextResponse.json({ bead: toResponse(product) }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return NextResponse.json({ message: "Mã hạt đã tồn tại." }, { status: 409 });
    throw error;
  }
}
