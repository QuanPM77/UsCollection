import { randomUUID, createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { requireApiRole } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { readBeadModel, validateModelSettings } from "@/lib/bead-model";
import { validateGlb, MAX_ORIGINAL_BYTES, MAX_WEB_BYTES } from "@/lib/glb-validation";
import { ensureModelBuckets, signModelUpload, downloadModel, publishModel } from "@/lib/model-storage";

export const runtime = "nodejs";
export const maxDuration = 60;
const fail = (message: string, status = 400) => Response.json({ message }, { status });
async function handle(request: Request) {
  const access = await requireApiRole("admin");
  if (!access.ok) return access.response;
  const query = new URL(request.url).searchParams;
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return fail("Yêu cầu không hợp lệ.", 403);
  }
  const text = request.method === "GET" ? "{}" : await request.text();
  if (text.length > 12000) return fail("Yêu cầu quá lớn.", 413);
  let body: { sku: string; originalBytes: number; webBytes: number; expectedAssetId?: string | null; assetId?: string; action?: string; settings?: unknown };
  try { body = JSON.parse(text); } catch { return fail("Dữ liệu không hợp lệ."); }
  if (!body || typeof body !== "object") return fail("Dữ liệu không hợp lệ.");
  const sku = request.method === "GET" ? query.get("sku") : body.sku;
  if (typeof sku !== "string" || !/^[a-z0-9-]{1,64}$/.test(sku)) return fail("Mã hạt không hợp lệ.");
  const product = await prisma.products.findFirst({ where: { sku, type: "bead" }, include: { bead_product_details: true } });
  if (!product?.bead_product_details) return fail("Hãy lưu thông tin hạt trước khi tải mô hình.", 404);
  const currentModel = readBeadModel(product.bead_product_details.model_3d);
  if (request.method === "GET") {
    const assets = await prisma.product_model_assets.findMany({ where: { product_id: product.id, status: "published" }, orderBy: { created_at: "desc" }, take: 30 });
    return Response.json({ model: currentModel ?? null, versions: assets.map(a => ({ id: a.id, createdAt: a.created_at, model: readBeadModel(a.config) })) }, { headers: { "Cache-Control": "private, no-store" } });
  }
  if (request.method === "POST") {
    const { originalBytes, webBytes } = body;
    if (!Number.isSafeInteger(originalBytes) || originalBytes < 28 || originalBytes > MAX_ORIGINAL_BYTES || !Number.isSafeInteger(webBytes) || webBytes < 28 || webBytes > MAX_WEB_BYTES) return fail("Bản gốc tối đa 50 MB, bản web tối đa 8 MB.");
    const pending = await prisma.product_model_assets.count({ where: { created_by: access.session.user.id, status: "uploading", created_at: { gt: new Date(Date.now() - 3600000) } } });
    if (pending >= 20) return fail("Có nhiều lượt tải đang chờ. Vui lòng thử lại sau.", 429);
    await ensureModelBuckets();
    const id = randomUUID(); const folder = `${product.id}/${id}`;
    const asset = await prisma.product_model_assets.create({ data: { id, product_id: product.id, created_by: access.session.user.id, original_path: `${folder}/original.glb`, candidate_path: `${folder}/candidate.glb`, original_bytes: originalBytes, web_bytes: webBytes } });
    const [original, web] = await Promise.all([signModelUpload(asset.original_path), signModelUpload(asset.candidate_path)]);
    return Response.json({ assetId: id, original, web }, { status: 201 });
  }
  if (request.method !== "PATCH") return fail("Không hỗ trợ thao tác.", 405);
  // Optimistic compare-and-swap protects two administrators editing the same bead.
  if ((body.expectedAssetId ?? null) !== (currentModel?.assetId ?? null)) return fail("Mẫu đã được thay đổi ở nơi khác. Hãy tải lại danh sách.", 409);
  if (body.action === "reset") {
    await setActive(null);
    return Response.json({ model: null });
  }
  if (typeof body.assetId !== "string") return fail("Thiếu phiên bản mô hình.");
  const asset = await prisma.product_model_assets.findFirst({ where: { id: body.assetId, product_id: product.id } });
  if (!asset) return fail("Không tìm thấy phiên bản thuộc hạt này.", 404);
  if (body.action === "configure") {
    const previous = readBeadModel(asset.config);
    if (asset.status !== "published" || !previous) return fail("Phiên bản chưa phát hành.");
    const id = randomUUID();
    const model = { ...previous, ...validateModelSettings(body.settings), assetId: id };
    await prisma.$transaction(async tx => {
      await lockAndCheck(tx);
      await tx.product_model_assets.create({ data: {
        id, product_id: product.id, created_by: access.session.user.id,
        original_path: asset.original_path, candidate_path: asset.candidate_path, web_path: asset.web_path,
        original_bytes: asset.original_bytes, web_bytes: asset.web_bytes, status: "published", config: model,
      } });
      await tx.bead_product_details.update({ where: { product_id: product.id }, data: { model_3d: model } });
    });
    return Response.json({ model });
  }
  if (body.action === "restore") {
    const model = readBeadModel(asset.config);
    if (asset.status !== "published" || !model) return fail("Phiên bản chưa được phát hành.");
    await setActive(model);
    return Response.json({ model });
  }
  if (body.action !== "publish" || asset.status !== "uploading" || asset.created_by !== access.session.user.id) return fail("Phiên tải không hợp lệ.", 403);
  const settings = validateModelSettings(body.settings);
  // Check both objects independently on the server; client validation is only for UX.
  const original = await downloadModel(asset.original_path, asset.original_bytes);
  validateGlb(original, MAX_ORIGINAL_BYTES);
  const web = await downloadModel(asset.candidate_path, asset.web_bytes);
  const report = validateGlb(web);
  const hash = createHash("sha256").update(web).digest("hex");
  const path = `${product.id}/${asset.id}/${hash}.glb`;
  const url = await publishModel(path, web);
  const model = { ...settings, assetId: asset.id, url, bytes: report.bytes, triangles: report.triangles };
  await prisma.$transaction(async tx => {
    await lockAndCheck(tx);
    await tx.product_model_assets.update({ where: { id: asset.id }, data: { status: "published", web_path: path, config: model } });
    await tx.bead_product_details.update({ where: { product_id: product.id }, data: { model_3d: model } });
  });
  return Response.json({ model, warnings: report.warnings });

  async function lockAndCheck(tx: Prisma.TransactionClient) {
    await tx.$queryRaw`SELECT id FROM products WHERE id = ${product!.id}::uuid FOR UPDATE`;
    const fresh = await tx.bead_product_details.findUnique({ where: { product_id: product!.id } });
    if ((readBeadModel(fresh?.model_3d)?.assetId ?? null) !== (body.expectedAssetId ?? null)) throw new Error("Mẫu đã thay đổi ở nơi khác. Hãy tải lại trước khi áp dụng.");
  }
  async function setActive(model: ReturnType<typeof readBeadModel> | null) {
    await prisma.$transaction(async tx => {
      await lockAndCheck(tx);
      await tx.bead_product_details.update({ where: { product_id: product!.id }, data: { model_3d: model ?? Prisma.DbNull } });
    });
  }
}
async function route(request: Request) {
  try { return await handle(request); }
  catch (error) {
    console.error("Bead model request failed", error);
    const code = (error as { code?: string }).code;
    if (code === "P2021" || code === "P2022") return fail("Cần chạy cập nhật cơ sở dữ liệu mô hình 3D trước khi sử dụng.", 503);
    return fail(error instanceof Error ? error.message : "Không thể xử lý mô hình lúc này.", 400);
  }
}
export { route as GET, route as POST, route as PATCH };
