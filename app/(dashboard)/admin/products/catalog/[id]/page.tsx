import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { productImageDisplayUrl } from "@/lib/supabase-storage";
import BraceletFields from "../BraceletFields";
import { updateBracelet } from "../actions";

export default async function EditBraceletPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.products.findFirst({ where: { id, type: "bracelet" }, include: { bracelet_product_details: true } });
  if (!product) notFound();
  const images = await Promise.all(product.images.map(async (path) => ({ path, url: await productImageDisplayUrl(path) })));
  const productWithDisplayImages = { ...product, images };

  return <div className="mx-auto max-w-3xl space-y-5">
    <Link href="/admin/products/catalog" className="text-sm font-medium text-rose-600 hover:underline">← Danh sách vòng bán sẵn</Link>
    <h2 className="text-xl font-bold text-gray-900">Chỉnh sửa {product.name}</h2>
    <form action={updateBracelet.bind(null, product.id)} className="space-y-5"><BraceletFields product={productWithDisplayImages} /></form>
  </div>;
}
