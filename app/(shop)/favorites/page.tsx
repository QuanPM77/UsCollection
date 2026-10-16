import Link from "next/link";
import MainMenu from "@/components/MainMenu";
import { prisma } from "@/lib/prisma";
import { productImageDisplayUrl } from "@/lib/supabase-storage";
import FavoriteProducts from "./FavoriteProducts";

export default async function FavoritesPage() {
  const products = await prisma.products.findMany({
    where: { type: "bracelet", status: "active" },
    orderBy: { updated_at: "desc" },
    select: { id: true, name: true, sku: true, price: true, images: true, stock: true },
  });
  const images = await Promise.all(products.map((product) => product.images[0] ? productImageDisplayUrl(product.images[0]) : null));
  const catalog = products.map((product, index) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    price: product.price,
    stock: product.stock,
    image: images[index],
  }));

  return <main className="min-h-screen bg-gradient-to-br from-pink-light via-cream to-white text-pink-text">
    <header className="flex items-center gap-4 border-b border-pink-mid/25 bg-white/70 px-6 py-4">
      <MainMenu /><Link href="/" className="font-display text-xl font-bold">UsStory</Link>
    </header>
    <section className="w-full px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-pink-deep">Bộ sưu tập của bạn</p>
      <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Sản phẩm yêu thích</h1>
      <p className="mt-3 text-sm text-pink-text/65">Những mẫu vòng bạn đã lưu sẽ được tập hợp tại đây.</p>
      <FavoriteProducts products={catalog} />
    </section>
  </main>;
}
