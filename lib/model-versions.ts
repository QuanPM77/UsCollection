import { prisma } from "@/lib/prisma";
import { readBeadModel, validateModelVersions, type BeadModel } from "@/lib/bead-model";
export async function resolveModelVersions(products: Array<{ id: string; sku: string }>, input: unknown) {
  const versions = validateModelVersions(input);
  const result = new Map<string, BeadModel | null>();
  if (!versions) return result;
  const ids = Object.values(versions).filter((id): id is string => id !== null);
  const assets = ids.length ? await prisma.product_model_assets.findMany({ where: { id: { in: ids }, product_id: { in: products.map(p => p.id) }, status: "published" } }) : [];
  for (const product of products) {
    if (!(product.sku in versions)) continue;
    const id = versions[product.sku];
    if (id === null) { result.set(product.sku, null); continue; }
    const model = readBeadModel(assets.find(a => a.id === id && a.product_id === product.id)?.config);
    if (!model) throw new Error("Phiên bản hạt không còn khả dụng. Vui lòng chọn lại hạt.");
    result.set(product.sku, model);
  }
  return result;
}
