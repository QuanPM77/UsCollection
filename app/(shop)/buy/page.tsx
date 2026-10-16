import Link from "next/link";
import MainMenu from "@/components/MainMenu";
import { prisma } from "@/lib/prisma";
import { productImageDisplayUrl } from "@/lib/supabase-storage";
import ProductCatalog from "./ProductCatalog";

export default async function BuyPage() {
  const products = await prisma.products.findMany({
    where: { type: "bracelet", status: "active" },
    orderBy: { updated_at: "desc" },
  });
  const reviewStats = products.length ? await prisma.productReview.groupBy({
    by: ["productId"],
    where: { productId: { in: products.map((product) => product.id) } },
    _avg: { rating: true },
    _count: { _all: true },
  }) : [];
  const statsByProduct = new Map(reviewStats.map((stat) => [stat.productId, { average: stat._avg.rating, count: stat._count._all }]));
  const coverImages = await Promise.all(products.map((product) => product.images[0] ? productImageDisplayUrl(product.images[0]) : null));

  const catalog = products.map((product, index) => {
    const stats = statsByProduct.get(product.id);
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      image: coverImages[index],
      styles: product.styles,
      averageRating: stats?.average ?? null,
      reviewCount: stats?.count ?? 0,
    };
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-light via-cream to-white text-pink-text">
      <header className="flex items-center gap-4 border-b border-pink-mid/25 bg-white/70 px-6 py-4">
        <MainMenu /><Link href="/" className="font-display text-xl font-bold">UsStory</Link>
      </header>
      <section className="w-full px-5 py-10 sm:px-8">
        <p className="text-sm font-semibold text-pink-deep">Bộ sưu tập UsStory</p>
        <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Vòng tay bán sẵn</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-pink-text/65">Khám phá những mẫu vòng được chế tác thủ công. Chọn một sản phẩm để xem hình ảnh và thông tin chi tiết.</p>

        <ProductCatalog products={catalog} />
      </section>
    </main>
  );
}
