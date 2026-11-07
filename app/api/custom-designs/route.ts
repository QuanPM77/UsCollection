import { getSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { validateDesignInput } from "@/lib/saved-design";

const fail = (message: string, status: number) => Response.json({ message }, { status });
async function handle(request: Request) {
  const session = await getSession();
  if (!session?.user.id) return fail("Vui lòng đăng nhập để lưu và xem thiết kế.", 401);
  const userId = session.user.id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
  if (!user || user.status !== "active") return fail("Tài khoản không khả dụng.", 403);
  if (request.method === "GET") {
    const cursor = new URL(request.url).searchParams.get("cursor");
    if (cursor && !/^[0-9a-f-]{36}$/i.test(cursor)) return fail("Trang không hợp lệ.", 400);
    const rows = await prisma.savedDesign.findMany({ where: { userId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 13, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
    const data = rows.slice(0, 12);
    return Response.json({ data, nextCursor: rows.length > 12 ? data[11].id : null }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return fail("Yêu cầu không hợp lệ.", 403);
  const text = await request.text();
  if (text.length > 30000) return fail("Thiết kế quá lớn.", 413);
  let body;
  try { body = JSON.parse(text); } catch { return fail("Dữ liệu không hợp lệ.", 400); }
  const id = body?.id;
  if (request.method !== "POST") {
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return fail("Mã thiết kế không hợp lệ.", 400);
    if (!await prisma.savedDesign.findFirst({ where: { id, userId } })) return fail("Không tìm thấy thiết kế.", 404);
  }
  if (request.method === "DELETE") {
    await prisma.savedDesign.deleteMany({ where: { id, userId } });
    return Response.json({ success: true });
  }
  if (request.method === "PATCH" && body.renameOnly) {
    if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 80) return fail("Tên cần từ 1–80 ký tự.", 400);
    return writeDesign(userId, id, body.updatedAt, { name: body.name.trim() });
  }
  const input = validateDesignInput(body);
  if (!input) return fail("Nhập tên từ 1–80 ký tự và thêm ít nhất một hạt vào vòng.", 400);
  const products = await prisma.products.findMany({ where: { sku: { in: input.config.slots.map(s => s.beadTypeId!) }, type: "bead" }, include: { bead_product_details: true } });
  const beads = products.flatMap(p => p.bead_product_details ? [{
    id: p.sku, name: p.name, description: p.description ?? "", price: p.price,
    material: p.bead_product_details.material, color: p.bead_product_details.color,
    emissive: p.bead_product_details.emissive_color ?? undefined,
    diameter: p.bead_product_details.diameter, metalness: p.bead_product_details.metalness,
    roughness: p.bead_product_details.roughness, is_active: false, stock: 0,
  }] : []);
  if (input.config.slots.some(s => !beads.some(b => b.id === s.beadTypeId))) return fail("Một số hạt không còn tồn tại. Vui lòng thay hạt trước khi lưu.", 400);
  const data = { name: input.name, config: JSON.parse(JSON.stringify({ ...input.config, beads })) };
  return writeDesign(userId, request.method === "PATCH" ? id : null, body.updatedAt, data);
}

async function writeDesign(userId: string, id: string | null, updatedAt: unknown, data: { name: string; config?: import("@prisma/client").Prisma.InputJsonValue }) {
  return prisma.$transaction(async tx => {
    // Serialize writes for this owner, including concurrent POST retries from other tabs.
    await tx.$queryRaw`SELECT true AS locked FROM pg_advisory_xact_lock(hashtextextended(${userId}, 0))`;
    if (data.config) {
      const config = data.config as { slots: import("@prisma/client").Prisma.InputJsonValue; wristCircumference: number };
      const existing = await tx.savedDesign.findFirst({ where: { userId, ...(id ? { id: { not: id } } : {}), AND: [
        { config: { path: ["wristCircumference"], equals: config.wristCircumference } },
        { config: { path: ["slots"], equals: config.slots } },
      ] } });
      if (existing) return id ? fail("Thiết kế này đã có trong bộ sưu tập. Hãy mở mẫu đã lưu.", 409) : Response.json({ data: existing, reused: true });
    }
    if (!id) return Response.json({ data: await tx.savedDesign.create({ data: { userId, name: data.name, config: data.config! } }) }, { status: 201 });
    if (typeof updatedAt !== "string" || !Number.isFinite(Date.parse(updatedAt))) return fail("Vui lòng mở lại mẫu trước khi lưu thay đổi.", 409);
    const result = await tx.savedDesign.updateMany({ where: { id, userId, updatedAt: new Date(updatedAt) }, data });
    if (!result.count) return fail("Mẫu đã được sửa hoặc xóa ở nơi khác. Hãy mở lại mẫu để tránh ghi đè thay đổi mới.", 409);
    return Response.json({ data: await tx.savedDesign.findFirst({ where: { id, userId } }) });
  }, { maxWait: 10000, timeout: 10000 });
}

async function route(request: Request) {
  try { return await handle(request); }
  catch (error) { console.error("Saved design request failed", error); return fail("Không thể xử lý thiết kế lúc này. Vui lòng thử lại.", 500); }
}
export { route as GET, route as POST, route as PATCH, route as DELETE };
