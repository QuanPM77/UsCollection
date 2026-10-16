"use client";

import Link from "next/link";
import { useFavorites } from "@/lib/favorites";
import FavoriteButton from "../buy/FavoriteButton";

type FavoriteProduct = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  image: string | null;
};

const currency = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

export default function FavoriteProducts({ products }: { products: FavoriteProduct[] }) {
  const favoriteIds = useFavorites();
  const favorites = products.filter((product) => favoriteIds.includes(product.id));

  if (favorites.length === 0) return <div className="mt-8 rounded-3xl border border-pink-mid/25 bg-white/85 px-6 py-14 text-center shadow-sm">
    <div className="text-5xl text-pink-deep">♡</div>
    <h2 className="mt-4 text-xl font-bold">Chưa có sản phẩm yêu thích</h2>
    <p className="mt-2 text-sm text-pink-text/60">Nhấn vào trái tim trên sản phẩm để lưu mẫu bạn thích.</p>
    <Link href="/buy" className="mt-6 inline-flex rounded-xl bg-pink-deep px-5 py-3 text-sm font-semibold text-white transition hover:bg-pink-text">Khám phá sản phẩm</Link>
  </div>;

  return <>
    <p className="mt-6 text-sm text-pink-text/65">Đang lưu <strong className="text-pink-text">{favorites.length}</strong> sản phẩm</p>
    <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {favorites.map((product) => <article key={product.id} className="overflow-hidden rounded-3xl border border-pink-mid/25 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
        <div className="relative aspect-square overflow-hidden bg-white">
          <Link href={`/buy/${product.id}`} aria-label={`Xem ${product.name}`} className="block h-full w-full">
            {product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-6xl">💎</div>}
          </Link>
          <FavoriteButton productId={product.id} />
        </div>
        <Link href={`/buy/${product.id}`} className="block p-5">
          <h2 className="font-semibold text-pink-text">{product.name}</h2>
          <p className="mt-1 text-xs text-pink-text/50">Mã: {product.sku}</p>
          <p className="mt-2 text-lg font-bold text-pink-deep">{currency.format(product.price)}</p>
          <p className="mt-1 text-xs text-pink-text/55">{product.stock > 0 ? `Còn ${product.stock} sản phẩm` : "Tạm hết hàng"}</p>
        </Link>
      </article>)}
    </div>
  </>;
}
