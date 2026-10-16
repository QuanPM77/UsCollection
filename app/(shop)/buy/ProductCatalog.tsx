"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PRODUCT_STYLES } from "@/lib/product-styles";
import FavoriteButton from "./FavoriteButton";

type CatalogProduct = {
  id: string;
  name: string;
  price: number;
  image: string | null;
  styles?: string[] | null;
  averageRating: number | null;
  reviewCount: number;
};

const currency = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const inputClass = "w-full rounded-xl border border-pink-mid/40 bg-white px-3 py-2.5 text-sm text-pink-text outline-none focus:border-pink-deep focus:ring-2 focus:ring-pink-mid/25";

export default function ProductCatalog({ products }: { products: CatalogProduct[] }) {
  const [query, setQuery] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi");
    const min = minPrice === "" ? null : Number(minPrice);
    const max = maxPrice === "" ? null : Number(maxPrice);
    return products.filter((product) => {
      if (normalizedQuery && !product.name.toLocaleLowerCase("vi").includes(normalizedQuery)) return false;
      if (min !== null && product.price < min) return false;
      if (max !== null && product.price > max) return false;
      const styles = Array.isArray(product.styles) ? product.styles : [];
      if (selectedStyles.length && !selectedStyles.some((style) => styles.includes(style))) return false;
      return true;
    });
  }, [products, query, minPrice, maxPrice, selectedStyles]);

  function toggleStyle(style: string) {
    setSelectedStyles((current) => current.includes(style) ? current.filter((item) => item !== style) : [...current, style]);
  }

  function clearFilters() {
    setQuery("");
    setMinPrice("");
    setMaxPrice("");
    setSelectedStyles([]);
  }

  return <div className="mt-8 grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
    <aside className="rounded-3xl border border-pink-mid/25 bg-white/90 p-5 shadow-sm">
      <fieldset>
        <legend className="text-sm font-bold text-pink-text">Lọc theo phong cách</legend>
        <p className="mt-1 text-xs text-pink-text/55">Có thể chọn nhiều phong cách</p>
        <div className="mt-4 space-y-3">
          {PRODUCT_STYLES.map((style) => <label key={style.key} title={style.description} className="flex cursor-pointer items-start gap-2.5 rounded-xl p-2 hover:bg-pink-light/70">
            <input type="checkbox" checked={selectedStyles.includes(style.key)} onChange={() => toggleStyle(style.key)} className="mt-0.5 h-4 w-4 shrink-0 accent-pink-700" />
            <span className="text-sm leading-5 text-pink-text">{style.label}</span>
          </label>)}
        </div>
      </fieldset>
    </aside>

    <section className="min-w-0">
      <div className="rounded-3xl border border-pink-mid/25 bg-white/90 p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(220px,0.9fr)]">
          <label className="text-xs font-semibold text-pink-text">Tìm theo tên
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nhập tên hoặc một phần tên sản phẩm..." className={`${inputClass} mt-1.5`} />
          </label>
          <fieldset>
            <legend className="text-xs font-semibold text-pink-text">Khoảng giá (VND)</legend>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <input type="number" min={0} value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="Từ giá" aria-label="Giá thấp nhất" className={inputClass} />
              <input type="number" min={0} value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="Đến giá" aria-label="Giá cao nhất" className={inputClass} />
            </div>
          </fieldset>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-pink-mid/20 pt-4">
          <p aria-live="polite" className="text-sm text-pink-text/65">Hiển thị <strong className="text-pink-text">{filteredProducts.length}</strong> / {products.length} sản phẩm</p>
          {(query || minPrice || maxPrice || selectedStyles.length > 0) && <button type="button" onClick={clearFilters} className="text-sm font-semibold text-pink-deep hover:underline">Xóa bộ lọc</button>}
        </div>
      </div>

    {filteredProducts.length ? <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {filteredProducts.map((product) => <article key={product.id} className="group overflow-hidden rounded-3xl border border-pink-mid/25 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
        <div className="relative aspect-square overflow-hidden bg-white">
          <Link href={`/buy/${product.id}`} aria-label={`Xem ${product.name}`} className="block h-full w-full">
            {product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-6xl">💎</div>}
          </Link>
          <FavoriteButton productId={product.id} />
        </div>
        <Link href={`/buy/${product.id}`} className="block p-5">
          <h2 className="font-semibold text-pink-text">{product.name}</h2>
          {Array.isArray(product.styles) && product.styles.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{PRODUCT_STYLES.filter((style) => product.styles?.includes(style.key)).map((style) => <span key={style.key} className="rounded-full bg-pink-light px-2 py-1 text-[10px] font-medium text-pink-deep">{style.label}</span>)}</div>}
          <p className="mt-2 text-lg font-bold text-pink-deep">{currency.format(product.price)}</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-pink-text/60">
            {product.averageRating !== null ? <><span className="text-amber-500">★</span><span>{product.averageRating.toFixed(1)} ({product.reviewCount} đánh giá)</span></> : <span>Chưa có đánh giá</span>}
          </div>
        </Link>
      </article>)}
    </div> : <div className="mt-6 rounded-3xl border border-pink-mid/25 bg-white p-10 text-center">
      {products.length ? <><h2 className="text-lg font-bold">Không tìm thấy vòng phù hợp</h2><p className="mt-2 text-sm text-pink-text/60">Thử đổi từ khóa hoặc khoảng giá.</p></> : <><div className="text-5xl">🛍️</div><h2 className="mt-4 text-xl font-bold">Sản phẩm sắp được cập nhật</h2><p className="mt-2 text-sm text-pink-text/60">Các mẫu vòng bán sẵn sẽ xuất hiện tại đây.</p><Link href="/customizer" className="mt-6 inline-flex rounded-xl bg-pink-deep px-5 py-3 text-sm font-semibold text-white hover:bg-pink-text">Tự thiết kế vòng tay</Link></>}
    </div>}
    </section>
  </div>;
}
